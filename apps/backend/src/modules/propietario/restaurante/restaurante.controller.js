import * as service from "./restaurante.service.js";

export async function crear(req, res, next) {
  try {
    const propietarioId = +req.params.propietarioId;
    const out = await service.crear(propietarioId, req.body);
    res.status(201).json(out);
  } catch (err) { next(err); }
}

export async function listar(req, res, next) {
  try {
    const items = await service.listar(+req.params.propietarioId);
    res.json(items);
  } catch (err) { next(err); }
}

export async function actualizar(req, res, next) {
  try {
    const out = await service.actualizar(
      +req.params.propietarioId,
      +req.params.restauranteId,
      req.body
    );
    res.json(out);
  } catch (err) { next(err); }
}

export async function eliminar(req, res, next) {
  try {
    const out = await service.eliminar(+req.params.propietarioId, +req.params.restauranteId);
    res.json(out);
  } catch (err) { next(err); }
}

/* ===== Config ===== */
export async function obtenerConfig(req, res, next) {
  try {
    const cfg = await service.obtenerConfig(+req.params.propietarioId, +req.params.restauranteId);
    res.json(cfg);
  } catch (err) { next(err); }
}

export async function actualizarConfig(req, res, next) {
  try {
    const cfg = await service.actualizarConfig(
      +req.params.propietarioId,
      +req.params.restauranteId,
      req.body
    );
    res.json(cfg);
  } catch (err) { next(err); }
}

/* ===== Mesas ===== */
export async function listarMesas(req, res, next) {
  try {
    const mesas = await service.listarMesas(+req.params.propietarioId, +req.params.restauranteId);
    res.json(mesas);
  } catch (err) { next(err); }
}

export async function actualizarMesa(req, res, next) {
  try {
    const mesa = await service.actualizarMesa(
      +req.params.propietarioId,
      +req.params.restauranteId,
      +req.params.mesaId,
      req.body
    );
    res.json(mesa);
  } catch (err) { next(err); }
}

export async function sincronizarMesas(req, res, next) {
  try {
    const data = await service.sincronizarMesas(
      +req.params.propietarioId,
      +req.params.restauranteId,
      req.body?.total_mesas
    );
    res.json({ mesas: data });
  } catch (err) { next(err); }
}
