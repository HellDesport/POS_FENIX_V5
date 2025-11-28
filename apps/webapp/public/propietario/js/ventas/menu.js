// public/propietario/js/ventas/menu.js

// =====================================================
// Importar ayudas base
// =====================================================
import { apiFetch, requireAuth } from "../../../assets/js/config.js";


// =====================================================
// Autenticación del propietario
// =====================================================
const currentUser = requireAuth(["PROPIETARIO"]);
if (!currentUser) {
  throw new Error("No hay sesión válida");
}

const propietarioId = currentUser.propietario_id ?? currentUser.id;
const API_BASE = `/propietarios/${propietarioId}/restaurantes`;

let restauranteId = null;


// =====================================================
// Estado global del módulo
// =====================================================
const state = {
  restaurante: null,
  categorias: [],          // categorías raíz
  subcategorias: [],       // subcategorías
  productos: [],           // productos del restaurante

  selectedCategoriaId: null,   // categoría seleccionada
  selectedSubcatId: null,      // subcategoría seleccionada

  showProductosSinAsignar: false, // toggle productos sin subcat
  subcatSearchTerm: "",
  productsSearchTerm: "",

  activePanel: null,           // control de paneles laterales
  editingCategoryId: null,
  editingSubcatId: null,
  editingProductId: null,
};


// =====================================================
// Inicio del módulo al cargar la página
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  const els = cacheElements();   // obtener referencias DOM
  wireUI(els);                   // conectar eventos UI
  initPage(els);                 // cargar datos iniciales
});


// =====================================================
// Cachear elementos del DOM
// =====================================================
function cacheElements() {
  return {
    // HEADER
    restName: document.getElementById("menuRestName"),
    restStatusPill: document.getElementById("restStatusPill"),
    mesasConfigPill: document.getElementById("mesasConfigPill"),
    mesasConfigCount: document.getElementById("mesasConfigCount"),
    btnVolverDashboard: document.getElementById("btnVolverDashboard"),

    // CATEGORÍAS
    btnNuevaCategoria: document.getElementById("btnNuevaCategoria"),
    categoryList: document.getElementById("categoryList"),
    categoryEmpty: document.getElementById("categoryEmpty"),
    tagSubcatsSinAsignar: document.getElementById("tagSubcatsSinAsignar"),

    // SUBCATEGORÍAS
    subcatParentLabel: document.getElementById("subcatParentLabel"),
    subcatSearch: document.getElementById("subcatSearch"),
    btnVerSubcatsSinAsignar: document.getElementById("btnVerSubcatsSinAsignar"),
    subcatList: document.getElementById("subcatList"),
    subcatEmpty: document.getElementById("subcatEmpty"),
    btnNuevaSubcategoria: document.getElementById("btnNuevaSubcategoria"),

    // PRODUCTOS
    productosScopeLabel: document.getElementById("productosScopeLabel"),
    btnNuevoProducto: document.getElementById("btnNuevoProducto"),
    tabProductosSubcat: document.querySelector('.products-header-tabs [data-tab="subcat"]'),
    tabProductosSinAsignar: document.getElementById("tabProductosSinAsignar"),
    productsSearch: document.getElementById("productsSearch"),
    productsList: document.getElementById("productsList"),
    productsEmpty: document.getElementById("productsEmpty"),

    // OVERLAY Y PANELES
    sideOverlay: document.getElementById("sideOverlay"),
    panelCategoriaForm: document.getElementById("panelCategoriaForm"),
    panelSubcatForm: document.getElementById("panelSubcatForm"),
    panelProductoForm: document.getElementById("panelProductoForm"),
    panelMesasForm: document.getElementById("panelMesasForm"),

    // PANEL CATEGORÍA
    panelCategoriaFormTitle: document.getElementById("panelCategoriaFormTitle"),
    catFormNombre: document.getElementById("catFormNombre"),
    btnGuardarCategoria: document.getElementById("btnGuardarCategoria"),
    btnEliminarCategoria: document.getElementById("btnEliminarCategoria"),

    // PANEL SUBCATEGORÍA
    panelSubcatFormTitle: document.getElementById("panelSubcatFormTitle"),
    subcatFormPadre: document.getElementById("subcatFormPadre"),
    subcatFormNombre: document.getElementById("subcatFormNombre"),
    btnGuardarSubcat: document.getElementById("btnGuardarSubcat"),
    btnEliminarSubcat: document.getElementById("btnEliminarSubcat"),

    // PANEL PRODUCTO
    panelProductoFormTitle: document.getElementById("panelProductoFormTitle"),
    prodFormNombre: document.getElementById("prodFormNombre"),
    prodFormSku: document.getElementById("prodFormSku"),
    prodFormPrecio: document.getElementById("prodFormPrecio"),
    prodFormSubcat: document.getElementById("prodFormSubcat"),
    prodFormDescripcion: document.getElementById("prodFormDescripcion"),
    prodFormImagen: document.getElementById("prodFormImagen"),
    btnGuardarProducto: document.getElementById("btnGuardarProducto"),
    btnGuardarProductoBorrador: document.getElementById("btnGuardarProductoBorrador"),
    btnEliminarProducto: document.getElementById("btnEliminarProducto"),

    // PANEL MESAS
    mesasFormTotal: document.getElementById("mesasFormTotal"),
    btnGuardarMesas: document.getElementById("btnGuardarMesas"),
  };
}


