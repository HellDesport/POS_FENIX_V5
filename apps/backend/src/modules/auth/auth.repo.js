// apps/backend/src/modules/auth/auth.repo.js
import { pool } from "../../config/db.js";

/**
 * Busca por email primero en `usuario` y, si no existe,
 * intenta en `propietario` (para login directo del propietario).
 */
export async function getByEmail(email) {
  // 1) usuario
  let [rows] = await pool.query(
    `SELECT id, propietario_id, nombre, email, password_hash,
            rol_global AS rol, activo, last_login
       FROM usuario
      WHERE email = ?
      LIMIT 1`,
    [email]
  );
  if (rows.length > 0) return rows[0];

  // 2) propietario
  [rows] = await pool.query(
    `SELECT id,
            NULL AS propietario_id,
            nombre,
            email,
            password_hash,
            'PROPIETARIO' AS rol,
            activo,
            last_login
       FROM propietario
      WHERE email = ?
      LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

/**
 * Actualiza last_login en la tabla `usuario`.
 * (Se mantiene para flujos existentes.)
 */
export async function touchLastLogin(id) {
  await pool.query(
    `UPDATE usuario
        SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [id]
  );
}

/**
 * NUEVO: Actualiza last_login en la tabla `propietario`.
 */
export async function touchPropietarioLastLogin(id) {
  await pool.query(
    `UPDATE propietario
        SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [id]
  );
}

/**
 * Obtiene por ID desde `usuario`.
 * (Se mantiene para compatibilidad.)
 */
export async function getById(id) {
  const [rows] = await pool.query(
    `SELECT id, propietario_id, nombre, email,
            rol_global AS rol, last_login
       FROM usuario
      WHERE id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * NUEVO: Obtiene por ID desde `propietario`
 * (para /me cuando la sesión es de propietario).
 */
export async function getPropietarioById(id) {
  const [rows] = await pool.query(
    `SELECT id,
            nombre,
            email,
            razon_social,
            telefono,
            1 AS activo,
            last_login
       FROM propietario
      WHERE id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Crea un propietario nuevo.
 */
export async function createPropietario({ nombre, email, password_hash }) {
  const [res] = await pool.query(
    `INSERT INTO propietario (nombre, email, password_hash)
     VALUES (?, ?, ?)`,
    [nombre, email, password_hash]
  );
  return { id: res.insertId, nombre, email, rol: "PROPIETARIO" };
}
