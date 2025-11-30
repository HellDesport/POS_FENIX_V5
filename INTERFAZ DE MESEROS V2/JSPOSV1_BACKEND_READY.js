/* ============================================================
   POS FÉNIX — Frontend Conectado al Backend v5
   Autor: Hell + GPT
   Modo: usando rutas /api/terminal/* SIN mover nada en backend
   ============================================================ */

/* ============================================================
   API WRAPPER — todas las peticiones en un solo lugar
   ============================================================ */

const API = {
  GET: async (url) => {
    const res = await fetch(`/api/terminal${url}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token") || "",
      },
    });
    if (!res.ok) throw new Error("Error GET " + url);
    return res.json();
  },

  POST: async (url, data = {}) => {
    const res = await fetch(`/api/terminal${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token") || "",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error POST " + url);
    return res.json();
  },

  PUT: async (url, data = {}) => {
    const res = await fetch(`/api/terminal${url}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token") || "",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error PUT " + url);
    return res.json();
  },

  PATCH: async (url, data = {}) => {
    const res = await fetch(`/api/terminal${url}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token") || "",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error PATCH " + url);
    return res.json();
  },

  DELETE: async (url) => {
    const res = await fetch(`/api/terminal${url}`, {
      method: "DELETE",
      headers: {
        Authorization: localStorage.getItem("token") || "",
      }
    });
    if (!res.ok) throw new Error("Error DELETE " + url);
    return res.json();
  }
};

/* ============================================================
   CARGAR MESAS REALES DESDE BACKEND
   ============================================================ */

async function cargarMesas() {
  const res = await API.GET("/mesas");
  const mesas = res.data;

  const grid = document.getElementById("gridMesas");
  grid.innerHTML = "";

  mesas.forEach(mesa => {
    const div = document.createElement("div");
    div.className = "mesa-card";

    div.innerHTML = `
      <div class="mesa-circle estado-${mesa.estatus}">
        ${mesa.id}
      </div>
      <div class="mesa-nombre">${mesa.nombre}</div>
    `;

    div.onclick = () => seleccionarMesa(mesa);
    grid.appendChild(div);
  });
}

function seleccionarMesa(mesa) {
  mesaSeleccionada = mesa.id;

  document.getElementById("ticketHeader").style.opacity = "1";
  document.getElementById("ticketMesa").textContent = mesa.nombre;
  document.getElementById("ticketCodigo").textContent = "Nuevo Pedido";
  document.getElementById("ticketPersonas").textContent = "1";

  showToast(`Mesa seleccionada: ${mesa.nombre}`);
}

/* ============================================================
   CARGAR MENÚ REAL (PRODUCTOS)
   ============================================================ */

async function cargarMenu() {
  const res = await API.GET("/productos"); // necesitas endpoint actual en backend
  const productos = res.data;

  const grid = document.querySelector(".menu-grid");
  grid.innerHTML = "";

  productos.forEach(p => {
    const card = document.createElement("article");
    card.className = "menu-card";
    card.dataset.id = p.id;
    card.dataset.category = p.categoria_slug;

    card.innerHTML = `
      <div class="menu-image"></div>
      <div class="menu-body">
        <span class="menu-tag">${p.categoria_slug}</span>
        <h3>${p.nombre}</h3>
        <div class="menu-footer">
          <span class="menu-price">$${p.precio}</span>
          <button class="menu-add" data-id="${p.id}">+</button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  activarBotonesAgregar();
}

/* ============================================================
   TICKET LOCAL (solo UI)
   ============================================================ */

let ticket = [];

function agregarPlatillo(id) {
  const existe = ticket.find(t => t.id === id);
  if (existe) existe.cantidad++;
  else ticket.push({ id, cantidad: 1 });

  renderTicket();
}

function activarBotonesAgregar() {
  document.querySelectorAll(".menu-add").forEach(btn => {
    btn.onclick = () => agregarPlatillo(Number(btn.dataset.id));
  });
}

function renderTicket() {
  const ul = document.getElementById("orderItemsList");
  ul.innerHTML = "";

  ticket.forEach(item => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span>${item.cantidad}x Prod #${item.id}</span>
      <button class="delete-item">✕</button>
    `;

    li.querySelector(".delete-item").onclick = () => {
      ticket = ticket.filter(t => t.id !== item.id);
      renderTicket();
    };

    ul.appendChild(li);
  });

  document.getElementById("subtotalTicket").textContent = "$—";
  document.getElementById("totalTicket").textContent = "$—";
}

/* ============================================================
   ENVIAR PEDIDO REAL AL BACKEND
   ============================================================ */

async function enviarPedidoBackend() {
  if (ticket.length === 0) return showToast("No hay productos");

  const payload = {
    mesa_id: mesaSeleccionada || null,
    productos: ticket.map(i => ({
      producto_id: i.id,
      cantidad: i.cantidad
    }))
  };

  const r = await API.POST("/ordenes", payload);

  showToast("Pedido enviado");
  ticket = [];
  renderTicket();

  cargarPedidos();
}

/* ============================================================
   CARGAR PEDIDOS REALES
   ============================================================ */

async function cargarPedidos() {
  const res = await API.GET("/ordenes");
  const pedidos = res.data;

  const grid = document.getElementById("pedidosGrid");
  grid.innerHTML = "";

  pedidos.forEach(p => {
    const div = document.createElement("div");
    div.className = "pedido-card";

    div.innerHTML = `
      <div class="pedido-header">Pedido #${p.id}</div>
      <div class="pedido-meta">${p.mesa_nombre || "Sin mesa"}</div>
      <div class="pedido-footer">
        <span>${p.estado}</span>
      </div>
    `;

    grid.appendChild(div);
  });
}

/* ============================================================
   UTILERÍA VISUAL
   ============================================================ */

function showToast(msg) {
  const t = document.createElement("div");

  t.textContent = msg;
  t.style.position = "fixed";
  t.style.bottom = "20px";
  t.style.right = "20px";
  t.style.background = "#0f9f9b";
  t.style.color = "white";
  t.style.padding = "10px 15px";
  t.style.borderRadius = "8px";
  t.style.opacity = "0";
  t.style.transition = "opacity .2s";

  document.body.appendChild(t);
  setTimeout(() => (t.style.opacity = "1"), 20);
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, 1600);
}

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */

window.addEventListener("DOMContentLoaded", async () => {
  await cargarMenu();
  await cargarMesas();
  await cargarPedidos();

  document.getElementById("enviarPedido").onclick = enviarPedidoBackend;
});
document.addEventListener("DOMContentLoaded", () => {

  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  const sections = {
    platillos: document.querySelector(".menu-section").parentElement,
    mesas: document.querySelector(".mesas-section"),
    pedidos: document.querySelector(".pedidos-section")
  };

  function mostrarSeccion(nombre) {
    // ocultar todo
    sections.platillos.style.display = "none";
    sections.mesas.style.display = "none";
    sections.pedidos.style.display = "none";

    // mostrar la correcta
    sections[nombre].style.display = "block";
  }

  // activar navegación
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();

      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");

      const texto = item.textContent.trim().toLowerCase();

      if (texto.includes("platillos")) mostrarSeccion("platillos");
      if (texto.includes("mesas")) mostrarSeccion("mesas");
      if (texto.includes("pedidos")) mostrarSeccion("pedidos");
    });
  });

  // por defecto — PLATILLOS
  mostrarSeccion("platillos");
});