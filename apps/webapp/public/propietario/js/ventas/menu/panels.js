// =====================================================
// panels.js — Control de paneles laterales (VERSIÓN CORREGIDA)
// =====================================================

import { state } from "./state.js";
import {
  saveCategoria,
  deleteCategoria,
  saveSubcategoria,
  deleteSubcategoria,
  saveProducto,
  deleteProducto,
  saveMesas,
} from "./api.js";

// =====================================================
// UTILIDAD CENTRAL
// =====================================================

function resetLocalFilters() {
  state.subcatSearchTerm = "";
  state.productsSearchTerm = "";
}

// =====================================================
// Panel: abrir/cerrar
// =====================================================

// Abrir un panel específico
export function openPanel(els, name) {
  resetLocalFilters();

  state.activePanel = name;

  els.sideOverlay.hidden = false;

  els.panelCategoriaForm.hidden = name !== "categoria";
  els.panelSubcatForm.hidden = name !== "subcat";
  els.panelProductoForm.hidden = name !== "producto";
  els.panelMesasForm.hidden   = name !== "mesas";
}

// Cerrar todos los paneles
export function closeAllPanels(els) {
  state.activePanel = null;
  state.editingCategoryId = null;
  state.editingSubcatId = null;
  state.editingProductId = null;

  els.sideOverlay.hidden = true;
  els.panelCategoriaForm.hidden = true;
  els.panelSubcatForm.hidden = true;
  els.panelProductoForm.hidden = true;
  els.panelMesasForm.hidden = true;
}

// =====================================================
// Panel: Categoría
// =====================================================

export function openCategoriaPanel(els, { mode, categoria = null }) {
  resetLocalFilters();

  state.editingCategoryId = mode === "edit" && categoria ? categoria.id : null;

  els.panelCategoriaFormTitle.textContent =
    mode === "edit" ? "Editar categoría" : "Nueva categoría";

  els.catFormNombre.value = categoria?.nombre || "";
  els.btnEliminarCategoria.style.display =
    mode === "edit" ? "inline-flex" : "none";

  openPanel(els, "categoria");
}

export async function handleSaveCategoria(els, API_BASE, restauranteId, reloadCb) {
  const nombre = els.catFormNombre.value.trim();
  if (!nombre) return alert("Escribe un nombre para la categoría.");

  const data = { nombre, parent_id: null };
  const id = state.editingCategoryId;

  try {
    await saveCategoria(API_BASE, restauranteId, data, id);
    await reloadCb(els);

    closeAllPanels(els);
  } catch (err) {
    alert(err.message || "No se pudo guardar la categoría.");
  }
}

export async function handleDeleteCategoria(els, API_BASE, restauranteId, reloadCb) {
  const id = state.editingCategoryId;
  if (!id) return;

  if (!confirm("¿Eliminar esta categoría?")) return;

  try {
    await deleteCategoria(API_BASE, restauranteId, id);
    await reloadCb(els);

    closeAllPanels(els);
  } catch (err) {
    alert(err.message || "No se pudo eliminar la categoría.");
  }
}

// =====================================================
// Panel: Subcategoría
// =====================================================

export function fillSubcatPadreSelect(els) {
  const select = els.subcatFormPadre;
  select.innerHTML = "";

  if (!state.categorias.length) {
    select.innerHTML = `<option value="">Sin categorías disponibles</option>`;
    select.disabled = true;
    return;
  }

  select.disabled = false;

  state.categorias.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.nombre;
    select.appendChild(opt);
  });
}

export function openSubcatPanel(els, { mode, subcat = null }) {
  resetLocalFilters();

  state.editingSubcatId = mode === "edit" && subcat ? subcat.id : null;

  els.panelSubcatFormTitle.textContent =
    mode === "edit" ? "Editar subcategoría" : "Nueva subcategoría";

  fillSubcatPadreSelect(els);
  els.subcatFormPadre.value = subcat?.parent_id || state.selectedCategoriaId || "";
  els.subcatFormNombre.value = subcat?.nombre || "";

  els.btnEliminarSubcat.style.display =
    mode === "edit" ? "inline-flex" : "none";

  openPanel(els, "subcat");
}

export async function handleSaveSubcat(els, API_BASE, restauranteId, reloadCb) {
  const nombre = els.subcatFormNombre.value.trim();
  const parent_id = Number(els.subcatFormPadre.value);

  if (!nombre) return alert("Escribe un nombre para la subcategoría.");
  if (!parent_id) return alert("Selecciona una categoría padre.");

  const id = state.editingSubcatId;
  const data = { nombre, parent_id };

  try {
    await saveSubcategoria(API_BASE, restauranteId, data, id);
    await reloadCb(els);

    closeAllPanels(els);
  } catch (err) {
    alert(err.message || "No se pudo guardar la subcategoría.");
  }
}

