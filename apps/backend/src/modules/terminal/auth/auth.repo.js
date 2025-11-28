import { pool } from "../../../config/db.js";

// ---------------------------------------------------------
// Buscar usuario por email (y traer sus roles locales)
// ---------------------------------------------------------
export async function findByEmail(email) {
  const [rows] = await pool.query(
    `
    SELECT 
      u.id AS usuario_id,
      u.nombre AS usuario_nombre,
      u.email,
      u.password_hash,
      u.activo AS usuario_activo,
      ur.restaurante_id,
      ur.rol_local,
      ur.activo AS rol_activo,
      r.nombre AS restaurante_nombre,
      r.estatus AS restaurante_estatus
    FROM usuario u
    LEFT JOIN usuario_restaurante ur ON ur.usuario_id = u.id
    LEFT JOIN restaurante r ON r.id = ur.restaurante_id
    WHERE u.email = ?
    `,
    [email]
  );
  return rows;
}
