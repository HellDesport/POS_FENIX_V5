import { Router } from "express";
import * as ctrl from "./auth.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();
router.post("/login", ctrl.login);
router.get("/me", requireAuth, ctrl.me);
router.post("/register-propietario", ctrl.registerPropietario);

export default router;
 