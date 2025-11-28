import { pool } from "../../config/db.js";

/* ============================================================
   TERMINAL REPO
   ============================================================ */

// Obtener datos generales del restaurante
export async function getRestauranteInfo(restauranteId) {
  const [rows] = await pool.query(
    `SELECT 
        r.id,
        r.nombre,
        r.slug,
        r.total_mesas,
        r.estatus,
        c.moneda,
        c.impuesto_tasa,
        c.impuesto_modo,
        c.mostrar_desglose_iva_en_ticket
     FROM restaurante r
     LEFT JOIN restaurante_config c ON c.restaurante_id = r.id
     WHERE r.id = ?
     LIMIT 1`,
    [restauranteId]
  );
  return rows[0] || null;
}
