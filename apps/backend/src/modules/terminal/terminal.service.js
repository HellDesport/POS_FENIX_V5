import * as terminalRepo from "./terminal.repo.js";

/* ============================================================
   TERMINAL SERVICE
   ============================================================ */

export async function obtenerInfoRestaurante(restauranteId) {
  const info = await terminalRepo.getRestauranteInfo(restauranteId);
  if (!info) throw new Error("Restaurante no encontrado o inactivo");
  return info;
}
