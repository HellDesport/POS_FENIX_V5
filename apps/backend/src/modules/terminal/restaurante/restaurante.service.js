import * as repo from "./restaurante.repo.js";

/* ============================================================
   SERVICE - RESTAURANTE (ROL TERMINAL)
   ============================================================ */

export async function obtenerConfig(restauranteId) {
  const config = await repo.obtenerConfiguracion(restauranteId);
  if (!config) throw new Error("Configuración no encontrada");
  return config;
}

export async function actualizarConfig(restauranteId, data) {
  const ok = await repo.actualizarConfiguracion(restauranteId, data);
  if (!ok) throw new Error("No se pudo actualizar la configuración");
  return { ok: true, actualizado: true };
}
