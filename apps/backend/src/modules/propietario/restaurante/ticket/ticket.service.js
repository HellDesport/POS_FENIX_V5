// SIN import de pdfkit arriba (lo cargamos perezoso)
import fs from "fs";
import path from "path";
import * as repo from "./ticket.repo.js";

const WIDTH = 42; // ancho típico de 80mm en caracteres monoespaciados

// Loader perezoso de pdfkit (ESM/CJS compatible)
let _PDFDocument = null;
async function getPDFDocument() {
  if (_PDFDocument) return _PDFDocument;
  const mod = await import("pdfkit");
  _PDFDocument = mod?.default ?? mod; // soporta default / namespace
  return _PDFDocument;
}

function money(n) { return (Number(n) || 0).toFixed(2); }
function padRight(s, n) { s = String(s ?? ""); return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length); }
function padLeft(s, n) { s = String(s ?? ""); return s.length >= n ? s.slice(-n) : " ".repeat(n - s.length) + s; }
function line() { return "-".repeat(WIDTH); }

function buildTxt({ header, detalles, pagos }) {
  const l = [];
  const folio = header.folio ? `${header.serie_folio || ""}-${header.folio}` : "-";
  l.push(padRight(header.restaurante_nombre || "RESTAURANTE", WIDTH));
  l.push(padRight(`TICKET: ${header.tipo}   FOLIO: ${folio}`, WIDTH));
  l.push(padRight(`ORDEN: #${header.orden_id}   TIPO: ${header.orden_tipo}`, WIDTH));
  l.push(padRight(`GENERADO: ${new Date(header.generado_en).toLocaleString()}`, WIDTH));
  if (header.generado_por_nombre) l.push(padRight(`USUARIO: ${header.generado_por_nombre}`, WIDTH));
  l.push(line());

  // Detalle
  for (const d of detalles) {
    const qty = padLeft(d.cantidad, 5);
    const name = padRight(d.producto_nombre, WIDTH - 5);
    l.push(`${qty} ${name}`);
    const pu = padLeft(money(d.precio_unitario), 10);
    const imp = padLeft(money(d.importe), 10);
    l.push(padRight(`PU:${pu}   IMP:${imp}`, WIDTH));
  }

  l.push(line());
  l.push(padLeft(`Subtotal: ${money(header.subtotal)}`, WIDTH));
  if (Number(header.iva) > 0) {
    l.push(padLeft(`IVA ${money(header.iva_tasa_en_venta)}%: ${money(header.iva)}`, WIDTH));
  }
  l.push(padLeft(`Total: ${money(header.total)}`, WIDTH));

  if (pagos?.length) {
    l.push(line());
    l.push(padRight("PAGOS:", WIDTH));
    for (const p of pagos) {
      l.push(padRight(`${p.medio} ${money(p.monto)}  ${new Date(p.creado_en).toLocaleTimeString()}`, WIDTH));
    }
  }

  l.push(line());
  if (header.contenido_qr) l.push(padRight(`QR: ${header.contenido_qr}`, WIDTH));
  l.push(padRight("¡Gracias por su compra!", WIDTH));
  return l.join("\n") + "\n";
}

export async function listarTickets(params) {
  return await repo.listTickets(params);
}

export async function obtenerTicket(restauranteId, ticketId) {
  return await repo.getTicketCompleto(restauranteId, ticketId);
}

export async function generarTxt(restauranteId, ticketId) {
  const data = await obtenerTicket(restauranteId, ticketId);
  if (!data) throw new Error("Ticket no encontrado");
  return buildTxt(data);
}

export async function streamPdf(res, restauranteId, ticketId) {
  const data = await obtenerTicket(restauranteId, ticketId);
  if (!data) throw new Error("Ticket no encontrado");

  // Carga perezosa de pdfkit
  const PDFDocument = await getPDFDocument();

  const txt = buildTxt(data);
  const lines = txt.split("\n");

  // Estimación de alto dinámico (puntos typográficos)
  // 80mm ~ 226pt de ancho. Altura: margen + líneas*(fontSize+lineGap) + margen
  const fontSize = 10;
  const lineGap = 2;
  const lineHeight = fontSize + lineGap;
  const estHeight = Math.max(220, 10 + lines.length * lineHeight + 10);

  const doc = new PDFDocument({
    size: [226, estHeight],
    margins: { top: 10, bottom: 10, left: 10, right: 10 }
  });

  // encabezados HTTP
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="ticket_${ticketId}.pdf"`);

  doc.pipe(res);
  doc.font("Courier").fontSize(fontSize);

  // Imprimir línea por línea (monoespaciado)
  for (const ln of lines) doc.text(ln, { lineGap });

  doc.end();
}

/** (Opcional) Servir un archivo txt generado por el microservicio, dado su filename exacto */
export function streamLegacyLogFile(res, filename) {
  const LOG_DIR =
    process.env.PRINT_LOG_DIR ||
    path.resolve(process.cwd(), "../print-service/Fenix.PrintService/bin/Debug/net9.0/logs");
  const full = path.resolve(LOG_DIR, filename);
  if (!full.startsWith(LOG_DIR)) throw new Error("Ruta inválida"); // evitar path traversal
  if (!fs.existsSync(full)) throw new Error("Archivo no encontrado");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${path.basename(full)}"`);
  fs.createReadStream(full).pipe(res);
}
