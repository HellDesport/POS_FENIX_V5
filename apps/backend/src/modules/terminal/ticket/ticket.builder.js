// apps/backend/src/modules/terminal/ticket/ticket.builder.js

import { pool } from "../../../config/db.js";

/* =========================================================
   Helpers básicos
   ========================================================= */
const num = (v, d = 0) => (v === null || v === undefined ? d : Number(v) || 0);

const toIso = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString();
};

/**
 * Lanza error HTTP-friendly (opcionalmente con status custom).
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* =========================================================
   Carga de datos
   ========================================================= */

/**
 * Carga el ticket base por ID.
 */
async function loadTicket(ticketId) {
  const [rows] = await pool.query(
    `SELECT 
        id,
        orden_id,
        restaurante_id,
        tipo,
        contenido_qr,
        contenido_json,
        copias_generadas,
        impresora_nombre,
        impresora_endpoint,
        generado_por,
        generado_en
     FROM ticket
     WHERE id = ?
     LIMIT 1`,
    [ticketId]
  );
  return rows[0] || null;
}

/**
 * Carga orden + restaurante + config + mesa + usuario (cajero).
 */
async function loadOrdenBundle(ordenId) {
  const [rows] = await pool.query(
    `
    SELECT 
      o.*,

      -- Mesa
      m.nombre AS mesa_nombre,

      -- Restaurante
      r.id          AS rest_id,
      r.nombre      AS rest_nombre,
      r.calle       AS rest_calle,
      r.numero_ext  AS rest_numero_ext,
      r.numero_int  AS rest_numero_int,
      r.colonia     AS rest_colonia,
      r.municipio   AS rest_municipio,
      r.estado      AS rest_estado,
      r.pais        AS rest_pais,
      r.codigo_postal AS rest_cp,
      r.referencia  AS rest_referencia,

      -- Config
      rc.impuesto_tasa,
      rc.impuesto_modo,
      rc.moneda,
      rc.serie_folio AS cfg_serie_folio,

      -- Usuario (cajero)
      u.nombre AS usuario_nombre
    FROM orden o
    LEFT JOIN mesa m
      ON m.id = o.mesa_id
    JOIN restaurante r
      ON r.id = o.restaurante_id
    LEFT JOIN restaurante_config rc
      ON rc.restaurante_id = r.id
    LEFT JOIN usuario u
      ON u.id = o.usuario_id
    WHERE o.id = ?
    LIMIT 1
    `,
    [ordenId]
  );

  return rows[0] || null;
}

/**
 * Detalle de la orden (líneas de productos).
 */
async function loadDetalle(ordenId) {
  const [rows] = await pool.query(
    `
    SELECT 
      id,
      producto_id,
      producto_nombre,
      producto_sku,
      precio_unitario,
      cantidad,
      importe,
      orden,
      created_at
    FROM orden_detalle
    WHERE orden_id = ?
    ORDER BY orden ASC, id ASC
    `,
    [ordenId]
  );
  return rows;
}

/**
 * Pagos asociados a la orden.
 */
async function loadPagos(ordenId) {
  const [rows] = await pool.query(
    `
    SELECT 
      id,
      medio,
      monto,
      nota_medio,
      creado_en
    FROM orden_pago
    WHERE orden_id = ?
    ORDER BY id ASC
    `,
    [ordenId]
  );
  return rows;
}

/* =========================================================
   Builders por tipo de ticket
   ========================================================= */

/**
 * Builder para tickets de VENTA.
 */
