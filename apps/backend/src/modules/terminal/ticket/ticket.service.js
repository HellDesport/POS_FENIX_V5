import * as repo from "./ticket.repo.js";
import { buildKitchenPayload, buildSalePayload } from "./ticketBuilders.js";
import { pool } from "../../../config/db.js";

// ================== Config impresión ==================
const PRINTER_BASE   = process.env.PRINTER_SERVICE || "http://localhost:9100";
const PRINT_ENDPOINT = process.env.PRINTER_ENDPOINT || `${PRINTER_BASE}/print`;
const RETRIES        = Number(process.env.PRINTER_RETRY || 1);     // reintentos
const TIMEOUT_MS     = Number(process.env.PRINTER_TIMEOUT_MS || 8000);

// =============== Helpers HTTP con timeout/retry ===============
async function postJSON(url, body, { retries = RETRIES, timeoutMs = TIMEOUT_MS } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(body),
        signal: ac.signal
      });
      clearTimeout(to);
      if (!r.ok) {
        const txt = await r.text().catch(()=> "");
        throw new Error(`Printer error ${r.status}: ${txt}`);
      }
      return r.json().catch(()=> ({}));
    } catch (e) {
      clearTimeout(to);
      lastErr = e;
      if (i === retries) break;
      await new Promise(res => setTimeout(res, 300 * (i + 1))); // pequeño backoff
    }
  }
  throw lastErr;
}

async function getJSON(url, { timeoutMs = TIMEOUT_MS } = {}) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeoutMs);
  const r = await fetch(url, { signal: ac.signal });
  clearTimeout(to);
  if (!r.ok) throw new Error(`Printer service no disponible (${r.status})`);
  return r.json();
}

/* ==========================
   Helpers de impresión/meta
   ========================== */

// Detecta 58/80 por nombre de impresora
function inferPaperFromPrinterName(name = "") {
  const s = String(name).toLowerCase();
  if (/\b58\b|pos58|58mm/.test(s)) return "58";
  if (/\b80\b|pos80|80mm/.test(s)) return "80";
  return "80";
}

// Trae datos del restaurante y del usuario (cajero/mesero)
async function fetchRestAndUserMeta(restauranteId, usuarioId) {
  // Restaurante: solo columnas seguras en v0.4
  const [[r]] = await pool.query(
    `SELECT nombre, calle, numero_ext, numero_int, colonia,
            municipio, estado, pais, codigo_postal
       FROM restaurante
      WHERE id = ? LIMIT 1`,
    [restauranteId]
  ).catch(() => [[]]);

  // Usuario + rol_local por restaurante (si existe la relación)
  const [[u]] = await pool.query(
    `SELECT u.id, u.nombre, u.apellidos, u.email, ur.rol_local
       FROM usuario u
       LEFT JOIN usuario_restaurante ur
         ON ur.usuario_id = u.id AND ur.restaurante_id = ?
      WHERE u.id = ? LIMIT 1`,
    [restauranteId, usuarioId]
  ).catch(() => [[]]);

  const restInfo = r ? {
    nombre: r.nombre || null,
    rfc: null,           // en tu esquema actual no existe
    telefono: null,      // en tu esquema actual no existe
    dir: {
      calle: r.calle || null,
      numExt: r.numero_ext || null,
      numInt: r.numero_int || null,
      colonia: r.colonia || null,
      municipio: r.municipio || null,
      estado: r.estado || null,
      pais: r.pais || null,
      cp: r.codigo_postal || null
    }
  } : null;

  const userInfo = u ? {
    id: u.id || null,
    nombre: [u.nombre, u.apellidos].filter(Boolean).join(" ").trim() || null,
    apellidos: u.apellidos || null,
    email: u.email || null,
    rol: u.rol_local || null,
    codigo: null
  } : null;

  return { restInfo, userInfo };
}
// Inyecta paper/restInfo/userInfo en data.cfg
async function enrichPrintableData({ data, restauranteId, usuarioId, impresora }) {
  const meta = await fetchRestAndUserMeta(restauranteId, usuarioId);
  const paper = (data?.cfg?.paper) || inferPaperFromPrinterName(impresora);
  return {
    ...data,
    cfg: {
      ...(data?.cfg || {}),
      paper,
      restInfo: meta.restInfo,
      userInfo: meta.userInfo
    }
  };
}

