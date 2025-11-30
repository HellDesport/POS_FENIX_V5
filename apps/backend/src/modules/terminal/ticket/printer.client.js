// apps/backend/src/modules/terminal/ticket/printer.client.js

/* =========================================================
   PING — Verifica si el microservicio está vivo
   ========================================================= */
export async function pingMicroservicio() {
  const endpoint = process.env.PRINTER_PING || "http://127.0.0.1:5000/ping";

  try {
    const r = await fetch(endpoint, { method: "GET" });
    const json = await r.json();

    return {
      ok: true,
      endpoint,
      message: json.message || "Printer OK",
    };
  } catch (err) {
    return {
      ok: false,
      endpoint,
      message: `No responde: ${err.message}`,
    };
  }
}

/* =========================================================
   IMPRESIÓN — Envía el ticket al microservicio ESC/POS
   ========================================================= */
export async function enviarAImpresora(contenidoJson, endpoint) {
  if (!endpoint) {
    throw new Error("No se proporcionó endpoint de impresora.");
  }

  const url = `${endpoint.replace(/\/+$/, "")}/print`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contenidoJson),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`Error HTTP ${r.status}: ${text}`);
    }

    const json = await r.json().catch(() => ({}));

    return {
      ok: true,
      endpoint: url,
      response: json,
    };
  } catch (err) {
    console.error("[PrinterClient] Error al enviar a impresora:", err.message);
    return {
      ok: false,
      error: err.message,
      endpoint: url,
    };
  }
}