// =====================================================
// Conectar eventos UI
// =====================================================
function wireUI(els) {
  // Navegar al dashboard
  els.btnVolverDashboard?.addEventListener("click", () => {
    window.location.href = "../home/dashboard.html";
  });

  // Abrir panel mesas
  els.mesasConfigPill?.addEventListener("click", () => {
    openMesasPanel(els);
  });

  // Crear categoría
  els.btnNuevaCategoria?.addEventListener("click", () => {
    openCategoriaPanel(els, { mode: "create" });
  });

  // Crear subcategoría
  els.btnNuevaSubcategoria?.addEventListener("click", () => {
    if (!state.categorias.length) return;
    openSubcatPanel(els, { mode: "create" });
  });

  // Buscar subcategoría
  els.subcatSearch?.addEventListener("input", (e) => {
    state.subcatSearchTerm = e.target.value.toLowerCase().trim();
    renderSubcategorias(els);
  });

  // Crear producto
  els.btnNuevoProducto?.addEventListener("click", () => {
    if (!state.subcategorias.length) {
      alert("Primero crea al menos una subcategoría.");
      return;
    }
    openProductoPanel(els, { mode: "create" });
  });

  // Tabs productos
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

  // Buscar productos
  els.productsSearch?.addEventListener("input", (e) => {
    state.productsSearchTerm = e.target.value.toLowerCase().trim();
    renderProductos(els);
  });


  // =====================================================
  // CLICK EN CATEGORÍAS
  // =====================================================
  els.categoryList.addEventListener("click", (e) => {
    const item = e.target.closest(".categoria-item");
    if (!item) return;

    const id = Number(item.dataset.categoryId);
    if (!id) return;

    const btnEdit = e.target.closest('[data-action="edit-category"]');
    const btnDel  = e.target.closest('[data-action="delete-category"]');

    const categoria = state.categorias.find((c) => c.id === id);
    if (!categoria) return;

    if (btnEdit) {
      e.stopPropagation();
      openCategoriaPanel(els, { mode: "edit", categoria });
      return;
    }

    if (btnDel) {
      e.stopPropagation();
      handleDeleteCategoria(els, id);
      return;
    }

    // Seleccionar la categoría
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
  });


  // =====================================================
  // CLICK EN SUBCATEGORÍAS
  // =====================================================
  els.subcatList?.addEventListener("click", (e) => {
    const item = e.target.closest(".subcategoria-item");
    if (!item) return;

    const id = Number(item.dataset.subcatId);
    if (!id) return;

    const btnMove = e.target.closest('[data-action="move-subcat"]');
    const btnEdit = e.target.closest('[data-action="edit-subcat"]');
    const btnDel  = e.target.closest('[data-action="delete-subcat"]');

    const subcat = state.subcategorias.find((s) => s.id === id);
    if (!subcat) return;

    if (btnMove || btnEdit) {
      e.stopPropagation();
      openSubcatPanel(els, { mode: "edit", subcat });
      return;
    }

    if (btnDel) {
      e.stopPropagation();
      handleDeleteSubcat(els, id);
      return;
    }

    // Seleccionar subcategoría
    state.selectedSubcatId = id;
    state.showProductosSinAsignar = false;

    renderSubcategorias(els);
    renderProductos(els);
    updateProductosScopeLabel(els);
    updateProductosTabsUI(els);
  });


  // =====================================================
  // CLICK EN PRODUCTOS (Ver/editar)
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
  // OVERLAY: cerrar paneles
  // =====================================================
  els.sideOverlay?.addEventListener("click", () => {
    closeAllPanels(els);
  });

  // Botones cerrar panel
  document.querySelectorAll("[data-close-panel]").forEach((btn) => {
    btn.addEventListener("click", () => closeAllPanels(els));
  });


  // =====================================================
  // Botones dentro de paneles
  // =====================================================

  // Categoría
  els.btnGuardarCategoria?.addEventListener("click", (e) => {
    e.preventDefault();
    handleSaveCategoria(els);
  });

  els.btnEliminarCategoria?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!state.editingCategoryId) return;
    handleDeleteCategoria(els, state.editingCategoryId);
  });

  // Subcategoría
  els.btnGuardarSubcat?.addEventListener("click", (e) => {
    e.preventDefault();
    handleSaveSubcat(els);
  });

  els.btnEliminarSubcat?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!state.editingSubcatId) return;
    handleDeleteSubcat(els, state.editingSubcatId);
  });

  // Producto
  els.btnGuardarProducto?.addEventListener("click", (e) => {
    e.preventDefault();
    handleSaveProducto(els, { borrador: false });
  });

  els.btnGuardarProductoBorrador?.addEventListener("click", (e) => {
    e.preventDefault();
    handleSaveProducto(els, { borrador: true });
  });

  els.btnEliminarProducto?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!state.editingProductId) return;
    handleDeleteProducto(els, state.editingProductId);
  });

  // Mesas
  els.btnGuardarMesas?.addEventListener("click", (e) => {
    e.preventDefault();
    handleSaveMesas(els);
  });

  updateProductosTabsUI(els);
}


