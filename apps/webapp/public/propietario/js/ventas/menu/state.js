// =====================================================
// state.js — Estado global del módulo Menú
// =====================================================

// Estado principal
export const state = {
  restaurante: null,
  restauranteId: null,      // 🔥 NECESARIO: usado por loader, api y events

  categorias: [],           // categorías raíz
  subcategorias: [],        // subcategorías
  productos: [],            // productos

  selectedCategoriaId: null,
  selectedSubcatId: null,

  showProductosSinAsignar: false,

  subcatSearchTerm: "",
  productsSearchTerm: "",

  activePanel: null,
  editingCategoryId: null,
  editingSubcatId: null,
  editingProductId: null,
};


// =====================================================
// Reiniciar estado de edición al cerrar panel
// =====================================================
export function resetEditingState() {
  state.activePanel = null;
  state.editingCategoryId = null;
  state.editingSubcatId = null;
  state.editingProductId = null;
}


// =====================================================
// Selección de categoría
// =====================================================
export function selectCategoria(id) {
  state.selectedCategoriaId = id;
  state.showProductosSinAsignar = false;
}


// =====================================================
// Selección de subcategoría
// =====================================================
export function selectSubcategoria(id) {
  state.selectedSubcatId = id;
  state.showProductosSinAsignar = false;
}


// =====================================================
// Setters organizados (por compatibilidad)
// =====================================================
export function setCategorias(categorias, subcategorias) {
  state.categorias = categorias;
  state.subcategorias = subcategorias;
}

export function setProductos(productos) {
  state.productos = productos;
}

export function setRestaurante(rest) {
  state.restaurante = rest;
  state.restauranteId = rest?.id ?? null;
}


// =====================================================
// Selección automática inicial
// =====================================================
export function autoSelectPrimera() {
  if (!state.categorias.length) {
    state.selectedCategoriaId = null;
    state.selectedSubcatId = null;
    return;
  }

  const cat = state.categorias[0];
  state.selectedCategoriaId = cat.id;

  const subs = state.subcategorias.filter(s => s.parent_id === cat.id);
  state.selectedSubcatId = subs.length ? subs[0].id : null;
}
