import * as terminalService from "./terminal.service.js";

/* ============================================================
   TERMINAL CONTROLLER
   ============================================================ */

// Información general del restaurante (para dashboard o inicialización)
export async function infoRestaurante(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const data = await terminalService.obtenerInfoRestaurante(restauranteId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

// Endpoint de prueba (para verificar el rol terminal)
export async function ping(req, res) {
  res.json({
    ok: true,
    msg: "Terminal backend activo",
    restaurante: req.restaurante?.id || null,
  });
}
