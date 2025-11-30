// apps/backend/src/modules/terminal/ticket/ticket.routes.js

import { Router } from "express";
import { requireTerminalAuth as requireAuth } from "../middleware/auth.middleware.js";

import {
  obtenerTicket,
  reconstruirTicket,
  imprimirTicket,
} from "./ticket.controller.js";

import { pingMicroservicio } from "./printer.client.js";

const router = Router({ mergeParams: true });

/* =========================================================
   PING — SIN AUTH
   ========================================================= */
router.get("/_ping", async (req, res) => {
  try {
    const ping = await pingMicroservicio();
    res.json({
      ok: true,
      backend: "online",
      printer: {
        online: ping.ok,
        endpoint: ping.endpoint,
        message: ping.message || null,
      },
    });
  } catch (err) {
    res.json({
      ok: true,
      backend: "online",
      printer: {
        online: false,
        error: err.message,
      },
    });
  }
});

/* =========================================================
   A PARTIR DE AQUÍ → REQUIERE TOKEN
   ========================================================= */
router.use(requireAuth);

/* =========================================================
   RUTAS PRINCIPALES
   ========================================================= */

router.get("/:ticketId", obtenerTicket);
router.post("/:ticketId/rebuild", reconstruirTicket);
router.post("/:ticketId/imprimir", imprimirTicket);

export default router;
