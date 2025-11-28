import { pool } from "../../../config/db.js";

/* ===================== lecturas ===================== */
export async function listByOrden(restauranteId, ordenId) {
  const [r] = await pool.query(
    `SELECT * FROM ticket WHERE restaurante_id=? AND orden_id=? ORDER BY id`,
    [restauranteId, ordenId]
  );
  return r;
}

export async function getById(restauranteId, ticketId) {
  const [r] = await pool.query(
    `SELECT * FROM ticket WHERE restaurante_id=? AND id=?`,
    [restauranteId, ticketId]
  );
  return r[0] || null;
}

export async function getUltimoTicketPorTipo(restauranteId, ordenId, tipo) {
  const [r] = await pool.query(
    `SELECT * FROM ticket
      WHERE restaurante_id=? AND orden_id=? AND tipo=?
      ORDER BY id DESC LIMIT 1`,
    [restauranteId, ordenId, tipo]
  );
  return r[0] || null;
}

export async function getConfig(restauranteId) {
  const [r] = await pool.query(
    `SELECT impresora_terminal, impresora_cocina, impresora_endpoint
       FROM restaurante_config WHERE restaurante_id=?`,
    [restauranteId]
  );
  return r[0] || {};
}

/* ===========================================================
   Datos de impresión (orden + detalle + config + restaurante + usuario)
   =========================================================== */
export async function getOrderPrintableData(ordenId) {
  // Orden + mesa + nombre del restaurante
  const [[orden]] = await pool.query(
    `SELECT o.*, m.nombre AS mesa_nombre, r.nombre AS restaurante_nombre
       FROM orden o
       LEFT JOIN mesa m   ON m.id = o.mesa_id
       JOIN restaurante r ON r.id = o.restaurante_id
      WHERE o.id = ?`,
    [ordenId]
  );

  if (!orden) {
    console.warn("⚠️ No se encontró la orden para impresión:", ordenId);
    return { orden: {}, detalle: [], cfg: {}, restaurante: null, usuario: null };
  }

  // Detalle de productos (SIN 'nota', no existe en v0.4)
  const [detalle] = await pool.query(
    `SELECT producto_nombre, precio_unitario, cantidad, importe
       FROM orden_detalle
      WHERE orden_id = ?
      ORDER BY id`,
    [ordenId]
  );

  // Config fiscal/visual
  const [[cfg]] = await pool.query(
    `SELECT impuesto_modo     AS impuesto_modo,
            impuesto_tasa     AS impuesto_tasa,
            mostrar_desglose_iva_en_ticket,
            serie_folio
       FROM restaurante_config
      WHERE restaurante_id = ?`,
    [orden.restaurante_id]
  );

  // Datos del restaurante (RFC/teléfono/dirección)
const [[restaurante]] = await pool.query(
  `SELECT
      nombre,
      IFNULL(calle,'')         AS calle,
      IFNULL(numero_ext,'')    AS numero_ext,
      IFNULL(numero_int,'')    AS numero_int,
      IFNULL(colonia,'')       AS colonia,
      IFNULL(municipio,'')     AS municipio,
      IFNULL(estado,'')        AS estado,
      IFNULL(pais,'')          AS pais,
      IFNULL(codigo_postal,'') AS codigo_postal
   FROM restaurante
   WHERE id = ?
   LIMIT 1`,
  [orden.restaurante_id]
).catch(() => [[null]]);

  // Usuario que creó la orden + su rol_local en este restaurante
  const [[usuario]] = await pool.query(
    `SELECT
        u.id,
        u.nombre,
        IFNULL(ur.rol_local,'') AS rol_local,
        u.email
     FROM usuario u
     LEFT JOIN usuario_restaurante ur
       ON ur.usuario_id = u.id AND ur.restaurante_id = ?
     WHERE u.id = ?
     LIMIT 1`,
    [orden.restaurante_id, orden.usuario_id]
  ).catch(() => [[null]]);

  return { orden, detalle, cfg: cfg || {}, restaurante, usuario };
}

/* ===================== escritura / auditoría ===================== */
export async function insertReimpresion({
  ordenId,
  restauranteId,
  usuarioId,
  impresoraNombre,
  impresoraEndpoint
}) {
  await pool.query(
    `INSERT INTO ticket (orden_id, restaurante_id, tipo, contenido_qr, impresora_nombre, impresora_endpoint, generado_por)
     VALUES (?, ?, 'REIMPRESION', NULL, ?, ?, ?)`,
    [ordenId, restauranteId, impresoraNombre || null, impresoraEndpoint || null, usuarioId || null]
  );
}
