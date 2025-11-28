import * as ordenRepo from "./ordenes.repo.js";
import * as ticketSvc from "../ticket/ticket.service.js";

/* ============================================================
   SERVICE – ÓRDENES (ROL TERMINAL)  v0.4 + Integración Tickets
   ============================================================ */

/* ------------ helpers red/endpoint (anti cuelgues) --------- */
function ensurePrintEndpoint(url) {
  const u = (url || "").trim();
  if (!u) return "http://localhost:9100/print";
  return u.endsWith("/print") ? u : `${u.replace(/\/+$/, "")}/print`;
}

async function fetchJsonWithTimeout(url, { method = "POST", headers, body } = {}, timeoutMs = 8000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method, headers, body, signal: ac.signal });
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`Printer ${res.status}: ${text || "sin detalle"}`);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(t);
  }
}

export async function listarOrdenesAbiertas(restauranteId) {
  return await ordenRepo.listarAbiertas(restauranteId);
}

export async function crearOrden(restauranteId, mesaId, usuarioId, tipo) {
  const tiposValidos = ["AQUI", "LLEVAR", "DOMICILIO"];
  if (!tiposValidos.includes(tipo)) throw new Error("Tipo de orden inválido");
  return await ordenRepo.crearOrden({ restauranteId, mesaId, usuarioId, ordenTipo: tipo });
}

export async function obtenerOrden(restauranteId, ordenId) {
  const orden = await ordenRepo.obtenerOrden(restauranteId, ordenId);
  if (!orden) throw new Error("Orden no encontrada");
  return orden;
}

/* -------------------- FLUJO DE ESTADOS -------------------- */
const puede = (from, to) =>
  ({
    pendiente: ["en_proceso", "cancelada"],
    en_proceso: ["listo", "pagada", "cancelada"],
    listo: ["pagada", "cancelada"],
    pagada: [],
    cancelada: [],
  }[from]?.includes(to));

/* ============================================================
   ENVÍO A COCINA — genera ticket de cocina automáticamente
   ============================================================ */
export async function enviarACocina(restauranteId, ordenId, usuarioId) {
  const ord = await ordenRepo.getById(restauranteId, ordenId);
  if (!ord) throw new Error("Orden no encontrada");
  if (!puede(ord.estado, "en_proceso")) throw new Error("Transición inválida");

  await ordenRepo.cambiarEstado(restauranteId, ordenId, "en_proceso", { usuarioId });

  try {
    const data = await ordenRepo.getOrderPrintableData(ordenId);
    const cfg = await ordenRepo.getCfg(restauranteId);
    const impresora = cfg.impresora_cocina || "Generic / Text Only";
    const endpoint = ensurePrintEndpoint(cfg.impresora_endpoint);

    const payload = ticketSvc.buildKitchenPayload({
      ticket: { id: null, tipo: "COCINA" },
      data,
      impresora,
    });

    await fetchJsonWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    await ordenRepo.insertTicket({
      ordenId,
      restauranteId,
      tipo: "COCINA",
      impresoraNombre: impresora,
      impresoraEndpoint: endpoint,
      generadoPor: usuarioId || null,
    });

    console.log(`🧾 Ticket de cocina generado correctamente para orden #${ordenId}`);
  } catch (err) {
    console.error(`⚠️ Error generando ticket de cocina: ${err.message}`);
  }

  return { id: ordenId, estado: "en_proceso" };
}

/* ============================================================
   MARCAR COMO LISTO
   ============================================================ */
export async function marcarListo(restauranteId, ordenId) {
  const ord = await ordenRepo.getById(restauranteId, ordenId);
  if (!ord) throw new Error("Orden no encontrada");
  if (!puede(ord.estado, "listo")) throw new Error("Transición inválida");
  await ordenRepo.cambiarEstado(restauranteId, ordenId, "listo");
  return { id: ordenId, estado: "listo" };
}

/* ============================================================
   PAGAR — genera ticket de venta automáticamente
   ============================================================ */
