import express from "express";
import * as printerController from "./printer.controller.js";
import * as service from "./printer.service.js";  // ✅ <-- esta línea
import { restartPrinterService } from "./printer.service.js"; // ya la tienes también

const router = express.Router();

// ============================================================
// Listar impresoras disponibles
// ============================================================
router.get("/list", printerController.listPrinters);

// ============================================================
// Imprimir ticket
// ============================================================
router.post("/print", printerController.printTicket);

// ============================================================
// Reiniciar servicio printer-service
// ============================================================
router.post("/restart", async (_req, res) => {
  try {
    await restartPrinterService();
    res.json({ ok: true, message: "Printer Service reiniciado correctamente" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// Imprimir ticket de prueba
// ============================================================
router.get("/test", async (_req, res) => {
  try {
    const sample = {
      type: "TEST_80MM",
      printer: "POS58_TERMINAL",
      meta: { ticket_id: 0, orden_id: 0, generado_en: new Date().toISOString() },
      header: {
        titulo: "PRUEBA DE IMPRESIÓN",
        restaurante: "Fénix POS",
        mesa: "N/A",
        orden_tipo: "TEST",
      },
      items: [
        { name: "Hamburguesa doble", qty: 1 },
        { name: "Refresco", qty: 2 },
      ],
      footer: { qr: "https://fenix-pos.test" },
    };

    const result = await service.printTicket("POS58_TERMINAL", "text", sample);
    res.json({ ok: true, message: "Ticket de prueba enviado", result });
  } catch (err) {
    console.error("Error en /printer/test:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
