import * as ordenService from "./ordenes.service.js";

/* ============================================================
   CONTROLLER - ÓRDENES (ROL TERMINAL)
   ============================================================ */

export async function listarAbiertas(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const data = await ordenService.listarOrdenesAbiertas(restauranteId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function crear(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const usuarioId = req.usuario?.id || null;
    const { mesa_id, tipo } = req.body;
    const data = await ordenService.crearOrden(restauranteId, mesa_id, usuarioId, tipo);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function obtener(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const { id } = req.params;
    const data = await ordenService.obtenerOrden(restauranteId, id);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

/* ====== NUEVOS HANDLERS DE FLUJO ====== */
export async function enviarACocina(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const usuarioId = req.usuario?.id || null;
    const { id } = req.params;
    const data = await ordenService.enviarACocina(restauranteId, id, usuarioId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function marcarListo(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const { id } = req.params;
    const data = await ordenService.marcarListo(restauranteId, id);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function pagar(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const usuarioId = req.usuario?.id || null;
    const { id } = req.params;
    const { pagos, ajuste_redondeo } = req.body || {};
    const data = await ordenService.pagar(restauranteId, id, { usuarioId, pagos, ajuste_redondeo });
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function cancelar(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const usuarioId = req.usuario?.id || null;
    const { id } = req.params;
    const data = await ordenService.cancelar(restauranteId, id, usuarioId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function setEnvioMonto(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const { id } = req.params;
    const { envio_monto } = req.body;
    const data = await ordenService.setEnvioMonto(restauranteId, id, Number(envio_monto));
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

/* ====== legacy (si tu UI viejo la usa) ====== */
export async function cerrar(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const { id } = req.params;
    const { estado } = req.body;
    const data = await ordenService.cerrarOrden(restauranteId, id, estado);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function configurarFactura(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const { id } = req.params;
    const { factura } = req.body; // true = desglose, false = incluido

    const data = await ordenService.configurarFactura(restauranteId, id, factura);
    res.json({ ok: true, data });

  } catch (err) { next(err); }
}
