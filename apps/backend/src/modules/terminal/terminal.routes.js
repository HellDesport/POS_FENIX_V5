import express from "express";
import * as ctrl from "./terminal.controller.js";
import { requireTerminalAuth  } from "./middleware/auth.middleware.js";
import mesasRoutes from "./mesas/mesas.routes.js";
import ordenesRoutes from "./ordenes/ordenes.routes.js";
import ordenDetalleRoutes from "./orden_detalle/orden_detalle.routes.js";
import restauranteRoutes from "./restaurante/restaurante.routes.js";
import ticketRoutes from "./ticket/ticket.routes.js";

const router = express.Router();

/* ============================================================
   RUTAS PRINCIPALES DEL ROL TERMINAL
   ============================================================ */
router.use(requireTerminalAuth );

router.get("/", ctrl.ping);
router.get("/info", ctrl.infoRestaurante);

// Submódulos
router.use("/mesas", mesasRoutes);
router.use("/ordenes", ordenesRoutes);
router.use("/orden-detalle", ordenDetalleRoutes);
router.use("/restaurante", restauranteRoutes);
router.use("/ticket", ticketRoutes);
export default router;
