// apps/backend/src/modules/terminal/ordenes/ordenes.service.js
import * as ordenRepo from "./ordenes.repo.js";

/* ============================================================
   SERVICE – ÓRDENES (ROL TERMINAL)  v0.4
   Nota: los TICKETS se generan sólo por TRIGGERS en MySQL.
   Este service SOLO cambia estados y totales.
   ============================================================ */

/* -------------------- helpers estados -------------------- */
const puede = (from, to) =>
  ({
    pendiente: ["en_proceso", "cancelada"],
    en_proceso: ["listo", "pagada", "cancelada"],
    listo: ["pagada", "cancelada"],
    pagada: [],
    cancelada: [],
  }[from]?.includes(to));

/* -------------------- helpers numéricos / IVA -------------------- */
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function calcIVA(base, modo, tasa) {
  const t = Number(tasa || 0) / 100;
  if (modo === "EXENTO") return 0;

  // DESGLOSADO: base es subtotal sin IVA
  if (modo === "DESGLOSADO") return round2(base * t);

  // INCLUIDO: base es total con IVA; se despeja
  const neto = base / (1 + t);
  return round2(base - neto);
}

/**
 * Calcula subtotal, IVA y total a partir del detalle,
 * modo de impuesto, tasa, envío y ajuste.
 */
function calcTotalesFromDetalle(detalle, { modo, tasa, envio = 0, ajuste = 0 }) {
  const subtotalBase = detalle.reduce(
    (s, d) => s + Number(d.precio_unitario) * Number(d.cantidad),
    0
  );

  let subtotal, iva, totalSinExtras;

  if (modo === "DESGLOSADO") {
    subtotal = round2(subtotalBase);
    iva = calcIVA(subtotal, "DESGLOSADO", tasa);
    totalSinExtras = round2(subtotal + iva);
  } else if (modo === "INCLUIDO") {
    totalSinExtras = round2(subtotalBase); // ya incluye IVA
    iva = calcIVA(totalSinExtras, "INCLUIDO", tasa);
    subtotal = round2(totalSinExtras - iva);
  } else {
    // EXENTO
    subtotal = round2(subtotalBase);
    iva = 0;
    totalSinExtras = subtotal;
  }

  const total = round2(
    totalSinExtras + Number(envio || 0) + Number(ajuste || 0)
  );

  return { subtotal, iva, total };
}

/* ============================================================
   LISTAR / CREAR / OBTENER
   ============================================================ */

export async function listarOrdenesAbiertas(restauranteId) {
  return await ordenRepo.listarAbiertas(restauranteId);
}

export async function crearOrden(restauranteId, mesaId, usuarioId, tipo) {
  const tiposValidos = ["AQUI", "LLEVAR", "DOMICILIO"];
  if (!tiposValidos.includes(tipo)) throw new Error("Tipo de orden inválido");

  return await ordenRepo.crearOrden({
    restauranteId,
    mesaId,
    usuarioId,
    ordenTipo: tipo,
  });
}

export async function obtenerOrden(restauranteId, ordenId) {
  const orden = await ordenRepo.obtenerOrden(restauranteId, ordenId);
  if (!orden) throw new Error("Orden no encontrada");
  return orden;
}

/* ============================================================
   ENVÍO A COCINA  (pendiente → en_proceso)
   Tickets COCINA generados por trigger.
   ============================================================ */
export async function enviarACocina(restauranteId, ordenId, usuarioId) {
  const ord = await ordenRepo.getById(restauranteId, ordenId);
  if (!ord) throw new Error("Orden no encontrada");

  if (!puede(ord.estado, "en_proceso")) {
    throw new Error("Transición inválida");
  }

  await ordenRepo.cambiarEstado(restauranteId, ordenId, "en_proceso", {
    usuarioId,
  });

  // El trigger trg_ticket_por_estado generará el ticket COCINA
  return { id: ordenId, estado: "en_proceso" };
}

/* ============================================================
   MARCAR LISTO  (en_proceso → listo)
   ============================================================ */
export async function marcarListo(restauranteId, ordenId) {
  const ord = await ordenRepo.getById(restauranteId, ordenId);
  if (!ord) throw new Error("Orden no encontrada");

  if (!puede(ord.estado, "listo")) {
    throw new Error("Transición inválida");
  }

  await ordenRepo.cambiarEstado(restauranteId, ordenId, "listo");

  // No hay ticket asociado a este estado
  return { id: ordenId, estado: "listo" };
}

/* ============================================================
   PAGAR — genera ticket VENTA vía trigger
   ============================================================ */
