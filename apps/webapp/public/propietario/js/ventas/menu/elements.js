// =====================================================
// elements.js — Cacheo de elementos del DOM
// =====================================================

// Acción A: Obtener referencia a cualquier selector
export const $ = (selector) => document.querySelector(selector);

// Acción B: Obtener todos los elementos (NodeList)
export const $$ = (selector) => document.querySelectorAll(selector);

// Acción C: Cacheo principal de TODOS los elementos usados por el menú
export function cacheElements() {
  return {
    // -------- Header
    restName: $("#menuRestName"),
    restStatusPill: $("#restStatusPill"),
    mesasConfigPill: $("#mesasConfigPill"),
    mesasConfigCount: $("#mesasConfigCount"),
    btnVolverDashboard: $("#btnVolverDashboard"),

    // -------- Categorías
    btnNuevaCategoria: $("#btnNuevaCategoria"),
    categoryList: $("#categoryList"),
    categoryEmpty: $("#categoryEmpty"),
    tagSubcatsSinAsignar: $("#tagSubcatsSinAsignar"),

    // -------- Subcategorías
    subcatParentLabel: $("#subcatParentLabel"),
    subcatSearch: $("#subcatSearch"),
    btnVerSubcatsSinAsignar: $("#btnVerSubcatsSinAsignar"),
    subcatList: $("#subcatList"),
    subcatEmpty: $("#subcatEmpty"),
    btnNuevaSubcategoria: $("#btnNuevaSubcategoria"),

    // -------- Productos
    productosScopeLabel: $("#productosScopeLabel"),
    btnNuevoProducto: $("#btnNuevoProducto"),

    tabProductosSubcat: document.querySelector(
      '.products-header-tabs [data-tab="subcat"]'
    ),
    tabProductosSinAsignar: $("#tabProductosSinAsignar"),

    productsSearch: $("#productsSearch"),
    productsList: $("#productsList"),
    productsEmpty: $("#productsEmpty"),

    // -------- Overlay + Paneles laterales
    sideOverlay: $("#sideOverlay"),
    panelCategoriaForm: $("#panelCategoriaForm"),
    panelSubcatForm: $("#panelSubcatForm"),
    panelProductoForm: $("#panelProductoForm"),
    panelMesasForm: $("#panelMesasForm"),

    // -------- Panel Categoría
    panelCategoriaFormTitle: $("#panelCategoriaFormTitle"),
    catFormNombre: $("#catFormNombre"),
    btnGuardarCategoria: $("#btnGuardarCategoria"),
    btnEliminarCategoria: $("#btnEliminarCategoria"),

    // -------- Panel Subcategoría
    panelSubcatFormTitle: $("#panelSubcatFormTitle"),
    subcatFormPadre: $("#subcatFormPadre"),
    subcatFormNombre: $("#subcatFormNombre"),
    btnGuardarSubcat: $("#btnGuardarSubcat"),
    btnEliminarSubcat: $("#btnEliminarSubcat"),

    // -------- Panel Producto
    panelProductoFormTitle: $("#panelProductoFormTitle"),
    prodFormNombre: $("#prodFormNombre"),
    prodFormSku: $("#prodFormSku"),
    prodFormPrecio: $("#prodFormPrecio"),
    prodFormSubcat: $("#prodFormSubcat"),
    prodFormDescripcion: $("#prodFormDescripcion"),
    prodFormImagen: $("#prodFormImagen"),

    btnGuardarProducto: $("#btnGuardarProducto"),
    btnGuardarProductoBorrador: $("#btnGuardarProductoBorrador"),
    btnEliminarProducto: $("#btnEliminarProducto"),

    // -------- Panel Mesas
    mesasFormTotal: $("#mesasFormTotal"),
    btnGuardarMesas: $("#btnGuardarMesas"),
  };
}
