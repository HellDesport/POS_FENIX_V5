// apps/backend/src/modules/propietario/restaurante/categoria_producto/categoria_producto.routes.js
import { Router } from "express";
import * as ctrl from "./categoria_producto.controller.js";
import { requireAuth } from "../../../../middlewares/auth.middleware.js";

const router = Router({ mergeParams: true });

// DEBUG opcional: muestra handlers y middleware cargados
if (process.env.NODE_ENV !== "production") {
  console.log("[categoria_producto.routes] Controladores disponibles:", Object.keys(ctrl));
  console.log("[categoria_producto.routes] requireAuth:", typeof requireAuth);
}

// Middleware global de autenticación
router.use(requireAuth());

// Wrapper para capturar errores y validar handlers
const h = (fn, name) => {
  if (typeof fn !== "function") {
    throw new TypeError(`Handler ${name} no es función`);
  }
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

// RUTAS
router.get("/", h(ctrl.list, "list"));
router.get("/:id", h(ctrl.get, "get"));
router.post("/", h(ctrl.create, "create"));
router.put("/:id", h(ctrl.update, "update"));
router.delete("/:id", h(ctrl.remove, "remove"));

export default router;
