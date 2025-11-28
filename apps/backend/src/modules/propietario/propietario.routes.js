import { Router } from "express";
import * as controller from "./propietario.controller.js";


const router = Router();

router.get("/", controller.obtenerPropietarios)
// Crear propietario
router.post("/", controller.crearPropietario);

export default router;
