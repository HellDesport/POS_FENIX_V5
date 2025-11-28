// =====================================================
// render.js — Funciones puramente visuales (UI render)
// =====================================================

import { state } from "./state.js";

// =====================================================
// Render: Categorías
// =====================================================
export function renderCategorias(els) {
  const list = els.categoryList;
  if (!list) return;

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
      const sub = state.subcategorias.find((s) => s.id === p.categoria_id);
      return sub && sub.parent_id === cat.id;
    }).length;

    li.innerHTML = `
      <div class="category-main">
        <div class="category-name">${escapeHtml(cat.nombre)}</div>
        <div class="category-meta">
          ${totalSub} subcategorías · ${totalProd} productos
        </div>
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

// =====================================================
// Render: Subcategorías
// =====================================================
export function renderSubcategorias(els) {
  const list = els.subcatList;
  if (!list) return;

  list.innerHTML = "";

  let subcats = state.subcategorias;

  // Filtrar por categoría seleccionada
  if (state.selectedCategoriaId) {
    subcats = subcats.filter((s) => s.parent_id === state.selectedCategoriaId);
  }

  // Modo "sin asignar"
  if (state.showProductosSinAsignar) {
    subcats = []; // no tiene sentido mostrar subcategorías
  }

  // Búsqueda
  if (state.subcatSearchTerm) {
    const term = state.subcatSearchTerm;
    subcats = subcats.filter((s) =>
      (s.nombre || "").toLowerCase().includes(term)
    );
  }

  if (!subcats.length) {
    els.subcatEmpty.style.display = "block";
    return;
  }
  els.subcatEmpty.style.display = "none";

  const frag = document.createDocumentFragment();

  subcats.forEach((sc) => {
    const li = document.createElement("li");
    li.className = "subcategoria-item";
    li.dataset.subcatId = sc.id;

    if (sc.id === state.selectedSubcatId) {
      li.classList.add("active");
    }

    const totalProd = state.productos.filter((p) => p.categoria_id === sc.id).length;
    const catName =
      state.categorias.find((c) => c.id === sc.parent_id)?.nombre ||
      "Sin categoría";

    li.innerHTML = `
      <div class="subcat-main">
        <div class="subcat-name">${escapeHtml(sc.nombre)}</div>
        <div class="subcat-meta">
          ${totalProd} productos · Categoría: ${escapeHtml(catName)}
        </div>
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

// =====================================================
// Render: Productos
// =====================================================
export function renderProductos(els) {
  const list = els.productsList;
  if (!list) return;

  list.innerHTML = "";

  let productos = [...state.productos];

  const selectedSubcat = state.selectedSubcatId
    ? Number(state.selectedSubcatId)
    : null;

  // modo "sin subcategoría"
  if (state.showProductosSinAsignar) {
    productos = productos.filter(
      (p) => p.categoria_id == null || p.categoria_id === ""
    );
  }
  // modo "por subcategoría"
  else if (selectedSubcat > 0) {
    productos = productos.filter((p) => Number(p.categoria_id) === selectedSubcat);
  }
  // inicial sin selección
  else {
    productos = [];
  }

  // búsqueda
  if (state.productsSearchTerm) {
    const q = state.productsSearchTerm;
    productos = productos.filter((p) => {
      const nombre = (p.nombre || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      return nombre.includes(q) || sku.includes(q);
    });
  }

  // --- FIX IMPORTANTE: empty por vista, no por estado global ---
  if (!productos.length) {
    els.productsEmpty.style.display = "block";
    return;
  }
  els.productsEmpty.style.display = "none";

  const frag = document.createDocumentFragment();

  productos.forEach((p) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = p.id;

    const badgeClass = getStatusBadge(p.estatus);
    const precio =
      typeof p.precio === "number" ? p.precio.toFixed(2) : p.precio || "0.00";

    const imgSrc = p.imagen
      ? `/uploads/productos/${encodeURIComponent(p.imagen)}`
      : null;

    card.innerHTML = `
      <div class="product-thumb">
        ${
          imgSrc
            ? `<img src="${imgSrc}" alt="${escapeHtml(
                p.nombre || ""
              )}" onerror="this.style.display='none'; this.closest('.product-thumb').classList.add('no-image');">`
            : `<div class="no-image-placeholder"></div>`
        }
      </div>

      <div class="product-info">
        <div class="product-name">${escapeHtml(p.nombre || "")}</div>
        <div class="product-subinfo">
          SKU: ${escapeHtml(p.sku || "SIN-SKU")}
        </div>

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
// UI Helpers
// =====================================================
export function updateSubcatParentLabel(els) {
  const label = els.subcatParentLabel;
  if (!label) return;

  const cat = state.categorias.find((c) => c.id === state.selectedCategoriaId);
  label.textContent = cat ? `de “${cat.nombre}”` : "";
}

export function updateProductosScopeLabel(els) {
  const label = els.productosScopeLabel;
  if (!label) return;

  if (state.showProductosSinAsignar) {
    label.textContent = "inactivos";
    return;
  }

  const sub = state.subcategorias.find((s) => s.id === state.selectedSubcatId);
  label.textContent = sub ? `en “${sub.nombre}”` : "";
}

export function updateProductosTabsUI(els) {
  if (!els.tabProductosSubcat || !els.tabProductosSinAsignar) return;

  if (state.showProductosSinAsignar) {
    els.tabProductosSubcat.classList.remove("active");
    els.tabProductosSinAsignar.classList.add("active");
  } else {
    els.tabProductosSubcat.classList.add("active");
    els.tabProductosSinAsignar.classList.remove("active");
  }
}

// --- FIX: estado vacío correcto, no global ---
export function updateEmptyStates(els) {
  els.categoryEmpty.style.display = state.categorias.length ? "none" : "block";

  const subDeCategoria = state.subcategorias.filter(
    (s) => s.parent_id === state.selectedCategoriaId
  );
  els.subcatEmpty.style.display = subDeCategoria.length ? "none" : "block";

  els.productsEmpty.style.display = "none"; // se controla en renderProductos()
}

// =====================================================
// Helpers
// =====================================================
function getStatusBadge(status) {
  switch ((status || "").toLowerCase()) {
    case "disponible":
      return "status-disponible";
    case "agotado":
      return "status-agotado";
    default:
      return "status-inactivo";
  }
}

function formatStatusLabel(status) {
  const s = (status || "").toLowerCase();
  if (s === "disponible") return "Disponible";
  if (s === "agotado") return "Agotado";
  if (s === "inactivo") return "Inactivo";
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
