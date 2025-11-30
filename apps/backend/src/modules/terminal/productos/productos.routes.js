import { Router } from "express";
import { requireTerminalAuth } from "../middleware/auth.middleware.js";
import * as ctrl from "./productos.controller.js";

const router = Router();

/* ========================================================
   RUTAS - PRODUCTOS (ROL TERMINAL)
   ======================================================== */

router.use(requireTerminalAuth);

// Listar productos visibles del restaurante actual
router.get("/", ctrl.listar);

// Obtener un producto específico
router.get("/:id", ctrl.obtener);

export default router;
