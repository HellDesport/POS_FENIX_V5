import { pool } from "../../config/db.js";

/** Obtener por email (para login) */
export async function getByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, razon_social, nombre, email, telefono,
            password_hash, email_verificado, activo, last_login, created_at, updated_at
       FROM propietario
      WHERE email = ?
      LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

/** Obtener por id (para /me) */
export async function getById(id) {
  const [rows] = await pool.query(
    `SELECT id, razon_social, nombre, email, telefono,
            email_verificado, activo, last_login, created_at, updated_at
       FROM propietario
      WHERE id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/** Tocar last_login */
export async function touchLastLogin(id) {
  await pool.query(`UPDATE propietario SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
}

/** Obtener todos los propietarios */
export async function obtenerTodos() {
  const [rows] = await pool.query(`
    SELECT 
      id,
      razon_social,
      nombre,
      email,
      telefono,
      email_verificado,
      activo,
      last_login,
      created_at,
      updated_at
    FROM propietario
    ORDER BY id DESC
  `);
  return rows;
}