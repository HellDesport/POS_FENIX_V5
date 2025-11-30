// apps/backend/src/modules/terminal/ticket/ticket.controller.js

import * as service from "./ticket.service.js";

/* =========================================================
   GET /:ticketId
   Obtiene el ticket completo:
     - Si NO tiene contenido_json -> lo genera
     - Devuelve contenido_json + datos base del ticket
   ========================================================= */
export async function obtenerTicket(req, res, next) {
  try {
    const ticketId = Number(req.params.ticketId);
    const data = await service.obtenerTicketCompleto(ticketId);
    res.json({ ok: true, ticket: data });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   POST /:ticketId/rebuild
   Fuerza la regeneración del contenido_json usando builder
   ========================================================= */
export async function reconstruirTicket(req, res, next) {
  try {
    const ticketId = Number(req.params.ticketId);
    const contenido = await service.generarYGuardarContenido(ticketId);
    res.json({
      ok: true,
      message: "contenido_json regenerado correctamente",
      contenido,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   POST /:ticketId/imprimir
   Envía el ticket al microservicio ESC/POS
   ========================================================= */
export async function imprimirTicket(req, res, next) {
  try {
    const ticketId = Number(req.params.ticketId);
    const resultado = await service.enviarImpresion(ticketId);

    res.json({
      ok: true,
      message: "Ticket enviado a impresora",
      resultado,
    });
  } catch (err) {
    next(err);
  }
}
