import * as service from "./producto.service.js";

const toNum = (v) =>
  v === undefined || v === null || v === "" ? null : Number(v);

// ================================
// Listar productos
// ================================
export async function list(req, res, next) {
  try {
    const restauranteId = toNum(req.params.restauranteId);
    if (!restauranteId)
      return res.status(400).json({ message: "restauranteId inválido" });

    // 🚀 FIX PRINCIPAL: categoría solo se filtra si viene en query
    let categoriaId;
    if (req.query.categoria_id !== undefined) {
      categoriaId = toNum(req.query.categoria_id);
    } else {
      categoriaId = undefined; // NO FILTRAR
    }

    const filtros = {
      categoriaId,
      estatus: req.query.estatus || null,
      q: req.query.q || "",
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0,
    };

    const data = await service.list(restauranteId, filtros);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

// ================================
// Obtener producto por ID
// ================================
export async function get(req, res, next) {
  try {
    const restauranteId = toNum(req.params.restauranteId);
    const id = toNum(req.params.id);
    if (!restauranteId || !id)
      return res.status(400).json({ message: "Parámetros inválidos" });

    const producto = await service.getById(restauranteId, id);
    if (!producto)
      return res.status(404).json({ message: "Producto no encontrado" });

    res.json({ ok: true, data: producto });
  } catch (err) {
    next(err);
  }
}

// ================================
// Crear producto
// ================================
export async function create(req, res, next) {
  try {
    const restauranteId = toNum(req.params.restauranteId);
    if (!restauranteId)
      return res.status(400).json({ message: "restauranteId inválido" });

    const data = { ...req.body, restaurante_id: restauranteId };
    const id = await service.create(data);
    res.status(201).json({ ok: true, id });
  } catch (err) {
    next(err);
  }
}

// ================================
// Actualizar producto
// ================================
export async function update(req, res, next) {
  try {
    const restauranteId = toNum(req.params.restauranteId);
    const id = toNum(req.params.id);
    if (!restauranteId || !id)
      return res.status(400).json({ message: "Parámetros inválidos" });

    await service.update(id, restauranteId, req.body);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ================================
// Cambiar estatus
// ================================
export async function changeStatus(req, res, next) {
  try {
    const restauranteId = toNum(req.params.restauranteId);
    const id = toNum(req.params.id);
    const estatus = req.body.estatus;
    if (!restauranteId || !id || !estatus)
      return res.status(400).json({ message: "Parámetros inválidos" });

    await service.changeStatus(id, restauranteId, estatus);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ================================
// Eliminar producto
// ================================
export async function remove(req, res, next) {
  try {
    const restauranteId = toNum(req.params.restauranteId);
    const id = toNum(req.params.id);
    if (!restauranteId || !id)
      return res.status(400).json({ message: "Parámetros inválidos" });

    await service.remove(id, restauranteId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
