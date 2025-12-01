import { pool } from "../../../config/db.js";

/* ============================================================
   REPO – ÓRDENES (ROL TERMINAL)  v0.4 (con soporte Tickets)
   ============================================================ */

// Crear una nueva orden (estado inicial = pendiente)
export async function crearOrden({
  restauranteId,
  mesaId = null,
  usuarioId = null,
  ordenTipo = "AQUI",
}) {
  const [result] = await pool.query(
    `INSERT INTO orden (
        restaurante_id, mesa_id, usuario_id, orden_tipo, estado
     ) VALUES (?, ?, ?, ?, 'pendiente')`,
    [restauranteId, mesaId, usuarioId, ordenTipo]
  );
  const [rows] = await pool.query(`SELECT * FROM orden WHERE id=?`, [result.insertId]);
  return rows[0];
}

// Obtener orden por ID
export async function obtenerOrden(restauranteId, ordenId) {
  const [rows] = await pool.query(
    `SELECT o.*, m.nombre AS mesa_nombre
       FROM orden o
       LEFT JOIN mesa m ON m.id = o.mesa_id
      WHERE o.restaurante_id=? AND o.id=?`,
    [restauranteId, ordenId]
  );
  return rows[0] || null;
}

// Alias usado por el service para validaciones
export async function getById(restauranteId, ordenId) {
  return await obtenerOrden(restauranteId, ordenId);
}

// Listar órdenes abiertas (pendiente | en_proceso | listo)
export async function listarAbiertas(restauranteId) {
  const [rows] = await pool.query(
    `SELECT 
        o.id, o.orden_tipo, o.estado, o.subtotal, o.total, o.abierta_en,
        m.nombre AS mesa_nombre
     FROM orden o
     LEFT JOIN mesa m ON m.id = o.mesa_id
     WHERE o.restaurante_id=? AND o.estado IN ('pendiente','en_proceso','listo')
     ORDER BY o.abierta_en DESC`,
    [restauranteId]
  );
  return rows;
}

// Cambiar estado (marca timestamps cuando aplica) y opcionalmente usuario_id
export async function cambiarEstado(restauranteId, ordenId, nuevoEstado, { usuarioId } = {}) {
  const [result] = await pool.query(
    `UPDATE orden
        SET estado = ?,
            usuario_id = COALESCE(?, usuario_id),
            updated_at = NOW(),
            pagada_en = IF(?='pagada', NOW(), pagada_en),
            cancelada_en = IF(?='cancelada', NOW(), cancelada_en)
      WHERE restaurante_id=? AND id=?`,
    [nuevoEstado, usuarioId || null, nuevoEstado, nuevoEstado, restauranteId, ordenId]
  );
  return result.affectedRows > 0;
}

/* -------------------- Soporte totales/pagos -------------------- */
export async function listDetalle(ordenId) {
  const [r] = await pool.query(
    `SELECT precio_unitario, cantidad
       FROM orden_detalle
      WHERE orden_id=?
      ORDER BY orden`, [ordenId]
  );
  return r;
}

/**
 * Config del restaurante (fiscal + impresoras)
 * - impresora_terminal / impresora_cocina / impresora_endpoint se usan para imprimir
 */
export async function getCfg(restauranteId) {
  const [r] = await pool.query(
    `SELECT 
        impuesto_modo,
        impuesto_tasa,
        mostrar_desglose_iva_en_ticket,
        serie_folio,
        impresora_terminal,
        impresora_cocina,
        impresora_endpoint
     FROM restaurante_config
     WHERE restaurante_id=?`,
    [restauranteId]
  );
  // Valores seguros por defecto
  const row = r[0] || {};
  return {
    impuesto_modo: row.impuesto_modo ?? "INCLUIDO",
    impuesto_tasa: row.impuesto_tasa ?? 16.0,
    mostrar_desglose_iva_en_ticket: row.mostrar_desglose_iva_en_ticket ?? 0,
    serie_folio: row.serie_folio ?? null,
    impresora_terminal: row.impresora_terminal ?? null,
    impresora_cocina: row.impresora_cocina ?? null,
    impresora_endpoint: row.impresora_endpoint ?? null,
  };
}

export async function actualizarTotales(ordenId, { subtotal, iva, total, ajuste_redondeo }) {
  await pool.query(
    `UPDATE orden
        SET subtotal=?, iva=?, total=?, ajuste_redondeo=?, updated_at=NOW()
      WHERE id=?`,
    [subtotal, iva, total, ajuste_redondeo, ordenId]
  );
}

export async function insertPago(ordenId, medio, monto, nota) {
  await pool.query(
    `INSERT INTO orden_pago (orden_id, medio, monto, nota_medio)
     VALUES (?,?,?,?)`,
    [ordenId, medio, monto, nota]
  );
}

/* -------------------- Envío (DOMICILIO) -------------------- */
export async function updateEnvio(ordenId, envio) {
  await pool.query(
    `UPDATE orden SET envio_monto=?, updated_at=NOW() WHERE id=?`,
    [envio, ordenId]
  );
}

/* -------------------- Registro de tickets -------------------- */
export async function insertTicket({
  ordenId,
  restauranteId,
  tipo,
  impresoraNombre,
  impresoraEndpoint,
  generadoPor
}) {
  const [result] = await pool.query(
    `INSERT INTO ticket (
        orden_id,
        restaurante_id,
        tipo,
        impresora_nombre,
        impresora_endpoint,
        generado_por
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [ordenId, restauranteId, tipo, impresoraNombre, impresoraEndpoint, generadoPor]
  );

  return result.insertId;
}
/* -------------------- Datos para construir ticket -------------------- */
/**
 * Devuelve:
 * {
 *   orden: { ...campos de orden + mesa_nombre + restaurante_nombre },
 *   detalle: [ { producto_nombre, precio_unitario, cantidad, importe }, ... ],
 *   cfg: { impuesto_modo, impuesto_tasa, mostrar_desglose_iva_en_ticket, serie_folio }
 * }
 */
export async function getOrderPrintableData(ordenId) {
  const [[orden]] = await pool.query(
    `SELECT o.*,
            m.nombre AS mesa_nombre,
            r.nombre AS restaurante_nombre
       FROM orden o
       LEFT JOIN mesa        m ON m.id = o.mesa_id
       JOIN restaurante      r ON r.id = o.restaurante_id
      WHERE o.id=?`,
    [ordenId]
  );

  const [detalle] = await pool.query(
    `SELECT 
        producto_nombre,
        precio_unitario,
        cantidad,
        (precio_unitario * cantidad) AS importe
       FROM orden_detalle
      WHERE orden_id=?
      ORDER BY orden`,
    [ordenId]
  );

  const [[cfg]] = await pool.query(
    `SELECT 
        impuesto_modo,
        impuesto_tasa,
        mostrar_desglose_iva_en_ticket,
        serie_folio
       FROM restaurante_config
      WHERE restaurante_id=?`,
    [orden?.restaurante_id]
  );

  

  return {
    orden: orden || null,
    detalle,
    cfg: cfg || { impuesto_modo: "INCLUIDO", impuesto_tasa: 16.0, mostrar_desglose_iva_en_ticket: 0, serie_folio: null }
  };
}


/* -------------------- IVA / FACTURA -------------------- */
export async function updateIVAMode(ordenId, modo, tasa) {
  await pool.query(
    `UPDATE orden
        SET iva_modo_en_venta = ?, 
            iva_tasa_en_venta = ?, 
            updated_at = NOW()
      WHERE id = ?`,
    [modo, tasa, ordenId]
  );
}
