// public/propietario/js/restaurante/restaurante.js

import { apiFetch, requireAuth } from "../../../assets/js/config.js";

// === Autenticación / contexto propietario ===
const currentUser = requireAuth(["PROPIETARIO"]);
if (!currentUser) {
  throw new Error("No hay sesión válida");
}

const propietarioId = currentUser.propietario_id ?? currentUser.id;
const API_BASE = `/propietarios/${propietarioId}/restaurantes`;

let restauranteId = null;
let isNewRestaurant = false;

/* =======================
   Bootstrap
   ======================= */

document.addEventListener("DOMContentLoaded", () => {
  const els = cacheElements();
  wireUI(els);

  // Al inicio, bloqueamos el form visualmente hasta saber si hay restaurante
  setFormLock(els, true);
  toggleFormDisabled(els.form, true);

  loadRestaurant(els).catch((err) => {
    console.error(err);
    setStatusMessage(
      els,
      "No se pudo cargar la información del restaurante.",
      true
    );
    toggleFormDisabled(els.form, true);
    setFormLock(els, true);
  });
});

/* =======================
   Cacheo de elementos
   ======================= */

function cacheElements() {
  return {
    // panel estado
    msg: document.getElementById("rest_msg"),
    actions: document.getElementById("rest_actions"),
    btnCrear: document.getElementById("btnCrearRestaurante"),

    // resumen / tarjeta
    resumenSection: document.getElementById("rest_resumen"),
    resumenBtn: document.getElementById("rest_summary_btn"),
    resumenNombre: document.getElementById("rest_resumen_nombre"),

    // menú de opciones
    menuBtn: document.getElementById("rest_menu_btn"),
    menu: document.getElementById("rest_menu"),
    btnEliminar: document.getElementById("rest_btn_eliminar"),

    // modal de confirmación
    confirmOverlay: document.getElementById("rest_confirm"),
    confirmOk: document.getElementById("rest_confirm_ok"),
    confirmCancel: document.getElementById("rest_confirm_cancel"),

    // tarjeta / formulario
    formCard: document.getElementById("rest_form_card"),
    form: document.getElementById("restauranteForm"),
    lockOverlay: document.getElementById("rest_form_lock"),
  };
}

/* =======================
   Wiring de UI
   ======================= */

function wireUI(els) {
  if (!els.form) return;

  // Crear restaurante
  if (els.btnCrear) {
    els.btnCrear.addEventListener("click", () => {
      handleCreateRestaurant(els);
    });
  }

  // Guardar cambios
  els.form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    saveRestaurant(els);
  });

  // Click en la tarjeta resumen → bajar al formulario
  if (els.resumenBtn) {
    els.resumenBtn.addEventListener("click", () => {
      els.formCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // --- Menú de opciones (⋮) ---
  if (els.menuBtn && els.menu) {
    // Abrir/cerrar menú al hacer clic en ⋮
    els.menuBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const shouldOpen = els.menu.hidden;
      toggleSummaryMenu(els, shouldOpen);
    });

    // Evitar que el click dentro del menú cierre inmediatamente por el handler global
    els.menu.addEventListener("click", (ev) => {
      ev.stopPropagation();
    });

    // Cerrar al hacer clic fuera
    document.addEventListener("click", () => {
      if (!els.menu.hidden) toggleSummaryMenu(els, false);
    });
  }

  // Botón "Eliminar restaurante" dentro del menú
  if (els.btnEliminar) {
    els.btnEliminar.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      toggleSummaryMenu(els, false);
      await handleDeleteRestaurant(els);
    });
  }
}

/* =======================
   Helpers UI
   ======================= */

function setStatusMessage(els, text, isError = false) {
  if (!els.msg) return;
  els.msg.textContent = text;
  els.msg.classList.toggle("text-error", isError);
}

function toggleFormDisabled(form, disabled) {
  if (!form) return;
  const elements = Array.from(form.elements);
  for (const el of elements) {
    if (!el || el.tagName === "FIELDSET") continue;
    if (el.id === "btnGuardarRestaurante") continue;
    el.disabled = disabled;
  }
}

// Mostrar / ocultar menú contextual
function toggleSummaryMenu(els, open) {
  if (!els.menu) return;
  els.menu.hidden = !open;
}

// Bloqueo borroso sobre el formulario
function setFormLock(els, locked) {
  if (!els.lockOverlay) return;
  els.lockOverlay.hidden = !locked;
}

