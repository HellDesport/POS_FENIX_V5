
const BASE = process.env.PRINTER_SERVICE || "http://localhost:9100";

/* ------------------------------ Helpers ------------------------------ */
function inferPaperFromPrinterName(name = "") {
  const s = String(name).toLowerCase();
  if (/\b58\b|pos58|80mm-58|58mm/.test(s)) return "58";
  if (/\b80\b|pos80|80mm/.test(s)) return "80";
  // por defecto 80mm
  return "80";
}

function ensurePaperInPayload(payload, printerName) {
  // ticketBuilders lee data.cfg.paper
  const p = { ...payload };
  const cfgPath = p?.data?.cfg ?? (p.data = { ...(p.data || {}), cfg: {} }).cfg;

  if (!cfgPath.paper) {
    cfgPath.paper = inferPaperFromPrinterName(printerName || p.printer);
  }
  return p;
}

async function withTimeout(promise, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(promise, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------ API ------------------------------ */
export async function listPrinters() {
  const res = await fetch(`${BASE}/printers`);
  if (!res.ok) throw new Error(`Printer service: ${res.status}`);
  return res.json();
}

/**
 * Envía un payload al microservicio de impresión.
 * @param {object} payload  // devuelto por ticketBuilders.* o compatible
 * @param {object} [opts]
 * @param {string} [opts.endpoint]  // sobreescribe BASE/print
 * @param {string} [opts.printer]   // fuerza nombre de impresora
 * @param {number} [opts.timeoutMs] // default 8s
 */
export async function print(payload, opts = {}) {
  const { endpoint, printer, timeoutMs = 8000 } = opts;
  const url = endpoint || `${BASE}/print`;

  // Clonar y normalizar
  let final = { ...(payload || {}) };
  if (printer) final.printer = printer;
  if (!final.format) final.format = "text";
  // asegurar paper para el builder (58/80) si no viene
  final = ensurePaperInPayload(final, final.printer);

  const body = JSON.stringify(final);
  const req = fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });

  // timeout + 1 reintento si falla por red/timeout
  let res;
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: ctrl.signal
    });
    clearTimeout(to);
  } catch (e) {
    // reintento breve
    const ctrl2 = new AbortController();
    const to2 = setTimeout(() => ctrl2.abort(), Math.min(4000, timeoutMs));
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: ctrl2.signal
    }).finally(() => clearTimeout(to2));
  }

  if (!res?.ok) {
    const errTxt = await res.text().catch(() => "");
    throw new Error(`Printer job failed: ${res?.status} ${errTxt}`);
  }
  return res.json().catch(() => ({}));
}
