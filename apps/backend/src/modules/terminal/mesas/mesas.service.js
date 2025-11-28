import * as mesasRepo from "./mesas.repo.js";

export async function listarMesas(restauranteId) {
  return await mesasRepo.listarPorRestaurante(restauranteId);
}

export async function obtenerMesa(restauranteId, mesaId) {
  const mesa = await mesasRepo.obtenerPorId(restauranteId, mesaId);
  if (!mesa) throw new Error("Mesa no encontrada");
  return mesa;
}

export async function actualizarEstado(restauranteId, mesaId, estado) {
  const validos = ["libre", "ocupada", "reservada", "bloqueada"];
  if (!validos.includes(estado)) throw new Error("Estado inválido");

  const ok = await mesasRepo.cambiarEstado(restauranteId, mesaId, estado);
  if (!ok) throw new Error("No se pudo actualizar la mesa");
  return { mesaId, estado };
}
