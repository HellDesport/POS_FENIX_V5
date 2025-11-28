import * as mesasService from "./mesas.service.js";

/* ============================================================
   CONTROLADOR DE MESAS - ROL TERMINAL
   ============================================================ */

export async function listar(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const data = await mesasService.listarMesas(restauranteId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function obtener(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const { id } = req.params;
    const data = await mesasService.obtenerMesa(restauranteId, id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function cambiarEstado(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const { id } = req.params;
    const { estado } = req.body;
    const data = await mesasService.actualizarEstado(restauranteId, id, estado);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
