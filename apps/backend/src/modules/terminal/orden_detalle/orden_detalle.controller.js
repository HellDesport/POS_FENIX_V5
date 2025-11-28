import * as service from "./orden_detalle.service.js";

/* ============================================================
   CONTROLLER - ORDEN DETALLE (ROL TERMINAL)
   ============================================================ */

export async function listar(req, res, next) {
  try {
    const { ordenId } = req.params;
    const data = await service.listar(ordenId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function agregar(req, res, next) {
  try {
    const { ordenId } = req.params;
    const data = await service.agregar(ordenId, req.body);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function actualizarCantidad(req, res, next) {
  try {
    const { ordenId, detalleId } = req.params;
    const { cantidad } = req.body;
    const data = await service.actualizarCantidad(detalleId, cantidad, ordenId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const { ordenId, detalleId } = req.params;
    const data = await service.eliminar(detalleId, ordenId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