/* Modal custom de confirmación para eliminar */
function askDeleteConfirm(els) {
  // fallback por si algo falla: confirm nativo
  if (!els.confirmOverlay || !els.confirmOk || !els.confirmCancel) {
    const ok = window.confirm(
      "¿Eliminar este restaurante? Esta acción no se puede deshacer."
    );
    return Promise.resolve(ok);
  }

  return new Promise((resolve) => {
    const overlay = els.confirmOverlay;
    const btnOk = els.confirmOk;
    const btnCancel = els.confirmCancel;

    const cleanup = () => {
      overlay.hidden = true;
      btnOk.removeEventListener("click", onOk);
      btnCancel.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onOverlayClick);
    };

    const onOk = () => {
      cleanup();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    const onOverlayClick = (ev) => {
      // click fuera del cuadro => cancelar
      if (ev.target === overlay) {
        cleanup();
        resolve(false);
      }
    };

    btnOk.addEventListener("click", onOk);
    btnCancel.addEventListener("click", onCancel);
    overlay.addEventListener("click", onOverlayClick);

    overlay.hidden = false;
  });
}

// Normaliza lo que devuelve el backend para quedarnos con UN restaurante
function normalizeRestaurantePayload(payload) {
  if (!payload) return null;

  // Si viene en { data: ... }
  let r = payload.data ?? payload;

  // Si es un array (ej. [ {...} ] o { data: [ {...} ] }) tomamos el primero
  if (Array.isArray(r)) {
    r = r[0] ?? null;
  }

  return r || null;
}
/* =======================
   Carga inicial
   ======================= */

async function loadRestaurant(els) {
  setStatusMessage(els, "Cargando información del restaurante…");

  const res = await apiFetch(`${API_BASE}`, { method: "GET" });

  if (!res) return;

  if (res.status === 404) {
    showEmptyState(els, "none");
    return;
  }

  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status}`);
  }

  const payload = await res.json();
  const restaurante = normalizeRestaurantePayload(payload);

  if (!restaurante) {
    // sin restaurante para este propietario
    showEmptyState(els, "none");
    return;
  }

  restauranteId = restaurante.id;
  isNewRestaurant = false;

  toggleFormDisabled(els.form, false);
  setFormLock(els, false);
  fillFormFromData(els.form, restaurante);
  updateSummary(els, restaurante);

  if (els.resumenSection) els.resumenSection.hidden = false;
  if (els.actions) els.actions.style.display = "none";

  setStatusMessage(
    els,
    "Restaurante configurado. Puedes editar los datos en el formulario."
  );
}

/* =======================
   Estado vacío (sin restaurante)
   ======================= */

function showEmptyState(els, reason = "none") {
  restauranteId = null;
  isNewRestaurant = true;

  if (els.resumenSection) els.resumenSection.hidden = true;
  if (els.actions) els.actions.style.display = "flex";
  if (els.btnCrear) els.btnCrear.disabled = false;

  if (els.form) els.form.reset();
  toggleFormDisabled(els.form, true);
  setFormLock(els, true);

  const msg =
    reason === "deleted"
      ? "Restaurante eliminado. Puedes crear uno nuevo cuando lo necesites."
      : "Sin restaurantes creados. Crea el primero para comenzar.";

  setStatusMessage(els, msg, false);
}

/* =======================
   Crear restaurante
   ======================= */

async function handleCreateRestaurant(els) {
  if (!els.btnCrear) return;

  els.btnCrear.disabled = true;
  setStatusMessage(els, "Creando restaurante…");

  try {
    const body = {
      nombre: "Nuevo restaurante",
      pais: "México",
      moneda: "MXN",
      impuesto_modo: "INCLUIDO",
      timezone: "America/Mexico_City",
    };

    const res = await apiFetch(`${API_BASE}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res || !res.ok) {
      throw new Error(`Error HTTP ${res?.status}`);
    }

    const payload = await res.json();
    const restaurante = normalizeRestaurantePayload(payload);

    restauranteId = restaurante.id;
    isNewRestaurant = false;

    toggleFormDisabled(els.form, false);
    setFormLock(els, false);
    fillFormFromData(els.form, restaurante);
    updateSummary(els, restaurante);

    if (els.resumenSection) els.resumenSection.hidden = false;
    if (els.actions) els.actions.style.display = "none";

    setStatusMessage(
      els,
      "Restaurante creado. Completa la información y guarda los cambios."
    );
  } catch (err) {
    console.error(err);
    els.btnCrear.disabled = false;
    setStatusMessage(
      els,
      "No se pudo crear el restaurante. Intenta de nuevo.",
      true
    );
  }
}

