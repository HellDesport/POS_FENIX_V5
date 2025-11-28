import * as repo from "./auth.repo.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../../../config/env.js";
import { pool } from "../../../config/db.js";

// ============================================================
// Clase de error HTTP personalizado
// ============================================================
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ============================================================
// LOGIN TERMINAL — Solo rol_local = 'TERMINAL'
// ============================================================
export async function login(email, password) {
  email = String(email || "").trim().toLowerCase();
  if (!email || !password)
    throw new HttpError(400, "Email y contraseña requeridos");

  // Buscar usuario por email
  const users = await repo.findByEmail(email);
  if (users.length === 0)
    throw new HttpError(401, "Credenciales inválidas");

  // Buscar vinculación TERMINAL
  const u = users.find(r => r.rol_local === "TERMINAL");
  if (!u)
    throw new HttpError(403, "Acceso denegado: Este usuario no es una Terminal autorizada.");

  // Validar estatus
  if (Number(u.usuario_activo) !== 1)
    throw new HttpError(403, "El usuario está inactivo.");
  if (Number(u.rol_activo) !== 1)
    throw new HttpError(403, "El rol local de esta Terminal está inactivo.");
  if (u.restaurante_estatus !== "activo")
    throw new HttpError(403, "El restaurante está inactivo o suspendido.");

  // Verificar contraseña
  const ok = await bcrypt.compare(password, u.password_hash || "");
  if (!ok)
    throw new HttpError(401, "Contraseña incorrecta");

  // Actualizar fecha de último inicio de sesión
  try {
    await pool.query(
      "UPDATE usuario SET last_login = NOW() WHERE id = ?",
      [u.usuario_id]
    );
  } catch (e) {
    console.warn(`[auth.service] No se pudo actualizar last_login (${u.usuario_id}):`, e.message);
  }

  // Generar token JWT
  const payload = {
    usuario_id: u.usuario_id,
    restaurante_id: u.restaurante_id,
    rol_local: u.rol_local,
  };

  const token = jwt.sign(
    payload,
    env.JWT_SECRET || "FENIX_DEFAULT_SECRET",
    { expiresIn: env.JWT_EXPIRES || "8h" }
  );

  // Respuesta final
  return {
    token,
    usuario: {
      id: u.usuario_id,
      nombre: u.usuario_nombre,
      email: u.email,
      rol_local: u.rol_local,
      restaurante_id: u.restaurante_id,
      restaurante_nombre: u.restaurante_nombre,
      last_login: new Date().toISOString(),
    },
  };
}
