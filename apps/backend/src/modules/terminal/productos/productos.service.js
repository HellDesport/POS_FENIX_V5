// apps/backend/src/modules/terminal/productos/productos.service.js

import * as repo from "./productos.repo.js";

/* ============================================================
   SERVICE - PRODUCTOS (ROL TERMINAL)
   ============================================================ */

const toNum = (v, d = null) => {
  if (v === undefined || v === null || v === "") return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// ------------------------------------------------------------
// LISTAR PRODUCTOS VISIBLES
// ------------------------------------------------------------
export async function listar(restauranteId, filtros = {}) {
  const rid = toNum(restauranteId);
  if (!rid) {
    const e = new Error("restauranteId inválido");
    e.status = 400;
    throw e;
  }

  const parsed = {
    categoria_id: toNum(filtros.categoria_id, null),
    q: (filtros.q || "").trim(),
    limit: toNum(filtros.limit, 100),
    offset: toNum(filtros.offset, 0),
  };

  return await repo.listar(rid, parsed);
}

// ------------------------------------------------------------
// OBTENER UN PRODUCTO ESPECÍFICO
// ------------------------------------------------------------
export async function obtener(restauranteId, productoId) {
  const rid = toNum(restauranteId);
  const pid = toNum(productoId);

  if (!rid || !pid) {
    const e = new Error("Parámetros inválidos");
    e.status = 400;
    throw e;
  }

  return await repo.obtener(rid, pid);
}
