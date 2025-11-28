import express from "express";
import * as ctrl from "./mesas.controller.js";
import { requireTerminalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ============================================================
   RUTAS DE MESAS - ROL TERMINAL
   ============================================================ */
router.use(requireTerminalAuth); // todas protegidas

router.get("/", ctrl.listar);
router.get("/:id", ctrl.obtener);
router.put("/:id/estado", ctrl.cambiarEstado);

export default router;
