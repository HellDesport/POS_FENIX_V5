// apps/backend/src/modules/propietario/categoria_producto/categoria_producto.service.js
import * as repo from "./categoria_producto.repo.js";

const toNum = (v, d = null) => {
  if (v === undefined || v === null || v === "") return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function mapDup(err) {
  // ER_DUP_ENTRY de MySQL
  if (err && (err.code === "ER_DUP_ENTRY" || /Duplicate entry/i.test(err?.message || ""))) {
    const key = (/for key '([^']+)'/i.exec(err.message || "") || [])[1] || "";
    if (key.includes("slug"))   return { status: 409, message: "El slug ya existe en esta sucursal" };
    if (key.includes("nombre")) return { status: 409, message: "El nombre ya existe en esta sucursal" };
    return { status: 409, message: "Registro duplicado" };
  }
  return null;
}

export async function listCategorias(restauranteId, { parent_id, incluyeInactivas, q } = {}) {
  const rid = toNum(restauranteId);
  if (!rid) { const e = new Error("restauranteId inválido"); e.status = 400; throw e; }
  return repo.findAllByRestaurante({
    restauranteId: rid,
    parentId: parent_id !== undefined ? (parent_id === null ? null : toNum(parent_id)) : undefined,
    incluyeInactivas: String(incluyeInactivas || "0") === "1",
    q: (q || "").trim()
  });
}

export async function getCategoria(id, restauranteId) {
  const rid = toNum(restauranteId);
  const cid = toNum(id);
  if (!rid || !cid) { const e = new Error("Parámetros inválidos"); e.status = 400; throw e; }
  return repo.getById({ restauranteId: rid, categoriaId: cid });
}

export async function createCategoria(data) {
  // data: { restaurante_id, parent_id?, nombre, descripcion?, visible?, activo?, orden?, slug? }
  try {
    const rid = toNum(data.restaurante_id);
    if (!rid) { const e = new Error("restaurante_id inválido"); e.status = 400; throw e; }

    const payload = {
      restauranteId: rid,
      parentId: data.parent_id !== undefined ? (data.parent_id === null ? null : toNum(data.parent_id, null)) : null,
      nombre: String(data.nombre || "").trim(),
      descripcion: data.descripcion ?? null,
      visible: data.visible === false || data.visible === 0 ? 0 : 1,
      activo: data.activo === false || data.activo === 0 ? 0 : 1,
      orden: toNum(data.orden, 0),
      slug: data.slug || null
    };
    if (!payload.nombre) { const e = new Error("nombre es requerido"); e.status = 422; throw e; }

    const row = await repo.create(payload);
    return row.id; // tu controller esperaba devolver id
  } catch (err) {
    const m = mapDup(err) || { status: 500, message: "No se pudo crear la categoría" };
    const e = new Error(m.message); e.status = m.status; e.cause = err; throw e;
  }
}

export async function updateCategoria(id, restauranteId, data) {
  try {
    const rid = toNum(restauranteId);
    const cid = toNum(id);
    if (!rid || !cid) { const e = new Error("Parámetros inválidos"); e.status = 400; throw e; }

    const changes = {
      parentId: data.parent_id !== undefined ? (data.parent_id === null ? null : toNum(data.parent_id, null)) : undefined,
      nombre: data.nombre === undefined ? undefined : String(data.nombre).trim(),
      descripcion: data.descripcion === undefined ? undefined : (data.descripcion ?? null),
      visible: data.visible === undefined ? undefined : (data.visible ? 1 : 0),
      activo: data.activo === undefined ? undefined : (data.activo ? 1 : 0),
      orden: data.orden === undefined ? undefined : toNum(data.orden, 0),
      slug: data.slug === undefined ? undefined : (data.slug || null),
    };

    const row = await repo.update({ restauranteId: rid, categoriaId: cid, changes });
    if (!row) { const e = new Error("Categoría no encontrada"); e.status = 404; throw e; }
    return true;
  } catch (err) {
    const m = mapDup(err) || { status: 500, message: "No se pudo actualizar la categoría" };
    const e = new Error(m.message); e.status = m.status; e.cause = err; throw e;
  }
}

export async function deleteCategoria(id, restauranteId, { hardDeleteProducts = false } = {}) {
  const rid = toNum(restauranteId);
  const cid = toNum(id);
  if (!rid || !cid) { const e = new Error("Parámetros inválidos"); e.status = 400; throw e; }

  // En lugar del delete directo, borramos el Árbol completo:
  await repo.removeTree({ restauranteId: rid, categoriaId: cid, hardDeleteProducts });
  return true;
}
