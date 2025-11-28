import jwt from "jsonwebtoken";
import { env } from "../../../config/env.js";

/* ============================================================
   AUTH MIDDLEWARE - ROL TERMINAL (versión depurada)
   ============================================================ */
export function requireTerminalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    // Si no existe encabezado
    if (!authHeader) {
      return res.status(401).json({ ok: false, error: "Encabezado Authorization no proporcionado" });
    }

    // Asegurar formato correcto "Bearer <token>"
    if (!authHeader.startsWith("Bearer ")) {
      console.error("Formato incorrecto en Authorization:", authHeader);
      return res.status(401).json({ ok: false, error: "Formato del token inválido" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({ ok: false, error: "Token vacío" });
    }

    const secret = env.JWT_SECRET || "FENIX_DEFAULT_SECRET";
    const decoded = jwt.verify(token, secret);

    if (!decoded.rol_local || decoded.rol_local !== "TERMINAL") {
      return res.status(403).json({ ok: false, error: "Solo terminales autorizadas pueden acceder" });
    }

    req.user = {
      id: decoded.usuario_id,
      nombre: decoded.usuario_nombre,
      email: decoded.email,
      rol_local: decoded.rol_local,
      restaurante_id: decoded.restaurante_id,
    };

    req.restaurante = { id: decoded.restaurante_id };

    next();
  } catch (err) {
    console.error("Error en requireTerminalAuth:", err.message);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ ok: false, error: "Token expirado" });
    }
    return res.status(401).json({ ok: false, error: "Token inválido" });
  }
}
