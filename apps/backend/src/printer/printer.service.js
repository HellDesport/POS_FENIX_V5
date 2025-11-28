import { spawn } from "child_process";
import path from "path";

const PRINTER_SERVICE = process.env.PRINTER_SERVICE || "http://localhost:9100";

let proc = null;

/* Función genérica POST JSON */
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Error del printer-service ${r.status}: ${txt}`);
  }
  return r.json().catch(() => ({}));
}

/* Listar impresoras */
export async function listPrinters() {
  const r = await fetch(`${PRINTER_SERVICE}/printers`);
  if (!r.ok) throw new Error(`No se pudo listar impresoras`);
  return r.json();
}

/* Enviar ticket a impresión */
export async function printTicket(printer, format, ticket) {
  const printerName = encodeURIComponent(printer || "");
  const url = `${PRINTER_SERVICE}/print/${printerName}?format=${format}`;
  return postJSON(url, ticket);
}

/* Reiniciar el microservicio printer-service */
export async function restartPrinterService() {
 const servicePath = path.resolve("apps/print-service/Fenix.PrintService");
  try {
    if (proc && !proc.killed) {
      proc.kill("SIGINT");
      console.log("🧩 Printer Service detenido por solicitud del usuario.");
      await new Promise((r) => setTimeout(r, 2000));
    }

    proc = spawn("dotnet", ["run"], {
      cwd: servicePath,
      shell: true,
      stdio: "inherit",
    });

    proc.on("exit", (code) => {
      console.log(`⚠️ Printer Service terminó con código ${code}`);
    });

    console.log("🔁 Printer Service reiniciado correctamente desde Node.");
  } catch (err) {
    console.error("❌ Error al reiniciar Printer Service:", err.message);
    throw err;
  }
}