// =====================================================
// Carga inicial del restaurante, categorías y productos
// =====================================================
async function initPage(els) {
  await loadRestaurante(els);
  await loadCategoriasSubcatsProductos(els);

  if (state.categorias.length > 0) {
    const primera = state.categorias[0];
    state.selectedCategoriaId = primera.id;

    const subs = state.subcategorias.filter((s) => s.parent_id === primera.id);
    state.selectedSubcatId = subs.length ? subs[0].id : null;
  }

  renderCategorias(els);
  renderSubcategorias(els);
  renderProductos(els);
  updateSubcatParentLabel(els);
  updateProductosScopeLabel(els);
  updateSubcatButtonState(els);
}


// =====================================================
// Cargar restaurante desde API
// =====================================================
async function loadRestaurante(els) {
  try {
    const res = await apiFetch(`${API_BASE}`, { method: "GET" });
    if (!res || !res.ok) return;

    const data = await res.json();
    let rest = null;

    if (Array.isArray(data) && data.length > 0) rest = data[0];
    else if (data?.data?.length > 0) rest = data.data[0];
    else if (data?.restaurante) rest = data.restaurante;
    else if (data?.id) rest = data;

    if (!rest) return;

    restauranteId = rest.id;
    state.restaurante = rest;

    if (els.restName) els.restName.textContent = rest.nombre || "";

    if (els.mesasConfigCount) {
      const total = Number(rest.total_mesas || 0);
      els.mesasConfigCount.textContent = total;
    }

    if (els.restStatusPill) {
      const est = (rest.estatus || "").toLowerCase();
      els.restStatusPill.textContent =
        est === "activo" ? "Restaurante ACTIVO" : "Restaurante INACTIVO";
    }
  } catch (err) {
    console.error("[menu.js] No se pudo cargar restaurante:", err);
  }
}


