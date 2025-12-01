import express from "express";
import * as ctrl from "./ordenes.controller.js";
import { requireTerminalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ============================================================
   RUTAS - ÓRDENES (ROL TERMINAL)
   ============================================================ */

router.use(requireTerminalAuth);

// Abiertas (pendiente | en_proceso | listo)
router.get("/", ctrl.listarAbiertas);

// CRUD básico
router.get("/:id", ctrl.obtener);
router.post("/", ctrl.crear);

// Flujo de estados

router.put("/:id/enviar-a-cocina", ctrl.enviarACocina);     // -> en_proceso (imprime COCINA)
router.put("/:id/listo",           ctrl.marcarListo);       // -> listo (sin ticket)
router.put("/:id/pagar",           ctrl.pagar);             // -> pagada (imprime VENTA)
router.put("/:id/cancelar",        ctrl.cancelar);          // -> cancelada (registro)
router.put("/:id/factura",         ctrl.configurarFactura); // -> INCLUIDO / DESGLOSADO IVA

router.put("/:id/envio",           ctrl.setEnvioMonto);     // DOMICILIO: set envío

export default router;