// ================== API pública ==================
export async function listarPorOrden(restauranteId, ordenId){
  return repo.listByOrden(restauranteId, ordenId);
}

export async function obtener(restauranteId, ticketId){
  const t = await repo.getById(restauranteId, ticketId);
  if (!t) throw new Error("Ticket no encontrado");
  return t;
}

/**
 * Reimprime un ticket existente (COCINA/VENTA).
 * CANCELACION: solo registra la reimpresión (no imprime).
 */
export async function reimprimir(restauranteId, ticketId, usuarioId){
  const t = await repo.getById(restauranteId, ticketId);
  if (!t) throw new Error("Ticket no encontrado");

  // Config y elección de impresora
  const cfg = await repo.getConfig(restauranteId);
  const impresora = t.tipo === "COCINA"
    ? (t.impresora_nombre || cfg.impresora_cocina)
    : (t.impresora_nombre || cfg.impresora_terminal);

  const endpoint = t.impresora_endpoint || cfg.impresora_endpoint || PRINT_ENDPOINT;

  // Data + enriquecimiento con restInfo/userInfo/paper
  const raw = await repo.getOrderPrintableData(t.orden_id);
  const data = await enrichPrintableData({
    data: raw,
    restauranteId,
    usuarioId,               // quien reimprime; si raw incluye autor original, el builder lo mostrará
    impresora
  });

  // Construcción de payload según tipo
  const payload = (t.tipo === "COCINA")
    ? buildKitchenPayload({ ticket: t, data, impresora })
    : buildSalePayload({ ticket: t, data, impresora });

  // Imprimir
  await postJSON(endpoint, payload);

  // Auditoría de reimpresión
  await repo.insertReimpresion({
    ordenId: t.orden_id,
    restauranteId,
    usuarioId,
    impresoraNombre: impresora || null,
    impresoraEndpoint: (endpoint === PRINT_ENDPOINT && !t.impresora_endpoint && !cfg.impresora_endpoint)
      ? null : endpoint
  });
}

/**
 * Reimprime el último ticket de un tipo para una orden.
 * @param {'COCINA'|'VENTA'} tipo
 */
export async function reimprimirUltimoPorTipo(restauranteId, ordenId, tipo, usuarioId){
  const t = await repo.getUltimoTicketPorTipo(restauranteId, ordenId, tipo);
  if (!t) throw new Error(`No hay ticket ${tipo} para esta orden`);
  return reimprimir(restauranteId, t.id, usuarioId);
}

export async function listarImpresoras(){
  return getJSON(`${PRINTER_BASE}/printers`);
}

/**
 * Genera un ticket de venta o cocina y lo imprime
 * @param {number} restauranteId 
 * @param {number} ordenId 
 * @param {number} usuarioId 
 * @param {'VENTA'|'COCINA'|'CANCELACION'} tipo
 */
export async function generar(restauranteId, ordenId, usuarioId, tipo = "VENTA") {
  const cfg = await repo.getConfig(restauranteId);
  const raw = await repo.getOrderPrintableData(ordenId);

  // 1) Selección de impresora según tipo
  const impresora = tipo === "COCINA" ? cfg.impresora_cocina : cfg.impresora_terminal;
  const endpoint  = cfg.impresora_endpoint || PRINT_ENDPOINT;

  // 2) Enriquecer data con restInfo/userInfo/paper
  const data = await enrichPrintableData({ data: raw, restauranteId, usuarioId, impresora });

  // 3) Armar payload
  const ticketMeta = { tipo, orden_id: ordenId };
  const payload = (tipo === "COCINA")
    ? buildKitchenPayload({ ticket: ticketMeta, data, impresora })
    : buildSalePayload({ ticket: ticketMeta, data, impresora });

  // 4) Enviar al microservicio de impresión
  const resp = await postJSON(endpoint, payload);

  // 5) Registrar ticket en BD
  const [insert] = await pool.query(
    `INSERT INTO ticket (orden_id, restaurante_id, tipo, impresora_nombre, impresora_endpoint, generado_por)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [ordenId, restauranteId, tipo, impresora || null, endpoint, usuarioId || null]
  );

  return {
    ticketId: insert.insertId,
    printerResponse: resp,
    impresora,
    endpoint
  };
}
