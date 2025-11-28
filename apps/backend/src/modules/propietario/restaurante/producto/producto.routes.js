import { Router } from "express";
import * as ctrl from "./producto.controller.js";
import { requireAuth } from "../../../../middlewares/auth.middleware.js";


const router = Router({ mergeParams: true });

// Requiere token y rol válido
router.use(requireAuth());

// CRUD completo
router.get("/", ctrl.list); // Listar productos
router.get("/:id", ctrl.get); // Obtener por ID
router.post("/", ctrl.create); // Crear
router.put("/:id", ctrl.update); // Actualizar
router.patch("/:id/estatus", ctrl.changeStatus); // Cambiar estatus rápido
router.delete("/:id", ctrl.remove); // Eliminar (lógico o físico)

export default router;