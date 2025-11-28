import express from "express";
import * as controller from "./empleados.controller.js";
import { requireAuth } from "../../../../middlewares/auth.middleware.js";

const router = express.Router({ mergeParams: true }); // ✅ IMPORTANTE

// Solo propietario autenticado
router.use(requireAuth("PROPIETARIO"));

// Listar usuarios (por restaurante actual)
router.get("/", controller.listar);

// Crear usuario local
router.post("/", controller.crear);
// Actualizar empleado
router.put("/:id", controller.actualizar);

// Activar / desactivar empleado
router.patch("/:id/estatus", controller.cambiarEstatus);
export default router;