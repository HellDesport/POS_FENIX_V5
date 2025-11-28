// apps/backend/src/modules/auth/auth.service.js
import * as authRepo from "./auth.repo.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { pool } from "../../config/db.js";

class HttpError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

/* ============================
 * LOGIN (usuario ó propietario)
 * ============================ */
export async function login(email, password) {
  email = String(email || "").trim().toLowerCase();
  password = String(password || "").trim();
  if (!email || !password) throw new HttpError(400, "Email y contraseña son obligatorios");

  // Primero usuario, luego propietario (lo resuelve el repo)
  const acc = await authRepo.getByEmail(email);
  if (!acc) throw new HttpError(401, "Credenciales inválidas");
  if (Number(acc.activo) !== 1) throw new HttpError(403, "Propietario inactivo");

  if (!acc.password_hash || !acc.password_hash.startsWith("$2")) {
    throw new HttpError(500, "El propietario no tiene una contraseña válida almacenada.");
  }

  const ok = await bcrypt.compare(password, acc.password_hash);
  if (!ok) throw new HttpError(401, "Credenciales inválidas");

  // Actualiza last_login en la tabla correcta (no bloquea si falla)
  try {
    if (String(acc.rol).toUpperCase() === "PROPIETARIO") {
      await authRepo.touchPropietarioLastLogin(acc.id);
    } else {
      await authRepo.touchLastLogin(acc.id);
    }
  } catch (err) {
    console.warn("⚠ No se pudo actualizar last_login:", err.message);
  }

  const payload = {
    sub: acc.id,
    email: acc.email,
    propietario_id: acc.id,
    rol_global: "PROPIETARIO",
  };

  const token = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn || "8h",
    algorithm: "HS256",
  });

  const user = {
    id: acc.id,
    nombre: acc.nombre,
    email: acc.email,
    razon_social: acc.razon_social ?? null,
    telefono: acc.telefono ?? null,
    rol: "PROPIETARIO",
    last_login: acc.last_login ?? null,
  };

  return { ok: true, token, user };
}

/* =========================================
 * ME (datos del propietario autenticado)
 * ========================================= */
export async function me(propietarioId) {
  if (!propietarioId) throw new HttpError(400, "Falta propietarioId");

  const p = await authRepo.getPropietarioById(propietarioId);
  if (!p) throw new HttpError(404, "Propietario no encontrado");

  const user = {
    id: p.id,
    nombre: p.nombre,
    email: p.email,
    razon_social: p.razon_social ?? null,
    telefono: p.telefono ?? null,
    rol: "PROPIETARIO",
    last_login: p.last_login ?? null,
  };

  return { ok: true, user };
}

/* ==========================================================
 * Registro de propietario (permitidos múltiples por email único)
 * ========================================================== */
export async function registerPropietario(propietario, usuarioLike) {
  const nombreProp   = String(propietario?.nombre || "").trim();
  const razonSocial  = propietario?.razon_social || nombreProp;
  const telefono     = propietario?.telefono || null;
  const emailLogin   = String((usuarioLike?.email || propietario?.email || "")).trim().toLowerCase();
  const password     = String(usuarioLike?.password || "").trim();

  if (!nombreProp) throw new HttpError(400, "Falta nombre del propietario");
  if (!emailLogin || !password) throw new HttpError(400, "Faltan email/password");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Hash de contraseña
    const password_hash = await bcrypt.hash(password, 10);
    if (!password_hash || !password_hash.startsWith("$2")) {
      throw new HttpError(500, "Error al generar hash de contraseña.");
    }

    // Inserta propietario (UNIQUE por email protege duplicados)
    const [pr] = await conn.query(
      `INSERT INTO propietario
         (razon_social, nombre, email, telefono, password_hash, email_verificado, activo)
       VALUES (?, ?, ?, ?, ?, 0, 1)`,
      [razonSocial, nombreProp, emailLogin, telefono, password_hash]
    );

    await conn.commit();

    // Token inmediato
    const payload = {
      sub: pr.insertId,
      email: emailLogin,
      propietario_id: pr.insertId,
      rol_global: "PROPIETARIO",
    };

    const token = jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn || "8h",
      algorithm: "HS256",
    });

    return {
      ok: true,
      message: "Propietario creado correctamente",
      token,
      user: { id: pr.insertId, nombre: nombreProp, email: emailLogin, rol: "PROPIETARIO" },
    };
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      throw new HttpError(409, "El email ya está registrado");
    }
    console.error("[registerPropietario] ERROR:", err);
    throw err;
  } finally {
    conn.release();
  }
}