// =====================================================
// Cargar categorías, subcategorías y productos desde API
// =====================================================
async function loadCategoriasSubcatsProductos(els) {
  if (!restauranteId) return;

  try {
    const [catsRes, prodsRes] = await Promise.all([
      apiFetch(`${API_BASE}/${restauranteId}/categorias?incluyeInactivas=1`),
      apiFetch(`${API_BASE}/${restauranteId}/productos`),
    ]);

    if (!catsRes.ok || !prodsRes.ok) return;

    const catsData = await catsRes.json();
    const prodsData = await prodsRes.json();

    // Normalizar categorías
    const receivedCats = Array.isArray(catsData.data)
      ? catsData.data
      : catsData;

    const allCats = receivedCats.map((c) => ({
      ...c,
      id: Number(c.id),
      parent_id: c.parent_id == null ? null : Number(c.parent_id),
    }));

    state.categorias = allCats.filter((c) => c.parent_id === null);
    state.subcategorias = allCats.filter((c) => c.parent_id !== null);

    // Normalizar productos
    const receivedProds = Array.isArray(prodsData.data)
      ? prodsData.data
      : prodsData.productos || prodsData;

    state.productos = receivedProds.map((p) => ({
      ...p,
      categoria_id:
        p.categoria_id == null || p.categoria_id === ""
          ? null
          : Number(p.categoria_id),
    }));

    updateEmptyStates(els);
    updateSubcatButtonState(els);
  } catch (err) {
    console.error("[menu.js] Error cargando datos:", err);
  }
}


// =====================================================
// Paneles laterales: abrir/cerrar
// =====================================================
function openPanel(els, name) {
  state.activePanel = name;

  els.sideOverlay.hidden = false;

  els.panelCategoriaForm.hidden = name !== "categoria";
  els.panelSubcatForm.hidden = name !== "subcat";
  els.panelProductoForm.hidden = name !== "producto";
  els.panelMesasForm.hidden = name !== "mesas";
}

function closeAllPanels(els) {
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
// Panel categoría: abrir / guardar / eliminar
// =====================================================
function openCategoriaPanel(els, { mode, categoria }) {
  state.editingCategoryId = mode === "edit" ? categoria.id : null;

  els.panelCategoriaFormTitle.textContent =
    mode === "edit" ? "Editar categoría" : "Nueva categoría";

  els.catFormNombre.value = categoria?.nombre || "";
  els.btnEliminarCategoria.style.display = mode === "edit" ? "inline-flex" : "none";

  openPanel(els, "categoria");
}

async function handleSaveCategoria(els) {
  const nombre = els.catFormNombre.value.trim();
  if (!nombre) return alert("Escribe un nombre.");

  const isEdit = !!state.editingCategoryId;
  const url = isEdit
    ? `${API_BASE}/${restauranteId}/categorias/${state.editingCategoryId}`
    : `${API_BASE}/${restauranteId}/categorias`;

  const body = { nombre, parent_id: null };

  try {
    const res = await apiFetch(url, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(body) });
    if (!res.ok) throw new Error();

    await loadCategoriasSubcatsProductos(els);

    renderCategorias(els);
    renderSubcategorias(els);
    renderProductos(els);
    updateSubcatParentLabel(els);
    updateProductosScopeLabel(els);

    closeAllPanels(els);
  } catch {
    alert("No se pudo guardar.");
  }
}

async function handleDeleteCategoria(els, id) {
  if (!confirm("¿Eliminar categoría?")) return;

  const url = `${API_BASE}/${restauranteId}/categorias/${id}`;

  try {
    const res = await apiFetch(url, { method: "DELETE" });
    if (!res.ok) throw new Error();

    await loadCategoriasSubcatsProductos(els);

    renderCategorias(els);
    renderSubcategorias(els);
    renderProductos(els);

    closeAllPanels(els);
  } catch {
    alert("No se pudo eliminar.");
  }
}


// =====================================================
// Panel subcategoría: abrir / guardar / eliminar
// =====================================================
function fillSubcatPadreSelect(els, selectedId) {
  const select = els.subcatFormPadre;
  select.innerHTML = "";

  state.categorias.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.nombre;
    if (selectedId === cat.id) opt.selected = true;
    select.appendChild(opt);
  });
}

