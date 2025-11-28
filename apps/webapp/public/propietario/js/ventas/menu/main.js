// =====================================================
// main.js — Punto de arranque del módulo Menú
// =====================================================

import { cacheElements } from "./elements.js";
import { wireEvents } from "./events.js";
import { reloadAll, reloadRestauranteOnly } from "./loader.js";
import { getCurrentUser, getApiBase } from "./api.js";
import { state } from "./state.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log(">>> FÉNIX — MÓDULO MENÚ INICIANDO <<<");

  // 1) Cacheo de elementos
  const els = cacheElements();
  window._els = els;    // debug en consola
  window.state = state; // ⭐ NECESARIO para panels.js

  // 2) Usuario y API_BASE
  const user = getCurrentUser();
  if (!user) {
    console.error("[menu] No hay sesión válida para PROPIETARIO");
    return;
  }

  const propietarioId = user.propietario_id ?? user.id;
  const API_BASE = getApiBase(propietarioId);

  // 3) Cargar datos iniciales (restaurante, categorías, productos)
  await reloadAll(els);

  // 4) Resolver restauranteId desde el estado cargado
  const restauranteId = state.restaurante?.id ?? state.restauranteId ?? null;

  if (!restauranteId) {
    console.warn("[menu] No se pudo determinar restauranteId (¿no hay restaurante creado?).");
  }

  // 5) Registrar eventos con contexto real
  wireEvents(
    els,
    API_BASE,
    restauranteId,
    () => reloadAll(els),
    () => reloadRestauranteOnly(els)
  );

  console.log(">>> FÉNIX — MÓDULO MENÚ LISTO <<<");
});
