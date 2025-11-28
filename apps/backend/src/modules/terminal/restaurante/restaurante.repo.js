import { pool } from "../../../config/db.js";

/* ============================================================
   REPO - RESTAURANTE (ROL TERMINAL)
   ============================================================ */

// Obtener configuración completa del restaurante
export async function obtenerConfiguracion(restauranteId) {
  const [rows] = await pool.query(
    `SELECT 
        r.id,
        r.nombre,
        r.slug,
        r.estatus,
        r.total_mesas,
        c.impuesto_tasa,
        c.impuesto_modo,
        c.mostrar_desglose_iva_en_ticket,
        c.moneda,
        c.serie_folio,
        c.folio_actual,
        c.folio_habilitado,
        c.impresora_nombre,
        c.impresora_endpoint
     FROM restaurante r
     LEFT JOIN restaurante_config c ON c.restaurante_id = r.id
     WHERE r.id = ?
     LIMIT 1`,
    [restauranteId]
  );
  return rows[0] || null;
}

// Actualizar configuración parcial (ej. impresora, folio)
export async function actualizarConfiguracion(restauranteId, data) {
  const campos = [];
  const valores = [];

  if (data.impresora_nombre !== undefined) {
    campos.push("impresora_nombre = ?");
    valores.push(data.impresora_nombre);
  }

  if (data.impresora_endpoint !== undefined) {
    campos.push("impresora_endpoint = ?");
    valores.push(data.impresora_endpoint);
  }

  if (data.folio_actual !== undefined) {
    campos.push("folio_actual = ?");
    valores.push(data.folio_actual);
  }

  if (data.impuesto_modo !== undefined) {
    campos.push("impuesto_modo = ?");
    valores.push(data.impuesto_modo);
  }

  if (data.impuesto_tasa !== undefined) {
    campos.push("impuesto_tasa = ?");
    valores.push(data.impuesto_tasa);
  }

  if (campos.length === 0) return false;

  const sql = `UPDATE restaurante_config SET ${campos.join(", ")} WHERE restaurante_id = ?`;
  valores.push(restauranteId);

  const [result] = await pool.query(sql, valores);
  return result.affectedRows > 0;
}
