// apps/backend/src/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/** Obtiene el secreto y algoritmos desde env con tolerancia de claves */
function getJwtConfig() {
  const secret =
    env?.jwt?.secret ||
    env?.jwt_secret ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT secret no configurado (env.jwt.secret / env.jwt_secret / JWT_SECRET).");
  }

  // Permite configurar explícitamente; de lo contrario HS256.
  let algorithms =
    env?.jwt?.algorithms ||
    env?.jwt_algorithms ||
    process.env.JWT_ALGORITHMS;

  if (typeof algorithms === "string") {
    algorithms = algorithms.split(",").map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(algorithms) || algorithms.length === 0) {
    algorithms = ["HS256"];
  }

  return { secret, algorithms };
}

/**
 * Middleware principal de autenticación.
 * - requiredRole: string | string[] | null
 * - Siempre finaliza con `next()` o `res.status(...).json(...)`.
 */
export function requireAuth(requiredRole = null) {
  const { secret, algorithms } = getJwtConfig();

  return (req, res, next) => {
    try {
      const header = String(req.headers.authorization || req.headers.Authorization || "");
      const match = /^Bearer\s+(.+)$/i.exec(header);

      if (!match) {
        return res.status(401).json({ message: "No autorizado: falta Authorization Bearer" });
      }

      const token = match[1].trim();
      if (!token) {
        return res.status(401).json({ message: "Token vacío o inválido" });
      }

      // Verificación SINCRONA para evitar cuelgues
      const payload = jwt.verify(token, secret, { algorithms });

      // Normaliza el usuario que vas a inyectar
      const user = {
        id: payload.sub ?? payload.id ?? null,
        email: payload.email ?? null,
        rol: payload.rol ?? payload.rol_global ?? null,
        rol_global: payload.rol_global ?? payload.rol ?? null,
        propietario_id: payload.propietario_id ?? payload.owner_id ?? null,
        raw: payload,
      };

      req.user = user;

      // Validación de rol si se pide
      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        const hasRole = roles.includes(user.rol) || roles.includes(user.rol_global);
        if (!hasRole) {
          return res.status(403).json({ message: "Prohibido: rol no autorizado" });
        }
      }

      return next();
    } catch (err) {
      const code =
        err?.name === "TokenExpiredError" ? 401 :
        err?.name === "JsonWebTokenError" ? 401 : 401;

      return res.status(code).json({
        message: "Token inválido o expirado",
        detail: err?.message,
      });
    }
  };
}

/**
 * Verifica que el propietario en el token coincida con el parámetro de ruta.
 * Útil para rutas como: /api/propietarios/:propietarioId/**
 */
export function requireOwnerMatchesParam(paramName = "propietarioId") {
  return (req, res, next) => {
    const pidParam = Number(req.params?.[paramName]);
    const pidToken = Number(req.user?.propietario_id);

    if (!Number.isFinite(pidToken)) {
      return res.status(403).json({ message: "Token sin propietario_id" });
    }
    if (!Number.isFinite(pidParam) || pidParam !== pidToken) {
      return res.status(403).json({ message: "No autorizado para este propietario" });
    }
    return next();
  };
}
