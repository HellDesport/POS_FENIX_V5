import * as svc from "./ticket.service.js";

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function listar(req, res, next) {
  try {
    const restauranteId = Number(req.params.restauranteId);
    const { tipo, desde, hasta, q, limit, offset } = req.query;
    const rows = await svc.listarTickets({ restauranteId, tipo, desde, hasta, q, limit, offset });
    res.json({ ok: true, total: rows.length, data: rows });
  } catch (err) { next(err); }
}

export async function obtener(req, res, next) {
  try {
    const restauranteId = Number(req.params.restauranteId);
    const ticketId = Number(req.params.ticketId);
    const data = await svc.obtenerTicket(restauranteId, ticketId);
    if (!data) throw new HttpError(404, "Ticket no encontrado");
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function descargarTxt(req, res, next) {
  try {
    const restauranteId = Number(req.params.restauranteId);
    const ticketId = Number(req.params.ticketId);
    const txt = await svc.generarTxt(restauranteId, ticketId);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="ticket_${ticketId}.txt"`);
    res.send(txt);
  } catch (err) { next(err); }
}

export async function descargarPdf(req, res, next) {
  try {
    const restauranteId = Number(req.params.restauranteId);
    const ticketId = Number(req.params.ticketId);
    await svc.streamPdf(res, restauranteId, ticketId);
  } catch (err) { next(err); }
}

export async function descargarLogFileLegacy(req, res, next) {
  try {
    const { filename } = req.params;
    await svc.streamLegacyLogFile(res, filename);
  } catch (err) { next(err); }
}
