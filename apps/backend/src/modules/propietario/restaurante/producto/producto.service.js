// apps/backend/src/modules/propietario/restaurante/producto/producto.service.js
import * as repo from "./producto.repo.js";

// ---------------------------------------------
// Utils
// ---------------------------------------------
const ALLOWED_STATUS = new Set(["disponible", "agotado", "oculto", "inactivo"]);

const toNum = (v, d = null) => {
  if (v === undefined || v === null || v === "") return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const clampUnsigned = (v, d = 0) => {
  const n = toNum(v, d);
  return n < 0 ? 0 : n;
};

function mapDup(err) {
  if (err && (err.code === "ER_DUP_ENTRY" || /Duplicate entry/i.test(err?.message || ""))) {
    const key = (/for key '([^']+)'/i.exec(err.message || "") || [])[1] || "";
    if (key?.includes("slug")) return { status: 409, message: "El slug ya existe en esta sucursal" };
    if (key?.includes("sku"))  return { status: 409, message: "El SKU ya existe en esta sucursal" };
    return { status: 409, message: "Registro duplicado" };
  }
  return null;
}

function mapSqlState(err, fallbackMsg) {
  // Triggers de negocio lanzan: SIGNAL SQLSTATE '45000'
  if (err?.sqlState === "45000") {
    return { status: 422, message: err.sqlMessage || fallbackMsg || "Regla de negocio violada" };
  }
  return null;
}

// --- helper: asegura que la categoría exista y sea hoja (subcategoría) ---
async function assertLeafCategory(restauranteId, categoriaId) {
  const cat = await repo.getCategoriaById(restauranteId, categoriaId);
  if (!cat) {
    const e = new Error("La categoría indicada no existe en este restaurante");
    e.status = 404;
    throw e;
  }
  if (cat.parent_id === null) {
    const e = new Error("Solo se permiten productos en subcategorías (la categoría indicada es padre)");
    e.status = 422;
    throw e;
  }
  return cat;
}

// ---------------------------------------------
// LISTAR
// ---------------------------------------------
export async function list(restauranteId, filtros = {}) {
  const rid = toNum(restauranteId);
  if (!rid) {
    const e = new Error("restauranteId inválido");
    e.status = 400;
    throw e;
  }
  return repo.list(rid, filtros);
}

// ---------------------------------------------
// OBTENER POR ID
// ---------------------------------------------
export async function getById(restauranteId, id) {
  const rid = toNum(restauranteId);
  const pid = toNum(id);
  if (!rid || !pid) {
    const e = new Error("Parámetros inválidos");
    e.status = 400;
    throw e;
  }
  return repo.getById(rid, pid);
}

// ---------------------------------------------
// CREAR PRODUCTO
// ---------------------------------------------
export async function create(data) {
  try {
    const rid = toNum(data.restaurante_id);
    if (!rid) {
      const e = new Error("restaurante_id inválido");
      e.status = 400;
      throw e;
    }

    const payload = {
      restaurante_id: rid,
      categoria_id : toNum(data.categoria_id, null),
      nombre       : String(data.nombre || "").trim(),
      descripcion  : data.descripcion ?? null,
      sku          : data.sku || null,
      imagen       : data.imagen || null,
      precio       : clampUnsigned(data.precio, 0),
      estatus      : ALLOWED_STATUS.has(data.estatus) ? data.estatus : "disponible",
      orden        : clampUnsigned(data.orden, 0),
      slug         : data.slug || null, // deja NULL para que el trigger lo genere
    };

    if (!payload.nombre) {
      const e = new Error("nombre es requerido");
      e.status = 422;
      throw e;
    }
    if (!payload.categoria_id) {
      const e = new Error("categoria_id es requerido");
      e.status = 422;
      throw e;
    }

    // Validación previa: categoría existente y hoja
    await assertLeafCategory(rid, payload.categoria_id);

    const id = await repo.create(payload);
    return id;
  } catch (err) {
    console.error("[producto.service] ERROR SQL:", err);
    const m =
      mapSqlState(err, "No se pudo crear el producto") ||
      mapDup(err) ||
      { status: 500, message: "No se pudo crear el producto" };

    const e = new Error(m.message);
    e.status = m.status;
    e.cause = err;
    throw e;
  }
}

