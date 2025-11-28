import express from "express";
import { requireTerminalAuth } from "../middleware/auth.middleware.js";
import * as ctrl from "./orden_detalle.controller.js";

const router = express.Router();

/* ============================================================
   RUTAS - ORDEN DETALLE (ROL TERMINAL)
   ============================================================ */

router.use(requireTerminalAuth);

// Listar productos de una orden
router.get("/:ordenId", ctrl.listar);

// Agregar producto
router.post("/:ordenId", ctrl.agregar);

// Actualizar cantidad
router.put("/:ordenId/:detalleId", ctrl.actualizarCantidad);

// Eliminar producto
router.delete("/:ordenId/:detalleId", ctrl.eliminar);

export default router;
