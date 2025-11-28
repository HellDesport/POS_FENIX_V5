// =====================================================
// events.js — Eventos de UI (clics, inputs, tabs, paneles)
// =====================================================

import { state } from "./state.js";
import {
  openCategoriaPanel,
  openSubcatPanel,
  openProductoPanel,
  openMesasPanel,
  closeAllPanels,
  handleSaveCategoria,
  handleDeleteCategoria,
  handleSaveSubcat,
  handleDeleteSubcat,
  handleSaveProductoPanel,
  handleDeleteProductoPanel,
  handleSaveMesasPanel,
} from "./panels.js";

import {
  renderCategorias,
  renderSubcategorias,
  renderProductos,
  updateSubcatParentLabel,
  updateProductosScopeLabel,
  updateProductosTabsUI,
  updateEmptyStates
} from "./render.js";


// =====================================================
//   FUNCIÓN PUBLICA AHORA SI CORRECTA
//   — el main.js llama a wireEvents()
//   — coherente con la arquitectura
// =====================================================
export function wireEvents(els, API_BASE, restauranteId, reloadAllCb, reloadRestCb) {

  // ----------------------------
  // Botón: volver dashboard
  // ----------------------------
  els.btnVolverDashboard?.addEventListener("click", () => {
    window.location.href = "../home/dashboard.html";
  });

  // ----------------------------
  // Botón: abrir panel mesas
  // ----------------------------
  els.mesasConfigPill?.addEventListener("click", () => {
    openMesasPanel(els);
  });

  // ----------------------------
  // Botón: nueva categoría
  // ----------------------------
  els.btnNuevaCategoria?.addEventListener("click", () => {
    openCategoriaPanel(els, { mode: "create" });
  });

  // ----------------------------
  // Botón: nueva subcategoría
  // ----------------------------
  els.btnNuevaSubcategoria?.addEventListener("click", () => {
    if (!state.categorias.length) return;
    openSubcatPanel(els, { mode: "create" });
  });


  // ----------------------------
// Botón: nuevo producto
// ----------------------------
els.btnNuevoProducto?.addEventListener("click", () => {
  if (!state.subcategorias.length) {
    alert("Primero crea al menos una subcategoría.");
    return;
  }
  openProductoPanel(els, { mode: "create" });
});

  // ----------------------------
  // Buscar subcategorías
  // ----------------------------
  els.subcatSearch?.addEventListener("input", (e) => {
    state.subcatSearchTerm = e.target.value.toLowerCase().trim();
    renderSubcategorias(els);
  });

  // ----------------------------
  // Tabs: productos asignados / sin categoría
  // ----------------------------
  els.tabProductosSubcat?.addEventListener("click", () => {
    state.showProductosSinAsignar = false;
    updateProductosTabsUI(els);
    renderProductos(els);
  });

  els.tabProductosSinAsignar?.addEventListener("click", () => {
    state.showProductosSinAsignar = true;
    updateProductosTabsUI(els);
    renderProductos(els);
  });

  // ----------------------------
  // Buscar productos
  // ----------------------------
  els.productsSearch?.addEventListener("input", (e) => {
    state.productsSearchTerm = e.target.value.toLowerCase().trim();
    renderProductos(els);
  });

  // =====================================================
  // LISTA: clic en categorías
  // =====================================================
  els.categoryList?.addEventListener("click", (e) => {
    const item = e.target.closest(".categoria-item");
    if (!item) return;

    const id = Number(item.dataset.categoryId);
    if (!id) return;

    const btnEdit = e.target.closest('[data-action="edit-category"]');
    const btnDel  = e.target.closest('[data-action="delete-category"]');

    const categoria = state.categorias.find((c) => c.id === id);
    if (!categoria) return;

    // Editar
    if (btnEdit) {
      e.stopPropagation();
      openCategoriaPanel(els, { mode: "edit", categoria });
      return;
    }

    // Eliminar
    if (btnDel) {
      e.stopPropagation();
      handleDeleteCategoria(els, API_BASE, restauranteId, reloadAllCb);
      return;
    }

    // Seleccionar
    if (state.selectedCategoriaId !== id) {
      state.selectedCategoriaId = id;
      state.showProductosSinAsignar = false;

      const firstSub = state.subcategorias.find((s) => s.parent_id === id);
      state.selectedSubcatId = firstSub ? firstSub.id : null;

      renderCategorias(els);
      renderSubcategorias(els);
      renderProductos(els);
      updateSubcatParentLabel(els);
      updateProductosScopeLabel(els);
      updateProductosTabsUI(els);
    }
  });

  // =====================================================
  // LISTA: clic en subcategorías
  // =====================================================
  els.subcatList?.addEventListener("click", (e) => {
    const item = e.target.closest(".subcategoria-item");
    if (!item) return;

    const id = Number(item.dataset.subcatId);
    const subcat = state.subcategorias.find((s) => s.id === id);
    if (!subcat) return;

    const btnMove = e.target.closest('[data-action="move-subcat"]');
    const btnEdit = e.target.closest('[data-action="edit-subcat"]');
    const btnDel  = e.target.closest('[data-action="delete-subcat"]');

    // Editar o mover
    if (btnMove || btnEdit) {
      e.stopPropagation();
      openSubcatPanel(els, { mode: "edit", subcat });
      return;
    }

    // Eliminar
    if (btnDel) {
      e.stopPropagation();
      handleDeleteSubcat(els, API_BASE, restauranteId, reloadAllCb);
      return;
    }

    // Seleccionar subcategoría
    if (state.selectedSubcatId !== id) {
      state.selectedSubcatId = id;
      state.showProductosSinAsignar = false;

      renderSubcategorias(els);
      renderProductos(els);
      updateProductosScopeLabel(els);
      updateProductosTabsUI(els);
    }
  });

  // =====================================================
  // LISTA: clic en productos (ver / editar)
  // =====================================================
  els.productsList?.addEventListener("click", (e) => {
    const btnView = e.target.closest('[data-action="view-product"]');
    if (!btnView) return;

    const card = btnView.closest(".product-card");
    if (!card) return;

    const id = Number(card.dataset.productId);
    const prod = state.productos.find((p) => p.id === id);
    if (!prod) return;

    openProductoPanel(els, { mode: "edit", producto: prod });
  });

  // =====================================================
  // Cerrar paneles con overlay
  // =====================================================
  els.sideOverlay?.addEventListener("click", () => {
    closeAllPanels(els);
  });

  document.querySelectorAll("[data-close-panel]").forEach((btn) => {
    btn.addEventListener("click", () => closeAllPanels(els));
  });

  // =====================================================
  // Guardar / eliminar CATEGORÍA
  // =====================================================
  els.btnGuardarCategoria?.addEventListener("click", (e) => {
    e.preventDefault();
    handleSaveCategoria(els, API_BASE, restauranteId, reloadAllCb);
  });

  els.btnEliminarCategoria?.addEventListener("click", (e) => {
    e.preventDefault();
    handleDeleteCategoria(els, API_BASE, restauranteId, reloadAllCb);
  });

  // =====================================================
  // Guardar / eliminar SUBCATEGORÍA
  // =====================================================
  els.btnGuardarSubcat?.addEventListener("click", (e) => {
    e.preventDefault();
    handleSaveSubcat(els, API_BASE, restauranteId, reloadAllCb);
  });

  els.btnEliminarSubcat?.addEventListener("click", (e) => {
    e.preventDefault();
    handleDeleteSubcat(els, API_BASE, restauranteId, reloadAllCb);
  });

  // =====================================================
  // Guardar PRODUCTO (normal / borrador / eliminar)
  // =====================================================
  els.btnGuardarProducto?.addEventListener("click", (e) => {
    e.preventDefault();
    handleSaveProductoPanel(els, API_BASE, restauranteId, { borrador: false }, reloadAllCb);
  });

  els.btnGuardarProductoBorrador?.addEventListener("click", (e) => {
    e.preventDefault();
    handleSaveProductoPanel(els, API_BASE, restauranteId, { borrador: true }, reloadAllCb);
  });

  els.btnEliminarProducto?.addEventListener("click", (e) => {
    e.preventDefault();
    handleDeleteProductoPanel(els, API_BASE, restauranteId, reloadAllCb);
  });

  // =====================================================
  // Guardar MESAS
  // =====================================================
  els.btnGuardarMesas?.addEventListener("click", (e) => {
    e.preventDefault();
    handleSaveMesasPanel(els, API_BASE, restauranteId, reloadRestCb);
  });
}