function buildVenta({ ticket, orden, detalle, pagos }) {
  const impuestoModo =
    orden.iva_modo_en_venta ||
    orden.impuesto_modo ||
    "INCLUIDO"; // fallback raro, pero por si acaso

  const impuestoTasa = num(
    orden.iva_tasa_en_venta != null
      ? orden.iva_tasa_en_venta
      : orden.impuesto_tasa,
    16
  );

  // Totales: si vienen en la orden, se respetan;
  // si no, se calculan a partir del detalle.
  let subtotal = num(orden.subtotal, 0);
  let iva = num(orden.iva, 0);
  let total = num(orden.total, 0);
  let ajuste = num(orden.ajuste_redondeo, 0);

  const needCalc = total === 0 && subtotal === 0 && detalle.length > 0;

  if (needCalc) {
    subtotal = detalle.reduce(
      (acc, d) => acc + num(d.precio_unitario) * num(d.cantidad, 1),
      0
    );

    if (impuestoModo === "DESGLOSADO") {
      iva = +(subtotal * (impuestoTasa / 100)).toFixed(2);
      total = subtotal + iva;
    } else if (impuestoModo === "INCLUIDO") {
      iva = +((subtotal * impuestoTasa) / (100 + impuestoTasa)).toFixed(2);
      total = subtotal; // subtotal ya incluye IVA
      subtotal = +(total - iva).toFixed(2);
    } else {
      // EXENTO
      iva = 0;
      total = subtotal;
    }
  }

  const restaurante = {
    id: orden.rest_id,
    nombre: orden.rest_nombre,
    direccion: {
      calle: orden.rest_calle,
      numero_ext: orden.rest_numero_ext,
      numero_int: orden.rest_numero_int,
      colonia: orden.rest_colonia,
      municipio: orden.rest_municipio,
      estado: orden.rest_estado,
      pais: orden.rest_pais,
      cp: orden.rest_cp,
      referencia: orden.rest_referencia,
    },
  };

  const folio = {
    serie: orden.serie_folio || orden.cfg_serie_folio || null,
    numero: orden.folio || null,
  };

  const encabezado = {
    restaurante,
    fecha:
      toIso(orden.pagada_en) ||
      toIso(orden.abierta_en) ||
      toIso(ticket.generado_en),
    folio,
    mesa: orden.mesa_nombre || null,
    tipo_orden: orden.orden_tipo || null,
    cajero: orden.usuario_nombre || null,
    moneda: orden.moneda || "MXN",
    impuestos: {
      modo: impuestoModo,
      tasa: impuestoTasa,
    },
  };

  const items = detalle.map((d) => ({
    id: d.id,
    producto_id: d.producto_id,
    name: d.producto_nombre,
    sku: d.producto_sku || null,
    qty: num(d.cantidad, 1),
    price: num(d.precio_unitario, 0),
    amount: num(d.importe, 0),
    created_at: toIso(d.created_at),
  }));

  const totales = {
    subtotal,
    iva,
    total,
    ajuste_redondeo: ajuste,
  };

  const pagosJson = pagos.map((p) => ({
    id: p.id,
    medio: p.medio,
    monto: num(p.monto, 0),
    nota: p.nota_medio || null,
    creado_en: toIso(p.creado_en),
  }));

  return {
    type: "VENTA",
    impresora: {
      nombre: ticket.impresora_nombre || null,
      endpoint: ticket.impresora_endpoint || null,
    },
    encabezado,
    items,
    totales,
    pagos: pagosJson,
    qr: ticket.contenido_qr || null,
    meta: {
      ticket_id: ticket.id,
      orden_id: ticket.orden_id,
      restaurante_id: ticket.restaurante_id,
      generado_por: ticket.generado_por,
      generado_en: toIso(ticket.generado_en),
    },
  };
}

/**
 * Builder para tickets de COCINA.
 * Mucho más simple: solo lo que la cocina necesita.
 */
function buildCocina({ ticket, orden, detalle }) {
  const encabezado = {
    restaurante: orden.rest_nombre,
    mesa: orden.mesa_nombre || null,
    tipo_orden: orden.orden_tipo || null,
    fecha: toIso(orden.abierta_en) || toIso(ticket.generado_en),
  };

  const items = detalle.map((d) => ({
    id: d.id,
    producto_id: d.producto_id,
    name: d.producto_nombre,
    qty: num(d.cantidad, 1),
    // Dejamos lugar para notas si más adelante se agregan al schema
    notes: null,
  }));

  return {
    type: "COCINA",
    impresora: {
      nombre: ticket.impresora_nombre || null,
      endpoint: ticket.impresora_endpoint || null,
    },
    encabezado,
    items,
    qr: ticket.contenido_qr || null,
    meta: {
      ticket_id: ticket.id,
      orden_id: ticket.orden_id,
      restaurante_id: ticket.restaurante_id,
      generado_por: ticket.generado_por,
      generado_en: toIso(ticket.generado_en),
    },
  };
}

/**
 * Builder para tickets de CANCELACION.
 * No tiene impresora obligatoria ni QR obligatorio.
 */
function buildCancelacion({ ticket, orden }) {
  const encabezado = {
    restaurante: orden.rest_nombre,
    fecha: toIso(ticket.generado_en) || toIso(orden.cancelada_en),
  };

  const datosOrden = {
    id: orden.id,
    estado: orden.estado,
    tipo_orden: orden.orden_tipo,
    mesa: orden.mesa_nombre || null,
    subtotal: num(orden.subtotal, 0),
    total: num(orden.total, 0),
  };

  return {
    type: "CANCELACION",
    encabezado,
    orden: datosOrden,
    meta: {
      ticket_id: ticket.id,
      orden_id: ticket.orden_id,
      restaurante_id: ticket.restaurante_id,
      generado_por: ticket.generado_por,
      generado_en: toIso(ticket.generado_en),
    },
  };
}

/* =========================================================
   API pública del builder
   ========================================================= */

/**
 * build(ticketId)
 *  - Carga ticket + orden + detalle + pagos según corresponda
 *  - Regresa JSON semántico para el microservicio de impresión.
 */
export async function build(ticketId) {
  const idNum = num(ticketId, 0);
  if (!idNum) throw new HttpError(400, "ticketId inválido");

  const ticket = await loadTicket(idNum);
  if (!ticket) throw new HttpError(404, "Ticket no encontrado");

  const orden = await loadOrdenBundle(ticket.orden_id);
  if (!orden) throw new HttpError(404, "Orden asociada no encontrada");

  const detalle = await loadDetalle(ticket.orden_id);
  const pagos = ticket.tipo === "VENTA" ? await loadPagos(ticket.orden_id) : [];

  const ctx = { ticket, orden, detalle, pagos };

  switch (ticket.tipo) {
    case "VENTA":
      return buildVenta(ctx);
    case "COCINA":
      return buildCocina(ctx);
    case "CANCELACION":
      return buildCancelacion(ctx);
    default:
      throw new HttpError(422, `Tipo de ticket no soportado: ${ticket.tipo}`);
  }
}