export async function handleDeleteSubcat(els, API_BASE, restauranteId, reloadCb) {
  const id = state.editingSubcatId;
  if (!id) return;

  if (!confirm("¿Eliminar esta subcategoría?")) return;

  try {
    await deleteSubcategoria(API_BASE, restauranteId, id);
    await reloadCb(els);

    closeAllPanels(els);
  } catch (err) {
    alert(err.message || "No se pudo eliminar la subcategoría.");
  }
}

// =====================================================
// Panel: Producto
// =====================================================

export function fillProductoSubcatSelect(els, selectedId = null) {
  const select = els.prodFormSubcat;
  select.innerHTML = "";

  if (!state.subcategorias.length) {
    select.innerHTML = `<option value="">No hay subcategorías</option>`;
    select.disabled = true;
    return;
  }

  select.disabled = false;

  state.subcategorias.forEach((sc) => {
    const parentCat = state.categorias.find((c) => c.id === sc.parent_id);
    const opt = document.createElement("option");
    opt.value = sc.id;
    opt.textContent = `[${parentCat?.nombre}] ${sc.nombre}`;
    if (selectedId === sc.id) opt.selected = true;
    select.appendChild(opt);
  });

  if (!selectedId && state.selectedSubcatId) {
    select.value = state.selectedSubcatId;
  }
}

export function openProductoPanel(els, { mode, producto = null }) {
  resetLocalFilters();

  state.editingProductId = mode === "edit" && producto ? producto.id : null;

  els.panelProductoFormTitle.textContent =
    mode === "edit" ? "Editar producto" : "Nuevo producto";

  els.prodFormNombre.value = producto?.nombre || "";
  els.prodFormSku.value = producto?.sku || "";
  els.prodFormPrecio.value = producto?.precio || "";
  els.prodFormDescripcion.value = producto?.descripcion || "";

  fillProductoSubcatSelect(els, producto?.categoria_id || null);

  els.btnEliminarProducto.style.display =
    mode === "edit" ? "inline-flex" : "none";

  openPanel(els, "producto");
}

export async function handleSaveProductoPanel(
  els,
  API_BASE,
  restauranteId,
  { borrador },
  reloadCb
) {
  const nombre = els.prodFormNombre.value.trim();
  const sku = els.prodFormSku.value.trim();
  const precioRaw = els.prodFormPrecio.value;
  const precio = precioRaw ? Number(precioRaw) : null;
  const categoria_id = els.prodFormSubcat.value ? Number(els.prodFormSubcat.value) : null;
  const descripcion = els.prodFormDescripcion.value.trim();

  if (!nombre) return alert("Escribe un nombre para el producto.");
  if (!categoria_id && !borrador) return alert("El producto necesita subcategoría.");
  if (!borrador && (precio === null || isNaN(precio))) {
    return alert("Especifica un precio válido.");
  }

  const data = {
    nombre,
    sku: sku || null,
    precio: precio ?? 0,
    descripcion: descripcion || null,
    categoria_id,
    estatus: borrador ? "inactivo" : "disponible",
  };

  const id = state.editingProductId;

  try {
    await saveProducto(API_BASE, restauranteId, data, id);
    await reloadCb(els);

    closeAllPanels(els);
  } catch (err) {
    alert(err.message || "Error guardando producto.");
  }
}

export async function handleDeleteProductoPanel(
  els,
  API_BASE,
  restauranteId,
  reloadCb
) {
  const id = state.editingProductId;
  if (!id) return;

  if (!confirm("¿Eliminar este producto?")) return;

  try {
    await deleteProducto(API_BASE, restauranteId, id);
    await reloadCb(els);

    closeAllPanels(els);
  } catch {
    alert("No se pudo eliminar el producto.");
  }
}

// =====================================================
// Panel: Mesas
// =====================================================

export function openMesasPanel(els) {
  const mesas =
    typeof state.restaurante?.total_mesas === "number"
      ? state.restaurante.total_mesas
      : Number(state.restaurante?.total_mesas || 0);

  els.mesasFormTotal.value = mesas;
  openPanel(els, "mesas");
}

export async function handleSaveMesasPanel(
  els,
  API_BASE,
  restauranteId,
  reloadRestCb
) {
  const total = Number(els.mesasFormTotal.value || "0");

  if (isNaN(total) || total < 0) return alert("Número de mesas inválido.");

  try {
    await saveMesas(API_BASE, restauranteId, total);
    await reloadRestCb(els);

    closeAllPanels(els);
  } catch {
    alert("No se pudo actualizar las mesas.");
  }
}
