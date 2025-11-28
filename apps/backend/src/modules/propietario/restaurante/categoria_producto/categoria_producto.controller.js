// apps/backend/src/modules/propietario/categoria_producto/categoria_producto.controller.js
import * as service from "./categoria_producto.service.js";

// ---------------------------------------------
// Helpers
// ---------------------------------------------
const toNum = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

const parseParentId = (v) => {
  if (v === undefined) return undefined;   // no filtrar por parent
  if (v === null || v === "null" || v === "") return null; // raíz
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined; // si viene basura, ignora filtro
};

const toBoolFlag = (v) => {
  if (v === undefined || v === null) return false;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes";
};

// ---------------- LISTAR ----------------
export async function list(req, res, next) {
  console.log(">> [categoria.controller] list()");
  try {
    const restauranteId = toNum(req.params.restauranteId);
    if (!restauranteId) return res.status(400).json({ message: "restauranteId inválido" });

    const filtros = {
      parent_id: parseParentId(req.query.parent_id),
      incluyeInactivas: toBoolFlag(req.query.incluyeInactivas),
      q: (req.query.q || "").trim()
    };

    const categorias = await service.listCategorias(restauranteId, filtros);
    res.json({ ok: true, data: categorias });
  } catch (err) {
    console.error("Error en controller.list:", err);
    next(err);
  }
}

// ---------------- OBTENER UNO ----------------
export async function get(req, res, next) {
  console.log(">> [categoria.controller] get()");
  try {
    const restauranteId = toNum(req.params.restauranteId);
    const id = toNum(req.params.id);
    if (!restauranteId || !id) return res.status(400).json({ message: "Parámetros inválidos" });

    const categoria = await service.getCategoria(id, restauranteId);
    if (!categoria) return res.status(404).json({ message: "Categoría no encontrada" });

    res.json({ ok: true, data: categoria });
  } catch (err) {
    console.error("Error en controller.get:", err);
    next(err);
  }
}

// ---------------- CREAR ----------------
export async function create(req, res, next) {
  console.log(">> [categoria.controller] create()");
  try {
    const restauranteId = toNum(req.params.restauranteId);
    if (!restauranteId) return res.status(400).json({ message: "restauranteId inválido" });

    const data = { ...req.body, restaurante_id: restauranteId };
    const id = await service.createCategoria(data);

    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error("Error en controller.create:", err);
    next(err);
  }
}

// ---------------- ACTUALIZAR ----------------
export async function update(req, res, next) {
  console.log(">> [categoria.controller] update()");
  try {
    const restauranteId = toNum(req.params.restauranteId);
    const id = toNum(req.params.id);
    if (!restauranteId || !id) return res.status(400).json({ message: "Parámetros inválidos" });

    await service.updateCategoria(id, restauranteId, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error en controller.update:", err);
    next(err);
  }
}

// ---------------- ELIMINAR (árbol completo) ----------------
export async function remove(req, res, next) {
  console.log(">> [categoria.controller] remove()");
  try {
    const restauranteId = toNum(req.params.restauranteId);
    const id = toNum(req.params.id);
    if (!restauranteId || !id) return res.status(400).json({ message: "Parámetros inválidos" });

    // ?hard=1 elimina también productos del árbol; por defecto los inactiva y desasigna
    const hard = String(req.query.hard || "0").toLowerCase() === "1";
    await service.deleteCategoria(id, restauranteId, { hardDeleteProducts: hard });

    res.json({ ok: true });
  } catch (err) {
    console.error("Error en controller.remove:", err);
    next(err);
  }
}