function openSubcatPanel(els, { mode, subcat }) {
  state.editingSubcatId = mode === "edit" ? subcat.id : null;

  els.panelSubcatFormTitle.textContent =
    mode === "edit" ? "Editar subcategoría" : "Nueva subcategoría";

  fillSubcatPadreSelect(els, subcat?.parent_id ?? state.selectedCategoriaId);
  els.subcatFormNombre.value = subcat?.nombre || "";

  els.btnEliminarSubcat.style.display = mode === "edit" ? "inline-flex" : "none";

  openPanel(els, "subcat");
}

async function handleSaveSubcat(els) {
  const nombre = els.subcatFormNombre.value.trim();
  const parentId = Number(els.subcatFormPadre.value || 0);

  if (!nombre) return alert("Escribe un nombre.");
  if (!parentId) return alert("Selecciona una categoría padre.");

  const isEdit = !!state.editingSubcatId;
  const url = isEdit
    ? `${API_BASE}/${restauranteId}/categorias/${state.editingSubcatId}`
    : `${API_BASE}/${restauranteId}/categorias`;

  const body = { nombre, parent_id: parentId };

  try {
    const res = await apiFetch(url, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(body) });
    if (!res.ok) throw new Error();

    await loadCategoriasSubcatsProductos(els);

    state.selectedCategoriaId = parentId;

    renderCategorias(els);
    renderSubcategorias(els);
    renderProductos(els);

    closeAllPanels(els);
  } catch {
    alert("No se pudo guardar.");
  }
}

async function handleDeleteSubcat(els, id) {
  if (!confirm("¿Eliminar subcategoría?")) return;

  const url = `${API_BASE}/${restauranteId}/categorias/${id}`;

  try {
    const res = await apiFetch(url, { method: "DELETE" });
    if (!res.ok) throw new Error();

    await loadCategoriasSubcatsProductos(els);
    renderSubcategorias(els);
    renderProductos(els);

    closeAllPanels(els);
  } catch {
    alert("No se pudo eliminar.");
  }
}


// =====================================================
// Panel producto: abrir / guardar / eliminar
// =====================================================
function fillProductoSubcatSelect(els, selectedId) {
  const select = els.prodFormSubcat;
  select.innerHTML = "";

  state.subcategorias.forEach((sc) => {
    const cat = state.categorias.find((c) => c.id === sc.parent_id);
    const opt = document.createElement("option");
    opt.value = sc.id;
    opt.textContent = `[${cat?.nombre}] ${sc.nombre}`;
    if (selectedId === sc.id) opt.selected = true;
    select.appendChild(opt);
  });
}

function openProductoPanel(els, { mode, producto }) {
  state.editingProductId = mode === "edit" ? producto.id : null;

  els.panelProductoFormTitle.textContent =
    mode === "edit" ? "Editar producto" : "Nuevo producto";

  els.prodFormNombre.value = producto?.nombre || "";
  els.prodFormSku.value = producto?.sku || "";
  els.prodFormPrecio.value =
    typeof producto?.precio === "number"
      ? producto.precio.toFixed(2)
      : producto?.precio || "";

  fillProductoSubcatSelect(els, producto?.categoria_id || null);

  els.prodFormDescripcion.value = producto?.descripcion || "";
  els.prodFormImagen.value = "";

  els.btnEliminarProducto.style.display = mode === "edit" ? "inline-flex" : "none";

  openPanel(els, "producto");
}

