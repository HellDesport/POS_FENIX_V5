import express from "express";
import { requireTerminalAuth } from "../middleware/auth.middleware.js";
import * as ctrl from "./restaurante.controller.js";

const router = express.Router();

/* ============================================================
   RUTAS - RESTAURANTE (ROL TERMINAL)
   ============================================================ */

router.use(requireTerminalAuth);

router.get("/", ctrl.obtenerConfig);
router.put("/", ctrl.actualizarConfig);

export default router;
