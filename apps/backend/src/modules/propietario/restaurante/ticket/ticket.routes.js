import { Router } from "express";
import * as ctrl from "./ticket.controller.js";

const router = Router({ mergeParams: true });

// Listado
router.get("/", ctrl.listar);

// ¡OJO!: rutas más específicas primero
router.get("/files/:filename", ctrl.descargarLogFileLegacy); // legado del microservicio
router.get("/:ticketId.txt", ctrl.descargarTxt);
router.get("/:ticketId.pdf", ctrl.descargarPdf);

// Detalle (genérica de último)
router.get("/:ticketId", ctrl.obtener);

export default router;
