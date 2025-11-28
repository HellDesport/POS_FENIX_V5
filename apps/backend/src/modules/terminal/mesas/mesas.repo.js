import { pool } from "../../../config/db.js";

/* ============================================================
   MESAS REPO (Rol Terminal)
   ============================================================ */

// Listar mesas por restaurante
export async function listarPorRestaurante(restauranteId) {
  const [rows] = await pool.query(
    `SELECT 
       id,
       nombre,
       slug,
       capacidad,
       estatus,
       visible,
       orden,
       updated_at
     FROM mesa
     WHERE restaurante_id = ?
     ORDER BY orden ASC`,
    [restauranteId]
  );
  return rows;
}

// Obtener mesa específica
export async function obtenerPorId(restauranteId, mesaId) {
  const [rows] = await pool.query(
    `SELECT 
       id,
       nombre,
       slug,
       capacidad,
       estatus,
       visible,
       orden,
       updated_at
     FROM mesa
     WHERE restaurante_id = ? AND id = ?
     LIMIT 1`,
    [restauranteId, mesaId]
  );
  return rows[0] || null;
}

// Cambiar estado de una mesa
export async function cambiarEstado(restauranteId, mesaId, nuevoEstado) {
  const [result] = await pool.query(
    `UPDATE mesa
       SET estatus = ?, updated_at = NOW()
     WHERE restaurante_id = ? AND id = ?`,
    [nuevoEstado, restauranteId, mesaId]
  );
  return result.affectedRows > 0;
}
