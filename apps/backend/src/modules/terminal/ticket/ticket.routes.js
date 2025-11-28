import express from "express";
import * as ctrl from "./ticket.controller.js";
import * as svc from "./ticket.service.js";
import { requireTerminalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(requireTerminalAuth);

/* ===================== TICKETS (ROL TERMINAL) ===================== */
// POST /api/terminal/ticket/generar
router.post("/generar", ctrl.generar);

// POST /api/terminal/ticket/reimprimir
router.post("/reimprimir", ctrl.reimprimir);

// POST /api/terminal/ticket/reimprimir-ultimo
router.post("/reimprimir-ultimo", ctrl.reimprimirUltimo);

// GET /api/terminal/ticket/impresoras
router.get("/impresoras", ctrl.listarImpresoras);

// (opcional) ping rápido para comprobar montaje
router.get("/_ping", (req, res) => res.json({ ok: true, scope: "ticket" }));


router.post("/test", async (req, res, next) => {
  try {
    const { restauranteId, ordenId, usuarioId, tipo = "VENTA" } = req.body;
    const result = await svc.generar(restauranteId, ordenId, usuarioId, tipo);
    res.json({ ok: true, message: "Ticket generado correctamente", result });
  } catch (e) {
    next(e);
  }
});
export default router;
