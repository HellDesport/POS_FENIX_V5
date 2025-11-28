// =====================================================
// loader.js — Carga de datos desde API y sincroniza UI
// =====================================================

import { state } from "./state.js";
import * as api from "./api.js";
import {
  renderCategorias,
  renderSubcategorias,
  renderProductos,
  updateProductosTabsUI,
  updateProductosScopeLabel,
  updateSubcatParentLabel,
  updateEmptyStates
} from "./render.js";


// =====================================================
// Generar contexto global (propietarioId, restauranteId, API_BASE)
// =====================================================

export async function loadContext() {
  const user = api.getCurrentUser();   // debe venir de tu api.js
  const propietarioId = user?.propietario_id ?? user?.id;

  if (!propietarioId) {
    throw new Error("No se encontró propietarioId en sesión");
  }

  const restaurante = await api.getRestaurante();
  if (!restaurante) {
    throw new Error("No se encontró restaurante asociado");
  }

  state.restaurante = restaurante;
  state.restauranteId = restaurante.id;

  const API_BASE = `/propietarios/${propietarioId}/restaurantes`;

  return {
    propietarioId,
    restauranteId: restaurante.id,
    API_BASE
  };
}


// =====================================================
// Cargar restaurante (nombre, mesas, estatus)
// =====================================================
export async function loadRestaurante(els) {
  try {
    const data = await api.getRestaurante();
    if (!data) return;

    state.restaurante = data;
    state.restauranteId = data.id;

    // nombre
    if (els.restName) els.restName.textContent = data.nombre || "";

    // mesas
    if (els.mesasConfigCount) {
      els.mesasConfigCount.textContent = Number(data.total_mesas) || 0;
    }

    // estatus
    if (els.restStatusPill) {
      const est = (data.estatus || "").toLowerCase();

      els.restStatusPill.textContent =
        est === "activo" ? "Restaurante ACTIVO" : "Restaurante INACTIVO";

      els.restStatusPill.classList.remove("status-activo", "status-inactivo");
      els.restStatusPill.classList.add(
        est === "activo" ? "status-activo" : "status-inactivo"
      );
    }
  } catch (err) {
    console.error("[loader] No se pudo cargar restaurante:", err);
  }
}


// =====================================================
// Cargar categorías, subcategorías y productos
// =====================================================
export async function loadCategoriasSubcatsProductos(els) {
  const restauranteId = state.restauranteId;
  if (!restauranteId) {
    resetAllLists(els);
    return;
  }

  try {
    const [cats, productos] = await Promise.all([
      api.getCategorias(restauranteId),
      api.getProductos(restauranteId)
    ]);

    normalizeCategorias(cats);
    normalizeProductos(productos);

    updateEmptyStates(els);
  } catch (err) {
    console.error("[loader] Error cargando estructura:", err);
    resetAllLists(els);
  }
}


// =====================================================
// Normalización de categorías
// =====================================================
function normalizeCategorias(raw) {
  const arr = Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw)
    ? raw
    : [];

  const cleaned = arr.map((c) => ({
    ...c,
    id: Number(c.id),
    parent_id: c.parent_id == null ? null : Number(c.parent_id)
  }));

  state.categorias = cleaned.filter((c) => c.parent_id === null);
  state.subcategorias = cleaned.filter((c) => c.parent_id !== null);
}


// =====================================================
// Normalización de productos
// =====================================================
function normalizeProductos(raw) {
  const arr = Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw)
    ? raw
    : raw?.productos || [];

  state.productos = arr.map((p) => {
    let cat = p.categoria_id;

    if (typeof cat === "string") cat = cat.trim();
    if (cat === "" || cat === "null" || cat == null) {
      return { ...p, categoria_id: null };
    }

    const num = Number(cat);
    return Number.isFinite(num)
      ? { ...p, categoria_id: num }
      : { ...p, categoria_id: null };
  });
}


// =====================================================
// Reset total de listas (cuando no hay restaurante)
// =====================================================
function resetAllLists(els) {
  state.categorias = [];
  state.subcategorias = [];
  state.productos = [];

  updateEmptyStates(els);
  renderCategorias(els);
  renderSubcategorias(els);
  renderProductos(els);
}


// =====================================================
// Cargar TODO y renderizar TODO
// =====================================================
export async function reloadAll(els) {
  await loadRestaurante(els);
  await loadCategoriasSubcatsProductos(els);

  autoSelectDefaults();
  fullRender(els);
}


// =====================================================
// Selección automática inicial
// =====================================================
function autoSelectDefaults() {
  if (state.categorias.length) {
    const cat = state.categorias[0];
    state.selectedCategoriaId = cat.id;

    const subs = state.subcategorias.filter((s) => s.parent_id === cat.id);
    state.selectedSubcatId = subs.length ? subs[0].id : null;
  } else {
    state.selectedCategoriaId = null;
    state.selectedSubcatId = null;
  }
}


// =====================================================
// Render completo de UI
// =====================================================
export function fullRender(els) {
  renderCategorias(els);
  renderSubcategorias(els);
  renderProductos(els);

  updateProductosTabsUI(els);
  updateProductosScopeLabel(els);
  updateSubcatParentLabel(els);
  updateEmptyStates(els);
}


// =====================================================
// Reload solo restaurante (sin categorías)
// =====================================================
export async function reloadRestauranteOnly(els) {
  await loadRestaurante(els);
}
