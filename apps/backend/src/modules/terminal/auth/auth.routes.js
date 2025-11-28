import express from "express";
import * as controller from "./auth.controller.js";
import { requireTerminalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

// ===============================
// RUTAS DE AUTENTICACIÓN TERMINAL
// ===============================

// 🔓 Login de terminal (sin token)
router.post("/login", controller.login);

// 🔒 Datos del usuario autenticado
router.get("/me", requireTerminalAuth, controller.me);

// 🔒 Cierre de sesión
router.post("/logout", requireTerminalAuth, controller.logout);

export default router;
