// restaurante.routes.js
import { Router } from "express";
import * as controller from "./restaurante.controller.js";
import { requireAuth, requireOwnerMatchesParam } from "../../../middlewares/auth.middleware.js";
import ticketRoutes from "./ticket/ticket.routes.js";

const router = Router({ mergeParams: true });

// Protege TODO este subárbol:
router.use(requireAuth(), requireOwnerMatchesParam("propietarioId"));

router.post("/", controller.crear);
router.get("/", controller.listar);
router.put("/:restauranteId", controller.actualizar);
router.delete("/:restauranteId", controller.eliminar);

router.get("/:restauranteId/config", controller.obtenerConfig);
router.put("/:restauranteId/config", controller.actualizarConfig);

router.get("/:restauranteId/mesas", controller.listarMesas);
router.put("/:restauranteId/mesas/:mesaId", controller.actualizarMesa);
router.post("/:restauranteId/mesas/sincronizar", controller.sincronizarMesas);


router.use("/:restauranteId/tickets", ticketRoutes);
export default router;
