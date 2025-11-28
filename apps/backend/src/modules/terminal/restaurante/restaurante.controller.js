import * as service from "./restaurante.service.js";

/* ============================================================
   CONTROLLER - RESTAURANTE (ROL TERMINAL)
   ============================================================ */

// Obtener configuración completa
export async function obtenerConfig(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const data = await service.obtenerConfig(restauranteId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

// Actualizar configuración (solo campos permitidos)
export async function actualizarConfig(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const data = await service.actualizarConfig(restauranteId, req.body);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
