import { pool } from "../../../../config/db.js";

export async function listTickets({ restauranteId, tipo, desde, hasta, q, limit = 50, offset = 0 }) {
  const params = [restauranteId];
  const where = [];

  where.push("t.restaurante_id = ?");
  if (tipo) { where.push("t.tipo = ?"); params.push(tipo); }
  if (desde) { where.push("t.generado_en >= ?"); params.push(desde); }
  if (hasta) { where.push("t.generado_en <= ?"); params.push(hasta); }
  if (q) {
    // Búsqueda por id de orden o por nombre/email del usuario generador
    where.push("(o.id = ? OR u.nombre LIKE ? OR u.email LIKE ?)");
    params.push(Number(q) || 0, `%${q}%`, `%${q}%`);
  }

  const sql = `
    SELECT
      t.id, t.orden_id, t.restaurante_id, t.tipo, t.contenido_qr,
      t.copias_generadas, t.impresora_nombre, t.impresora_endpoint,
      t.generado_por, t.generado_en,
      o.total, o.estado AS orden_estado, o.orden_tipo,
      r.nombre AS restaurante_nombre,
      u.nombre AS generado_por_nombre
    FROM ticket t
      LEFT JOIN orden o ON o.id = t.orden_id
      LEFT JOIN usuario u ON u.id = t.generado_por
      LEFT JOIN restaurante r ON r.id = t.restaurante_id
    WHERE ${where.join(" AND ")}
    ORDER BY t.generado_en DESC
    LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getTicketCompleto(restauranteId, ticketId) {
  const [rows] = await pool.query(
    `
    SELECT
      t.*, r.nombre AS restaurante_nombre, u.nombre AS generado_por_nombre,
      o.id AS orden_id, o.estado AS orden_estado, o.orden_tipo,
      o.subtotal, o.iva, o.total, o.iva_modo_en_venta, o.iva_tasa_en_venta,
      o.serie_folio, o.folio, o.abierta_en, o.pagada_en
    FROM ticket t
      INNER JOIN orden o ON o.id = t.orden_id
      INNER JOIN restaurante r ON r.id = t.restaurante_id
      LEFT JOIN usuario u ON u.id = t.generado_por
    WHERE t.id = ? AND t.restaurante_id = ?
    LIMIT 1
    `,
    [ticketId, restauranteId]
  );
  const header = rows[0];
  if (!header) return null;

  const [detalles] = await pool.query(
    `SELECT producto_nombre, producto_sku, precio_unitario, cantidad, importe
     FROM orden_detalle
     WHERE orden_id = ?
     ORDER BY orden ASC, id ASC`,
    [header.orden_id]
  );

  const [pagos] = await pool.query(
    `SELECT medio, monto, nota_medio, creado_en
     FROM orden_pago
     WHERE orden_id = ?
     ORDER BY id ASC`,
    [header.orden_id]
  );

  return { header, detalles, pagos };
}
