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

      // Filtros internos del POS (si llegas a usarlos)
      if (groupType === "order-status") {
        filterOrders(chip.dataset.status);
      }

      // Método de pago
      if (groupType === "payment") {
        console.log("Método de pago seleccionado:", chip.dataset.method);
      }

      // Filtro sección Pedidos
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
 *  FILTRO "LÍNEA DE PEDIDOS" (por si lo usas después)
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
 *  SISTEMA DE MESAS (DEMO LOCAL)
 ******************************************************************/
let mesaSeleccionada = null;
let contadorPedidos = 1;  // ← AQUÍ VA ESTE NUEVO


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
  mesaSeleccionada = mesa.nombre;

  // Activar encabezado
  document.getElementById("ticketHeader").style.opacity = "1";

  // Mostrar mesa
  document.getElementById("ticketMesa").textContent = mesa.nombre;

  // Asignar nuevo número de pedido virtual
  document.getElementById("ticketCodigo").textContent = "Pedido #" + contadorPedidos;

  // Personas (por ahora lo dejamos fijo en 1)
  document.getElementById("ticketPersonas").textContent = "1";

  showToast(`Mesa seleccionada: ${mesa.nombre}`);
}


/******************************************************************
 *  SISTEMA DE PEDIDOS (SECCIÓN NUEVA, DEMO LOCAL)
 ******************************************************************/
let pedidos = [];

function renderPedidos() {
  const grid = document.getElementById("pedidosGrid");
  if (!grid) return;

  grid.innerHTML = "";

  pedidos.forEach(p => {
    const div = document.createElement("div");
    div.className = "pedido-card";

    const badgeClass =
      p.estado === "waitlist" ? "badge-orange" :
      p.estado === "ready"    ? "badge-purple" :
                                "badge-green";

    const tipoLabel =
      p.tipo === "dinein"   ? "En restaurante" :
      p.tipo === "takeaway" ? "Para llevar" :
                              "A domicilio";

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

function pedidoClick(pedido) {
  const modal = document.getElementById("pedidoDetalle");
  const titulo = document.getElementById("pedidoTitulo");
  const mesa = document.getElementById("pedidoMesa");
  const lista = document.getElementById("pedidoProductos");
  const subtotalEl = document.getElementById("detalleSubtotal");
  const totalEl = document.getElementById("detalleTotal");

  titulo.textContent = `Pedido #${pedido.id}`;
  mesa.textContent = pedido.mesa;

  lista.innerHTML = "";

  let subtotal = 0;

  pedido.productos.forEach(prod => {
    const total = prod.qty * prod.price;
    subtotal += total;

    const li = document.createElement("li");
    li.innerHTML = `
      <span>${prod.qty}x ${prod.name}</span>
      <span>$${total}</span>
    `;
    lista.appendChild(li);
  });

  subtotalEl.textContent = `$${subtotal}`;
  totalEl.textContent = `$${subtotal}`;

  modal.classList.remove("hidden");
}

document.getElementById("cerrarDetalle")
  .addEventListener("click", () => {
    document.getElementById("pedidoDetalle").classList.add("hidden");
  });

function filtrarPedidos(estado) {
  const grid = document.getElementById("pedidosGrid");
  if (!grid) return;
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

    navItems.forEach(n => n.classList.remove("active"));
    item.classList.add("active");

    const texto = item.innerText.trim().toLowerCase();

    if (texto === "mesas") {

      seccionMesas.style.display = "block";
      seccionPedidosPOS.style.display = "none";

      seccionPrincipal.style.display = "none";
      rightColumn.classList.add("hidden");
      seccionPrincipal.classList.add("full-width");

      renderMesas();
      return;
    }

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

/* ================================
 *       SISTEMA DE TICKET
 * ================================*/

let ticket = [];

const orderList = document.getElementById("orderItemsList");
const subtotalElement = document.getElementById("subtotalTicket");
const totalElement = document.getElementById("totalTicket");


// Click en botones + del menú
document.querySelectorAll(".menu-card").forEach(card => {
  const addBtn = card.querySelector(".menu-add");

  addBtn.addEventListener("click", () => {
    const name = card.querySelector("h3").textContent.trim();
    const price = parseFloat(
      card.querySelector(".menu-price").textContent.replace("$", "")
    );

    agregarPlatillo(name, price);
  });
});

function agregarPlatillo(name, price) {
  const existe = ticket.find(item => item.name === name);

  if (existe) {
    existe.qty++;
  } else {
    ticket.push({ name, price, qty: 1 });
  }

  renderTicket();
}

function eliminarPlatillo(name) {
  ticket = ticket.filter(item => item.name !== name);
  renderTicket();
}

function cancelarPedido() {
  ticket = [];
  renderTicket();
}

function renderTicket() {
  orderList.innerHTML = "";

  let subtotal = 0;

  ticket.forEach(item => {
    const itemTotal = item.qty * item.price;
    subtotal += itemTotal;

    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.qty}x ${item.name}</span>
      <span>$${itemTotal}</span>
      <button class="delete-item" style="
        border:none;
        background:none;
        color:#d9534f;
        margin-left:8px;
        cursor:pointer;
        font-size:14px;
      ">✕</button>
    `;

    li.querySelector(".delete-item").addEventListener("click", () => {
      eliminarPlatillo(item.name);
    });

    orderList.appendChild(li);
  });

  // Si no hay productos
  if (ticket.length === 0) {
    subtotalElement.textContent = "$0";
    totalElement.textContent = "$0";
    return;
  }

  subtotalElement.textContent = `$${subtotal}`;
  totalElement.textContent = `$${subtotal}`;
}

/* ================================
 *      ACCIONES TICKET (BOTONES)
 * ================================*/

const btnCancelarTodo = document.getElementById("cancelarTodo");
if (btnCancelarTodo) {
  btnCancelarTodo.addEventListener("click", () => {
    ticket = [];
    renderTicket();
    showToast("Pedido cancelado.");
  });
}

const btnEnviarPedido = document.getElementById("enviarPedido");
if (btnEnviarPedido) {
  btnEnviarPedido.addEventListener("click", () => {
    if (ticket.length === 0) {
      showToast("No hay productos en el pedido.");
      return;
    }

    // Cantidad real de platillos (sumando qty)
    const itemsCount = ticket.reduce((acc, el) => acc + el.qty, 0);

    const nuevoPedido = {
      id: pedidos.length + 1,
      mesa: mesaSeleccionada || "Sin mesa",
      items: itemsCount,
      tiempo: "Hace 0 min",
      estado: "waitlist",
      tipo: "dinein",
      productos: ticket.map(p => ({ ...p })) // clon
    };

    pedidos.push(nuevoPedido);

    // Limpiar ticket
    ticket = [];
    renderTicket();

    // Actualizar listado de pedidos
    renderPedidos();
    filtrarPedidos("all");

    showToast("Pedido enviado correctamente.");
  });
}

/* ================================
 *       TOAST SIMPLE (UX)
 * ================================*/

function showToast(msg) {
  const toast = document.createElement("div");
  toast.textContent = msg;

  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.background = "#0f9f9b";
  toast.style.color = "white";
  toast.style.padding = "12px 18px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  toast.style.zIndex = "9999";
  toast.style.opacity = "0";
  toast.style.transition = "opacity .3s";

  document.body.appendChild(toast);

  setTimeout(() => (toast.style.opacity = "1"), 20);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 1800);
}