export async function pagar(
  restauranteId,
  ordenId,
  { usuarioId, pagos = [], ajuste_redondeo = 0 } = {}
) {
  const ord = await ordenRepo.getById(restauranteId, ordenId);
  if (!ord) throw new Error("Orden no encontrada");
  if (!puede(ord.estado, "pagada")) throw new Error("Transición inválida");

  const det = await ordenRepo.listDetalle(ordenId);
  const cfg = await ordenRepo.getCfg(restauranteId);

  const modo =
    ord.iva_modo_en_venta || cfg.impuesto_modo || "INCLUIDO";
  const tasa =
    ord.iva_tasa_en_venta ?? cfg.impuesto_tasa ?? 16.0;

  const envio = Number(ord.envio_monto || 0);
  const ajuste = Number(ajuste_redondeo || 0);

  const { subtotal, iva, total } = calcTotalesFromDetalle(det, {
    modo,
    tasa,
    envio,
    ajuste,
  });

  // Guardar totales
  await ordenRepo.actualizarTotales(ordenId, {
    subtotal,
    iva,
    total,
    ajuste_redondeo: ajuste,
  });

  // Registrar pagos
  for (const p of pagos) {
    await ordenRepo.insertPago(
      ordenId,
      p.medio,
      Number(p.monto || 0),
      p.nota_medio || null
    );
  }

  // Cambiar estado → el trigger creará ticket VENTA
  await ordenRepo.cambiarEstado(restauranteId, ordenId, "pagada", {
    usuarioId,
  });

  return { id: ordenId, estado: "pagada", subtotal, iva, total };
}

/* ============================================================
   CANCELAR ORDEN — ticket CANCELACION por trigger
   ============================================================ */
export async function cancelar(restauranteId, ordenId, usuarioId) {
  const ord = await ordenRepo.getById(restauranteId, ordenId);
  if (!ord) throw new Error("Orden no encontrada");
  if (!puede(ord.estado, "cancelada")) throw new Error("Transición inválida");

  await ordenRepo.cambiarEstado(restauranteId, ordenId, "cancelada", {
    usuarioId,
  });

  // El trigger inserta ticket tipo CANCELACION (solo registro)
  return { id: ordenId, estado: "cancelada" };
}

/* ============================================================
   CONFIGURAR FACTURA (IVA INCLUIDO / DESGLOSADO)
   - Actualiza iva_modo_en_venta / iva_tasa_en_venta
   - Recalcula subtotal / IVA / total
   ============================================================ */
export async function configurarFactura(restauranteId, ordenId, factura) {
  const ord = await ordenRepo.getById(restauranteId, ordenId);
  if (!ord) throw new Error("Orden no encontrada");

  const cfg = await ordenRepo.getCfg(restauranteId);
  const tasa = Number(cfg.impuesto_tasa ?? 16);

  const modo = factura ? "DESGLOSADO" : "INCLUIDO";
  await ordenRepo.updateIVAMode(ordenId, modo, tasa);

  const det = await ordenRepo.listDetalle(ordenId);
  const envio = Number(ord.envio_monto || 0);
  const ajuste = Number(ord.ajuste_redondeo || 0);

  const { subtotal, iva, total } = calcTotalesFromDetalle(det, {
    modo,
    tasa,
    envio,
    ajuste,
  });

  await ordenRepo.actualizarTotales(ordenId, {
    subtotal,
    iva,
    total,
    ajuste_redondeo: ajuste,
  });

  return {
    id: ordenId,
    factura: !!factura,
    iva_modo: modo,
    iva_tasa: tasa,
    subtotal,
    iva,
    total,
  };
}

/* ============================================================
   SET ENVÍO (DOMICILIO) — recalcula totales
   ============================================================ */
export async function setEnvioMonto(
  restauranteId,
  ordenId,
  { envio_monto } = {}
) {
  const ord = await ordenRepo.getById(restauranteId, ordenId);
  if (!ord) throw new Error("Orden no encontrada");

  // Opcional: restringir a DOMICILIO
  if (ord.orden_tipo !== "DOMICILIO") {
    throw new Error("El envío solo aplica para órdenes de DOMICILIO");
  }

  const envio = round2(envio_monto ?? 0);

  // Actualizar campo envio_monto
  await ordenRepo.updateEnvio(ordenId, envio);

  // Recalcular totales con el nuevo envío
  const det = await ordenRepo.listDetalle(ordenId);
  const cfg = await ordenRepo.getCfg(restauranteId);

  const modo =
    ord.iva_modo_en_venta || cfg.impuesto_modo || "INCLUIDO";
  const tasa =
    ord.iva_tasa_en_venta ?? cfg.impuesto_tasa ?? 16.0;
  const ajuste = Number(ord.ajuste_redondeo || 0);

  const { subtotal, iva, total } = calcTotalesFromDetalle(det, {
    modo,
    tasa,
    envio,
    ajuste,
  });

  await ordenRepo.actualizarTotales(ordenId, {
    subtotal,
    iva,
    total,
    ajuste_redondeo: ajuste,
  });

  return {
    id: ordenId,
    envio_monto: envio,
    subtotal,
    iva,
    total,
  };
}