export async function pagar(restauranteId, ordenId, { usuarioId, pagos = [], ajuste_redondeo = 0 } = {}) {
  const ord = await ordenRepo.getById(restauranteId, ordenId);
  if (!ord) throw new Error("Orden no encontrada");
  if (!puede(ord.estado, "pagada")) throw new Error("Transición inválida");

  const det = await ordenRepo.listDetalle(ordenId);
  const cfg = await ordenRepo.getCfg(restauranteId);

  const subtotal = round2(det.reduce((s, d) => s + Number(d.precio_unitario) * Number(d.cantidad), 0));
  const iva = calcIVA(subtotal, cfg.impuesto_modo, cfg.impuesto_tasa);
  const envio = Number(ord.envio_monto || 0);
  const ajuste = Number(ajuste_redondeo || 0);
  const total = round2(subtotal + iva + envio + ajuste);

  await ordenRepo.actualizarTotales(ordenId, { subtotal, iva, total, ajuste_redondeo: ajuste });

  for (const p of pagos) {
    await ordenRepo.insertPago(ordenId, p.medio, Number(p.monto || 0), p.nota_medio || null);
  }

  await ordenRepo.cambiarEstado(restauranteId, ordenId, "pagada", { usuarioId });

  try {
    const data = await ordenRepo.getOrderPrintableData(ordenId);
    const impresora = cfg.impresora_terminal || "Microsoft Print to PDF";
    const endpoint = ensurePrintEndpoint(cfg.impresora_endpoint);

    const payload = ticketSvc.buildSalePayload({
      ticket: { id: null, tipo: "VENTA" },
      data,
      impresora,
    });

    await fetchJsonWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    await ordenRepo.insertTicket({
      ordenId,
      restauranteId,
      tipo: "VENTA",
      impresoraNombre: impresora,
      impresoraEndpoint: endpoint,
      generadoPor: usuarioId || null,
    });

    console.log(`💰 Ticket de venta generado correctamente para orden #${ordenId}`);
  } catch (err) {
    console.error(`⚠️ Error generando ticket de venta: ${err.message}`);
  }

  return { id: ordenId, estado: "pagada", subtotal, iva, envio_monto: envio, ajuste_redondeo: ajuste, total };
}

/* ============================================================
   CANCELAR ORDEN
   ============================================================ */
export async function cancelar(restauranteId, ordenId, usuarioId) {
  const ord = await ordenRepo.getById(restauranteId, ordenId);
  if (!ord) throw new Error("Orden no encontrada");
  if (!puede(ord.estado, "cancelada")) throw new Error("Transición inválida");

  await ordenRepo.cambiarEstado(restauranteId, ordenId, "cancelada", { usuarioId });

  try {
    await ordenRepo.insertTicket({
      ordenId,
      restauranteId,
      tipo: "CANCELACION",
      impresoraNombre: null,
      impresoraEndpoint: null,
      generadoPor: usuarioId || null,
    });
    console.log(`🗑️ Ticket de cancelación registrado para orden #${ordenId}`);
  } catch (err) {
    console.error("⚠️ Error registrando ticket de cancelación:", err.message);
  }

  return { id: ordenId, estado: "cancelada" };
}

/* ============================================================
   SOPORTE DOMICILIO / COMPATIBILIDAD
   ============================================================ */
export async function setEnvioMonto(restauranteId, ordenId, envio) {
  const ord = await ordenRepo.getById(restauranteId, ordenId);
  if (!ord) throw new Error("Orden no encontrada");
  if (ord.orden_tipo !== "DOMICILIO") throw new Error("envio_monto solo aplica a DOMICILIO");
  if (isNaN(envio) || envio < 0) throw new Error("envio_monto inválido");
  await ordenRepo.updateEnvio(ordenId, envio);
  return { id: ordenId, envio_monto: envio };
}

export async function cerrarOrden(restauranteId, ordenId, estado) {
  const validos = ["pagada", "cancelada"];
  if (!validos.includes(estado)) throw new Error("Estado inválido");
  if (estado === "pagada") return pagar(restauranteId, ordenId, {});
  if (estado === "cancelada") return cancelar(restauranteId, ordenId);
  return null;
}

/* -------------------- helpers -------------------- */
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function calcIVA(subtotal, modo, tasa) {
  const t = Number(tasa || 0) / 100;
  if (modo === "EXENTO") return 0;
  if (modo === "DESGLOSADO") return round2(subtotal * t);
  // INCLUIDO
  const base = subtotal / (1 + t);
  return round2(subtotal - base);
}
