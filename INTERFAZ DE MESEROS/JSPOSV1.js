/******************************************************************
 *  CHIPS (Filtros de menú, órdenes y métodos de pago)
 ******************************************************************/
document.querySelectorAll("[data-chip-group]").forEach((group) => {
  const chips = group.querySelectorAll(".chip");

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");

      const groupType = group.getAttribute("data-chip-group");

      // Categorías del menú
      if (groupType === "menu-category") {
        filterMenu(chip.dataset.category);
      }

      // Filtros internos del POS (no son la sección Pedidos)
      if (groupType === "order-status") {
        filterOrders(chip.dataset.status);
      }

      // Método de pago
      if (groupType === "payment") {
        console.log("Método de pago seleccionado:", chip.dataset.method);
      }

      // Filtro de sección Pedidos
      if (groupType === "pedidos-filter") {
        filtrarPedidos(chip.dataset.status);
      }

    });
  });
});

/******************************************************************
 *  FILTRO MENÚ
 ******************************************************************/
function filterMenu(category) {
  const cards = document.querySelectorAll(".menu-card");

  cards.forEach((card) => {
    const cardCategory = card.getAttribute("data-category");

    if (category === "all" || cardCategory === category) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
}

/******************************************************************
 *  FILTRO "LÍNEA DE PEDIDOS" (la sección interna, no la nueva)
 ******************************************************************/
function filterOrders(status) {
  const cards = document.querySelectorAll(".order-card");

  cards.forEach((card) => {
    const cardStatus = card.getAttribute("data-status");

    if (status === "all" || cardStatus === status) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
}

/******************************************************************
 *  BOTONES + (Agregar platillo)
 ******************************************************************/
document.querySelectorAll(".menu-add").forEach((btn) => {
  btn.addEventListener("click", () => {
    alert("Aquí agregarías este plato al pedido actual.");
  });
});

/******************************************************************
 *  SISTEMA DE MESAS
 ******************************************************************/
const mesas = [
  { id: 1, nombre: "Mesa 1", estado: "libre" },
  { id: 2, nombre: "Mesa 2", estado: "ocupada" },
  { id: 3, nombre: "Mesa 3", estado: "reservada" },
  { id: 4, nombre: "Mesa 4", estado: "libre" },
  { id: 5, nombre: "Mesa 5", estado: "ocupada" },
  { id: 6, nombre: "Mesa 6", estado: "libre" },
  { id: 7, nombre: "Mesa 7", estado: "ocupada" },
  { id: 8, nombre: "Mesa 8", estado: "libre" },
  { id: 9, nombre: "Mesa 9", estado: "reservada" },
  { id: 10, nombre: "Mesa 10", estado: "libre" },
  { id: 11, nombre: "Mesa 11", estado: "ocupada" },
  { id: 12, nombre: "Mesa 12", estado: "reservada" }
];

function renderMesas() {
  const grid = document.getElementById("gridMesas");
  if (!grid) return;

  grid.innerHTML = "";

  mesas.forEach(mesa => {
    const div = document.createElement("div");
    div.className = "mesa-card";

    div.innerHTML = `
      <div class="mesa-circle estado-${mesa.estado}">
        ${mesa.id}
      </div>
      <div class="mesa-nombre">${mesa.nombre}</div>
    `;

    div.addEventListener("click", () => mesaClick(mesa));
    grid.appendChild(div);
  });
}

function mesaClick(mesa) {
  alert(`Seleccionaste la ${mesa.nombre} (${mesa.estado.toUpperCase()})`);
}

/******************************************************************
 *  SISTEMA DE PEDIDOS (SECCIÓN NUEVA)
 ******************************************************************/
const pedidos = [
  { id: 1, mesa: "Mesa 1", items: 8, tiempo: "Hace 2 min", estado: "waitlist", tipo: "dinein" },
  { id: 2, mesa: "Mesa 2", items: 3, tiempo: "Hace 5 min", estado: "ready", tipo: "dinein" },
  { id: 3, mesa: "Para llevar", items: 2, tiempo: "Hace 12 min", estado: "waitlist", tipo: "takeaway" },
  { id: 4, mesa: "Mesa 4", items: 4, tiempo: "Hace 25 min", estado: "ready", tipo: "dinein" },
  { id: 5, mesa: "Domicilio", items: 6, tiempo: "Hace 1 min", estado: "served", tipo: "delivery" }
];


function renderPedidos() {
  const grid = document.getElementById("pedidosGrid");
  if (!grid) return;

  grid.innerHTML = "";

  pedidos.forEach(p => {
    const div = document.createElement("div");
    div.className = "pedido-card";

    // Badge según estado
    const badgeClass =
      p.estado === "waitlist" ? "badge-orange" :
      p.estado === "ready"    ? "badge-purple" :
                                "badge-green";

    // Tipo de servicio (texto visible)
    const tipoLabel =
      p.tipo === "dinein"   ? "En restaurante" :
      p.tipo === "takeaway" ? "Para llevar" :
                              "A domicilio";

    // HTML del pedido
    div.innerHTML = `
      <div class="pedido-header">Pedido #${p.id}</div>

      <div class="pedido-meta">${p.mesa} • ${p.items} platillos</div>

      <div class="pedido-tipo">${tipoLabel}</div>

      <div class="pedido-footer">
        <span>${p.tiempo}</span>
        <span class="${badgeClass}">
          ${p.estado === "waitlist" ? "En espera" :
            p.estado === "ready"   ? "Listo" :
                                     "Servido"}
        </span>
      </div>
    `;

    div.addEventListener("click", () => pedidoClick(p));
    grid.appendChild(div);
  });
}


function pedidoClick(p) {
  alert("Abrir detalles del Pedido #" + p.id);
}

// Chips de filtros en la sección de pedidos
const chipsPedidos = document.querySelectorAll('[data-chip-group="pedidos-filter"] .chip');

chipsPedidos.forEach(btn => {
  btn.addEventListener("click", () => {
    chipsPedidos.forEach(c => c.classList.remove("active"));
    btn.classList.add("active");

    const estado = btn.dataset.status;
    filtrarPedidos(estado);
  });
});

function filtrarPedidos(estado) {
  const grid = document.getElementById("pedidosGrid");
  const cards = grid.querySelectorAll(".pedido-card");

  pedidos.forEach((p, i) => {
    const estadoPedido = p.estado;
    cards[i].style.display =
      estado === "all" || estadoPedido === estado ? "block" : "none";
  });
}

/******************************************************************
 *  CONTROL DE NAVEGACIÓN (SIDEBAR)
 ******************************************************************/
const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
const seccionPrincipal = document.querySelector(".center-column");
const seccionMesas = document.querySelector(".mesas-section");
const seccionPedidosPOS = document.querySelector(".pedidos-section");
const rightColumn = document.querySelector(".right-column");

navItems.forEach((item) => {
  item.addEventListener("click", () => {

    // Reset visual
    navItems.forEach(n => n.classList.remove("active"));
    item.classList.add("active");

    const texto = item.innerText.trim().toLowerCase();

    /************** VISTA MESAS **************/
    if (texto === "mesas") {

      seccionMesas.style.display = "block";
      seccionPedidosPOS.style.display = "none";

      seccionPrincipal.style.display = "none";
      rightColumn.classList.add("hidden");
      seccionPrincipal.classList.add("full-width");

      renderMesas();
      return;
    }

    /************** VISTA PEDIDOS **************/
    if (texto === "pedidos") {

      seccionPedidosPOS.style.display = "block";
      seccionMesas.style.display = "none";

      seccionPrincipal.style.display = "none";
      rightColumn.classList.add("hidden");
      seccionPrincipal.classList.add("full-width");

      renderPedidos();
      filtrarPedidos("all");
      return;
    }

    /************** VISTA NORMAL (Platillos / Órdenes / Cuentas) **************/
    seccionMesas.style.display = "none";
    seccionPedidosPOS.style.display = "none";

    seccionPrincipal.style.display = "block";
    rightColumn.classList.remove("hidden");
    seccionPrincipal.classList.remove("full-width");
  });
});
/******************************************************************
 *  BUSCADOR GLOBAL DEL MENÚ
 ******************************************************************/
const searchInput = document.querySelector(".search-input");

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const texto = searchInput.value.trim().toLowerCase();
    buscarEnMenu(texto);
  });
}

function buscarEnMenu(texto) {
  const cards = document.querySelectorAll(".menu-card");

  cards.forEach(card => {
    const nombre = card.querySelector("h3").innerText.toLowerCase();
    const tag = card.querySelector(".menu-tag").innerText.toLowerCase();
    const categoria = card.getAttribute("data-category").toLowerCase();

    const coincide =
      nombre.includes(texto) ||
      tag.includes(texto) ||
      categoria.includes(texto);

    card.style.display = coincide ? "" : "none";
  });
}
