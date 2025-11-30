// apps/backend/src/modules/terminal/ticket/ticket.service.js

import * as repo from "./ticket.repo.js";
import { build as buildTicketJson } from "./ticket.builder.js";
import { enviarAImpresora } from "./printer.client.js";

/* =========================================================
   1) Obtener ticket completo
   Si no tiene contenido_json: lo genera y guarda
   ========================================================= */
export async function obtenerTicketCompleto(ticketId) {
  const ticket = await repo.getById(ticketId);
  if (!ticket) throw new Error("Ticket no encontrado");

  // Si no tiene contenido_json → generar
  if (!ticket.contenido_json) {
    const jsonGenerado = await generarYGuardarContenido(ticketId);
    ticket.contenido_json = jsonGenerado;
  } else {
    // Si es string, parsear
    try {
      ticket.contenido_json = JSON.parse(ticket.contenido_json);
    } catch {
      // Si algo viene corrupto → generarlo de nuevo
      const nuevo = await generarYGuardarContenido(ticketId);
      ticket.contenido_json = nuevo;
    }
  }

  return ticket;
}

/* =========================================================
   2) Generar contenido_json con builder y guardarlo
   ========================================================= */
export async function generarYGuardarContenido(ticketId) {
  const contenido = await buildTicketJson(ticketId);
  await repo.updateContenidoJson(ticketId, contenido);
  return contenido;
}

/* =========================================================
   3) Enviar ticket al microservicio de impresión
   ========================================================= */
export async function enviarImpresion(ticketId) {
  const ticket = await repo.getById(ticketId);
  if (!ticket) throw new Error("Ticket no encontrado");

  // Asegurarse que contenido_json exista
  let contenido = ticket.contenido_json;
  if (!contenido) {
    contenido = await generarYGuardarContenido(ticketId);
  } else {
    try {
      contenido = typeof contenido === "string"
        ? JSON.parse(contenido)
        : contenido;
    } catch {
      contenido = await generarYGuardarContenido(ticketId);
    }
  }

  // Impresora obligatoria excepto en CANCELACION
  if (ticket.tipo !== "CANCELACION") {
    if (!ticket.impresora_endpoint) {
      throw new Error("No hay impresora configurada para este ticket");
    }
  }

  // Enviar al microservicio
  const resultado = await enviarAImpresora(contenido, ticket.impresora_endpoint);

  // Registrar impresión (incrementar copias)
  await repo.registrarImpresion(ticketId);

  return resultado;
}