// ---------------------------------------------
// ACTUALIZAR PRODUCTO
// ---------------------------------------------
export async function update(id, restauranteId, data) {
  try {
    const rid = toNum(restauranteId);
    const pid = toNum(id);
    if (!rid || !pid) { const e = new Error("Parámetros inválidos"); e.status = 400; throw e; }

    // Traer el producto actual para evaluar estado final
    const actual = await repo.getById(rid, pid);
    if (!actual) { const e = new Error("Producto no encontrado"); e.status = 404; throw e; }

    const changes = {
      categoria_id: data.categoria_id !== undefined ? toNum(data.categoria_id, null) : undefined,
      nombre      : data.nombre !== undefined ? String(data.nombre || "").trim() : undefined,
      slug        : data.slug,
      descripcion : data.descripcion,
      sku         : data.sku,
      imagen      : data.imagen,
      precio      : data.precio !== undefined ? clampUnsigned(data.precio, 0) : undefined,
      estatus     : data.estatus !== undefined
                      ? (ALLOWED_STATUS.has(data.estatus) ? data.estatus : undefined)
                      : undefined,
      orden       : data.orden !== undefined ? clampUnsigned(data.orden, 0) : undefined
    };

    // Si cambian categoria_id a un valor, validar hoja
    if (changes.categoria_id !== undefined && changes.categoria_id !== null) {
      await assertLeafCategory(rid, changes.categoria_id);
    }

    // Validación de regla: si el estatus final será "disponible", debe tener subcategoría
    const estatusFinal = changes.estatus ?? actual.estatus;
    const categoriaFinal = (changes.categoria_id !== undefined) ? changes.categoria_id : actual.categoria_id;

    if (estatusFinal === "disponible" && (categoriaFinal === null)) {
      const e = new Error("Para activar un producto debe asignarse a una subcategoría");
      e.status = 422;
      throw e;
    }

    const ok = await repo.update(pid, rid, changes);
    if (!ok) { const e = new Error("Producto no encontrado"); e.status = 404; throw e; }
    return true;
  } catch (err) {
    console.error("[producto.service] ERROR SQL:", err);
    const m =
      mapSqlState(err, "No se pudo actualizar el producto") ||
      mapDup(err) ||
      { status: 500, message: "No se pudo actualizar el producto" };
    const e = new Error(m.message); e.status = m.status; e.cause = err; throw e;
  }
}

// ---------------------------------------------
// CAMBIAR ESTATUS
// ---------------------------------------------
export async function changeStatus(id, restauranteId, estatus) {
  const rid = toNum(restauranteId);
  const pid = toNum(id);
  if (!rid || !pid) { const e = new Error("Parámetros inválidos"); e.status = 400; throw e; }
  if (!ALLOWED_STATUS.has(estatus)) { const e = new Error("estatus inválido"); e.status = 422; throw e; }

  // Nueva validación
  const prod = await repo.getById(rid, pid);
  if (!prod) { const e = new Error("Producto no encontrado"); e.status = 404; throw e; }

  if (estatus === "disponible" && (prod.categoria_id === null)) {
    const e = new Error("Para activar un producto debe asignarse a una subcategoría");
    e.status = 422;
    throw e;
  }

  await repo.changeStatus(pid, rid, estatus);
  return true;
}

// ---------------------------------------------
// ELIMINAR
// ---------------------------------------------
export async function remove(id, restauranteId) {
  const rid = toNum(restauranteId);
  const pid = toNum(id);
  if (!rid || !pid) {
    const e = new Error("Parámetros inválidos");
    e.status = 400;
    throw e;
  }
  await repo.remove(pid, rid);
  return true;
}