/* =======================
   Eliminar restaurante
   ======================= */

async function handleDeleteRestaurant(els) {
  if (!restauranteId) return;

  const ok = await askDeleteConfirm(els);
  if (!ok) return;

  try {
    const res = await apiFetch(`${API_BASE}/${restauranteId}`, {
      method: "DELETE",
    });

    if (!res || !res.ok) {
      throw new Error(`Error HTTP ${res?.status}`);
    }

    showEmptyState(els, "deleted");
  } catch (err) {
    console.error(err);
    setStatusMessage(
      els,
      "No se pudo eliminar el restaurante. Inténtalo de nuevo.",
      true
    );
  }
}

/* =======================
   Guardar (crear/actualizar)
   ======================= */

async function saveRestaurant(els) {
  const data = serializeForm(els.form);

  setStatusMessage(els, "Guardando cambios…");

  const isUpdate = !!restauranteId;
  const method = isUpdate ? "PUT" : "POST";
  const url = isUpdate ? `${API_BASE}/${restauranteId}` : `${API_BASE}`;

  try {
    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(data),
    });

    if (!res || !res.ok) {
      throw new Error(`Error HTTP ${res?.status}`);
    }

    const payload = await res.json();
    const restaurante = normalizeRestaurantePayload(payload);

    restauranteId = restaurante.id;
    isNewRestaurant = false;

    updateSummary(els, restaurante);

    setFormLock(els, false);
    toggleFormDisabled(els.form, false);
    setStatusMessage(els, "Cambios guardados correctamente.");
  } catch (err) {
    console.error(err);
    setStatusMessage(
      els,
      "Ocurrió un error al guardar los cambios.",
      true
    );
  }
}

/* =======================
   Mapeo data ⇆ formulario
   ======================= */

function fillFormFromData(form, r) {
  if (!form) return;

  // Datos del restaurante
  form.nombre.value = r.nombre ?? "";
  form.estatus.value = r.estatus ?? "activo";
  form.max_sesiones.value = r.max_sesiones ?? "";
  form.total_mesas.value = r.total_mesas ?? "";
  form.timezone.value = r.timezone ?? "America/Mexico_City";

  // Dirección
  form.calle.value = r.calle ?? "";
  form.numero_ext.value = r.numero_ext ?? "";
  form.numero_int.value = r.numero_int ?? "";
  form.colonia.value = r.colonia ?? "";
  form.municipio.value = r.municipio ?? "";
  form.estado.value = r.estado ?? "";
  form.pais.value = r.pais ?? "México";
  form.codigo_postal.value = r.codigo_postal ?? "";
  form.referencia.value = r.referencia ?? "";

  // Impuestos / folios
  form.impuesto_modo.value = r.impuesto_modo ?? "INCLUIDO";
  form.impuesto_tasa.value = r.impuesto_tasa ?? "";
  form.mostrar_desglose_iva_en_ticket.checked =
    !!r.mostrar_desglose_iva_en_ticket;
  form.serie_folio.value = r.serie_folio ?? "";
  form.folio_actual.value = r.folio_actual ?? "";
  form.folio_habilitado.checked = !!r.folio_habilitado;
  form.moneda.value = r.moneda ?? "MXN";
  form.config_status.value = r.config_status ?? "";

  // Impresoras
  form.impresora_terminal.value = r.impresora_terminal ?? "";
  form.impresora_cocina.value = r.impresora_cocina ?? "";
}

function serializeForm(form) {
  const data = new FormData(form);
  const obj = {};

  data.forEach((value, key) => {
    if (value === "") {
      obj[key] = null;
      return;
    }

    if (
      ["max_sesiones", "total_mesas", "impuesto_tasa", "folio_actual"].includes(
        key
      )
    ) {
      obj[key] = Number(value);
    } else {
      obj[key] = value;
    }
  });

  obj.mostrar_desglose_iva_en_ticket =
    form.mostrar_desglose_iva_en_ticket.checked;
  obj.folio_habilitado = form.folio_habilitado.checked;

  return obj;
}

/* =======================
   Tarjeta resumen
   ======================= */

function updateSummary(els, r) {
  if (!els.resumenNombre) return;
  els.resumenNombre.textContent = r.nombre || "Restaurante sin nombre";
}
