import { pool } from "../../../../config/db.js";
import bcrypt from "bcryptjs";

// ============================================================
// LISTAR EMPLEADOS POR PROPIETARIO Y RESTAURANTE ESPECÍFICO
// ============================================================
export async function listarPorPropietario(propietarioId, restauranteId) {
  const sql = `
    SELECT 
      u.id,
      u.nombre,
      u.email,
      ur.rol_local AS rol_local,
      ur.restaurante_id,
      r.nombre AS restaurante_nombre,
      r.propietario_id,
      u.activo,
      u.last_login
    FROM usuario_restaurante ur
    INNER JOIN usuario u ON u.id = ur.usuario_id
    INNER JOIN restaurante r ON r.id = ur.restaurante_id
    WHERE r.propietario_id = ?
      AND r.id = ?
    ORDER BY ur.rol_local, u.nombre ASC
  `;

  const [rows] = await pool.query(sql, [propietarioId, restauranteId]);
  return rows;
}

// ============================================================
// LISTAR EMPLEADOS DE UN RESTAURANTE (ACCESO DIRECTO)
// ============================================================
export async function listarPorRestaurante(restauranteId) {
  const sql = `
    SELECT 
      u.id,
      u.nombre,
      u.email,
      ur.rol_local,
      ur.restaurante_id,
      u.activo,
      u.last_login
    FROM usuario_restaurante ur
    INNER JOIN usuario u ON u.id = ur.usuario_id
    WHERE ur.restaurante_id = ?
    ORDER BY ur.rol_local, u.nombre ASC
  `;
  const [rows] = await pool.query(sql, [restauranteId]);
  return rows;
}

// ============================================================
// CREAR NUEVO USUARIO LOCAL
// ============================================================
export async function crearUsuario(propietarioId, { nombre, email, password, rol_local, restaurante_id }) {
  const [existe] = await pool.query(`SELECT id FROM usuario WHERE email = ?`, [email]);
  if (existe.length > 0) throw new Error("El correo ya está registrado.");

  const hash = await bcrypt.hash(password, 10);

  // ✅ Incluimos propietario_id en el INSERT
  const [uRes] = await pool.query(
    `
    INSERT INTO usuario (propietario_id, nombre, email, password_hash, rol_global, activo)
    VALUES (?, ?, ?, ?, 'NINGUNO', 1)
    `,
    [propietarioId, nombre, email, hash]
  );

  const usuarioId = uRes.insertId;

  await pool.query(
    `
    INSERT INTO usuario_restaurante (usuario_id, restaurante_id, rol_local, activo)
    VALUES (?, ?, ?, 1)
    `,
    [usuarioId, restaurante_id, rol_local]
  );

  return {
    id: usuarioId,
    nombre,
    email,
    restaurante_id,
    rol_local,
    activo: 1
  };
}

// ============================================================
// ACTUALIZAR EMPLEADO (nombre, email, rol_local, restaurante_id)
// ============================================================
export async function actualizarEmpleado(id, data) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return null;

  const sql = `UPDATE usuario u
    JOIN usuario_restaurante ur ON ur.usuario_id = u.id
    SET ${fields.join(", ")}
    WHERE u.id = ?`;
  
  values.push(id);

  await pool.query(sql, values);

  const [rows] = await pool.query(`
    SELECT u.id, u.nombre, u.email, ur.rol_local, ur.restaurante_id, u.activo, u.last_login
    FROM usuario u
    JOIN usuario_restaurante ur ON ur.usuario_id = u.id
    WHERE u.id = ?
  `, [id]);

  return rows[0] || null;
}

// ============================================================
// CAMBIAR ESTATUS ACTIVO/INACTIVO
// ============================================================
export async function cambiarEstatus(id, activo) {
  const sql = `UPDATE usuario SET activo = ? WHERE id = ?`;
  await pool.query(sql, [activo, id]);

  const [rows] = await pool.query(`
    SELECT id, nombre, email, activo
    FROM usuario
    WHERE id = ?
  `, [id]);

  return rows[0] || null;
}