// apps/backend/src/modules/terminal/productos/productos.controller.js

import * as service from "./productos.service.js";

// ============================================================
// LISTAR PRODUCTOS VISIBLES DEL RESTAURANTE ACTUAL
// ============================================================
export async function listar(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id; // asignado por el middleware terminalAuth

    if (!restauranteId) {
      return res.status(400).json({ ok: false, message: "Restaurante no asignado" });
    }

    const filtros = {
      categoria_id: req.query.categoria_id || null,
      q: req.query.q || "",
      limit: req.query.limit || 100,
      offset: req.query.offset || 0
    };

    const data = await service.listar(restauranteId, filtros);

    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// OBTENER UN PRODUCTO ESPECÍFICO POR ID
// ============================================================
export async function obtener(req, res, next) {
  try {
    const restauranteId = req.restaurante?.id;
    const productoId = Number(req.params.id);

    if (!restauranteId || !productoId) {
      return res.status(400).json({ ok: false, message: "Parámetros inválidos" });
    }

    const data = await service.obtener(restauranteId, productoId);

    if (!data) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    }

    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
