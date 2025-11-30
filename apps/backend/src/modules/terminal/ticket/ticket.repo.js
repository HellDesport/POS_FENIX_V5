// apps/backend/src/modules/terminal/ticket/ticket.repo.js

import { pool } from "../../../config/db.js";

/* =========================================================
   Helpers
   ========================================================= */
const toId = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/* =========================================================
   BÁSICO: Obtener ticket por ID
   ========================================================= */

/**
 * Devuelve el ticket crudo desde la tabla `ticket`.
 * Incluye contenido_json si ya fue generado.
 */
export async function getById(ticketId) {
  const id = toId(ticketId);
  if (!id) return null;

  const [rows] = await pool.query(
    `
    SELECT
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
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

/* =========================================================
   Actualizar contenido_json
   ========================================================= */

/**
 * Actualiza la columna contenido_json de un ticket.
 * contenidoJson debe llegar ya serializado (string) o como objeto.
 */
export async function updateContenidoJson(ticketId, contenidoJson) {
  const id = toId(ticketId);
  if (!id) return 0;

  // Permitimos objeto JS o string JSON
  const payload =
    typeof contenidoJson === "string"
      ? contenidoJson
      : JSON.stringify(contenidoJson ?? null);

  const [r] = await pool.query(
    `
    UPDATE ticket
       SET contenido_json = ?
     WHERE id = ?
    `,
    [payload, id]
  );

  return r.affectedRows;
}

/* =========================================================
   Registrar impresión (copias_generadas + opcionalmente impresora)
   ========================================================= */

/**
 * Incrementa copias_generadas y opcionalmente actualiza impresora_nombre
 * y/o impresora_endpoint (por si el microservicio reporta cambios).
 */
export async function registrarImpresion(ticketId, {
  impresoraNombre,
  impresoraEndpoint,
} = {}) {
  const id = toId(ticketId);
  if (!id) return 0;

  const sets = ["copias_generadas = COALESCE(copias_generadas, 0) + 1"];
  const params = [];

  if (impresoraNombre !== undefined) {
    sets.push("impresora_nombre = ?");
    params.push(impresoraNombre);
  }

  if (impresoraEndpoint !== undefined) {
    sets.push("impresora_endpoint = ?");
    params.push(impresoraEndpoint);
  }

  params.push(id);

  const [r] = await pool.query(
    `
    UPDATE ticket
       SET ${sets.join(", ")}
     WHERE id = ?
    `,
    params
  );

  return r.affectedRows;
}