async function handleSaveProducto(els, { borrador }) {
  const nombre = els.prodFormNombre.value.trim();
  const sku = els.prodFormSku.value.trim();
  const precioRaw = els.prodFormPrecio.value;
  const precio = precioRaw === "" ? null : Number(precioRaw);
  const desc = els.prodFormDescripcion.value;
  const subcatValue = els.prodFormSubcat.value;
  const categoriaId = subcatValue ? Number(subcatValue) : null;

  if (!nombre) return alert("Escribe nombre.");
  if (!categoriaId && !borrador) return alert("El producto necesita subcategoría.");
  if (!borrador && (precio === null || isNaN(precio))) return alert("Especifica un precio.");

  const isEdit = !!state.editingProductId;
  const url = isEdit
    ? `${API_BASE}/${restauranteId}/productos/${state.editingProductId}`
    : `${API_BASE}/${restauranteId}/productos`;

  const body = {
    nombre,
    sku: sku || null,
    precio: precio ?? 0,
    descripcion: desc || null,
    categoria_id: categoriaId,
    estatus: borrador ? "inactivo" : "disponible",
  };

  try {
    const res = await apiFetch(url, {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error();

    await loadCategoriasSubcatsProductos(els);

    state.selectedSubcatId = categoriaId;
    state.showProductosSinAsignar = false;

    renderProductos(els);
    renderSubcategorias(els);

    closeAllPanels(els);
  } catch {
    alert("No se pudo guardar.");
  }
}

async function handleDeleteProducto(els, id) {
  if (!confirm("¿Eliminar producto?")) return;

  try {
    const url = `${API_BASE}/${restauranteId}/productos/${id}`;
    const res = await apiFetch(url, { method: "DELETE" });
    if (!res.ok) throw new Error();

    await loadCategoriasSubcatsProductos(els);
    renderProductos(els);

    closeAllPanels(els);
  } catch {
    alert("No se pudo eliminar.");
  }
}


// =====================================================
// Panel mesas
// =====================================================
function openMesasPanel(els) {
  const totalActual = Number(state.restaurante?.total_mesas || 0);
  els.mesasFormTotal.value = totalActual;
  openPanel(els, "mesas");
}

async function handleSaveMesas(els) {
  const total = Number(els.mesasFormTotal.value);
  if (total < 0) return alert("Número inválido.");

  try {
    const url = `${API_BASE}/${restauranteId}`;
    const body = { total_mesas: total };

    const res = await apiFetch(url, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error();

    await loadRestaurante(els);

    els.mesasConfigCount.textContent = total;

    closeAllPanels(els);
  } catch {
    alert("No se pudo guardar.");
  }
}


// =====================================================
// Renders
// =====================================================
function renderCategorias(els) {
  const list = els.categoryList;
  list.innerHTML = "";

  if (!state.categorias.length) {
    els.categoryEmpty.style.display = "block";
    return;
  }
  els.categoryEmpty.style.display = "none";

  const frag = document.createDocumentFragment();

  state.categorias.forEach((cat) => {
    const li = document.createElement("li");
    li.className = "categoria-item";
    li.dataset.categoryId = cat.id;

    if (cat.id === state.selectedCategoriaId) {
      li.classList.add("active");
    }

    const totalSub = state.subcategorias.filter((s) => s.parent_id === cat.id).length;
    const totalProd = state.productos.filter((p) => {
      const sc = state.subcategorias.find((s) => s.id === p.categoria_id);
      return sc && sc.parent_id === cat.id;
    }).length;

    li.innerHTML = `
      <div class="category-main">
        <div class="category-name">${escapeHtml(cat.nombre)}</div>
        <div class="category-meta">${totalSub} subcategorías · ${totalProd} productos</div>
      </div>
      <div class="category-actions">
        <button class="btn-icon" data-action="edit-category">✎</button>
        <button class="btn-icon" data-action="delete-category">🗑</button>
      </div>
    `;

    frag.appendChild(li);
  });

  list.appendChild(frag);
}

function renderSubcategorias(els) {
  const list = els.subcatList;
  list.innerHTML = "";

  let subcats = state.subcategorias;

  if (state.selectedCategoriaId)
    subcats = subcats.filter((s) => s.parent_id === state.selectedCategoriaId);

  if (state.subcatSearchTerm)
    subcats = subcats.filter((s) =>
      s.nombre.toLowerCase().includes(state.subcatSearchTerm)
    );

  if (!subcats.length) {
    els.subcatEmpty.style.display = "block";
    return;
  }
  els.subcatEmpty.style.display = "none";

  const frag = document.createDocumentFragment();

  subcats.forEach((sc) => {
    const totalProd = state.productos.filter((p) => p.categoria_id === sc.id).length;

    const catName = state.categorias.find((c) => c.id === sc.parent_id)?.nombre || "—";

    const li = document.createElement("li");
    li.className = "subcategoria-item";
    li.dataset.subcatId = sc.id;

    if (sc.id === state.selectedSubcatId) li.classList.add("active");

    li.innerHTML = `
      <div class="subcat-main">
        <div class="subcat-name">${escapeHtml(sc.nombre)}</div>
        <div class="subcat-meta">${totalProd} productos · Categoría: ${escapeHtml(catName)}</div>
      </div>
      <div class="subcat-actions">
        <button class="btn-icon" data-action="move-subcat">⇄</button>
        <button class="btn-icon" data-action="edit-subcat">✎</button>
        <button class="btn-icon" data-action="delete-subcat">🗑</button>
      </div>
    `;

    frag.appendChild(li);
  });

  list.appendChild(frag);
}

function renderProductos(els) {
  const list = els.productsList;
  list.innerHTML = "";

  let productos = state.productos;

  if (state.showProductosSinAsignar) {
    productos = productos.filter((p) => p.categoria_id == null);
  } else {
    productos = productos.filter(
      (p) => p.categoria_id === state.selectedSubcatId
    );
  }

  if (!productos.length) {
    els.productsEmpty.style.display = "block";
    return;
  }
  els.productsEmpty.style.display = "none";

  const frag = document.createDocumentFragment();

  productos.forEach((p) => {
    const badgeClass = getStatusBadgeClass(p.estatus);
    const precio =
      typeof p.precio === "number" ? p.precio.toFixed(2) : "0.00";

    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = p.id;

    card.innerHTML = `
      <div class="product-thumb">
        <div class="no-image-placeholder"></div>
      </div>
      <div class="product-info">
        <div class="product-name">${escapeHtml(p.nombre)}</div>
        <div class="product-subinfo">SKU: ${escapeHtml(p.sku || "SIN-SKU")}</div>

        <div class="product-bottom-row">
          <div class="product-price">$${precio}</div>
          <div class="product-meta-actions">
            <span class="product-status-badge ${badgeClass}">
              ${formatStatusLabel(p.estatus)}
            </span>
            <button class="btn btn-ghost btn-sm" data-action="view-product">Ver</button>
          </div>
        </div>
      </div>
    `;

    frag.appendChild(card);
  });

  list.appendChild(frag);
}


// =====================================================
// UI helpers
// =====================================================
function updateProductosTabsUI(els) {
  els.tabProductosSubcat.classList.toggle("active", !state.showProductosSinAsignar);
  els.tabProductosSinAsignar.classList.toggle("active", state.showProductosSinAsignar);
}

function updateSubcatParentLabel(els) {
  const cat = state.categorias.find((c) => c.id === state.selectedCategoriaId);
  els.subcatParentLabel.textContent = cat ? `de “${cat.nombre}”` : "";
}

function updateProductosScopeLabel(els) {
  if (state.showProductosSinAsignar) {
    els.productosScopeLabel.textContent = "sin subcategoría";
    return;
  }

  const sub = state.subcategorias.find((s) => s.id === state.selectedSubcatId);
  els.productosScopeLabel.textContent = sub ? `en “${sub.nombre}”` : "";
}

function updateEmptyStates(els) {
  els.categoryEmpty.style.display = state.categorias.length ? "none" : "block";
  els.subcatEmpty.style.display = state.subcategorias.length ? "none" : "block";
  els.productsEmpty.style.display = state.productos.length ? "none" : "block";
}

function updateSubcatButtonState(els) {
  els.btnNuevaSubcategoria.disabled = !state.categorias.length;
}


// =====================================================
// Helpers varios
// =====================================================
function getStatusBadgeClass(estatus) {
  switch ((estatus || "").toLowerCase()) {
    case "disponible": return "status-disponible";
    case "agotado": return "status-agotado";
    default: return "status-inactivo";
  }
}

function formatStatusLabel(estatus) {
  const e = (estatus || "").toLowerCase();
  if (e === "disponible") return "Disponible";
  if (e === "agotado") return "Agotado";
  if (e === "inactivo") return "Inactivo";
  return "Desconocido";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================================
// Inicio real del archivo
// =====================================================
(async function main() {
  console.log(">>> MENU.JS INICIANDO <<<");

  const els = cacheElements();
  window._els = els;  // debugging opcional

  await loadRestaurante(els);

  console.log(">>> MENU.JS LISTO <<<");
})();
