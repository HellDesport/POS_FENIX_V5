import * as repo from "./restaurante.repo.js";

class HttpError extends Error { constructor(status, msg){ super(msg); this.status = status; } }
const toInt = (v, d=0) => Number.isFinite(+v) ? +v : d;

export async function crear(propietarioId, body) {
  const nombre = String(body?.nombre || "").trim();
  if (!nombre) throw new HttpError(400, "El nombre del restaurante es obligatorio.");

  const total = toInt(body.total_mesas, 0);
  if (total < 0 || total > 500) throw new HttpError(400, "total_mesas fuera de rango (0..500).");

  // INSERT restaurante (el trigger creará mesas si total_mesas>0)
  const restauranteId = await repo.crearRestaurante(propietarioId, { ...body, total_mesas: total });

  // Asegurar fila de configuración
  await repo.crearConfigSiNoExiste(restauranteId);

  const restaurante = await repo.getRestaurante(propietarioId, restauranteId);
  const config = await repo.getConfig(restauranteId);

  return { id: restauranteId, restaurante, config_creada: !!config };
}

export async function listar(propietarioId) {
  return repo.listarRestaurantes(propietarioId);
}

export async function actualizar(propietarioId, restauranteId, body) {
  if ("total_mesas" in body) {
    const total = toInt(body.total_mesas, 0);
    if (total < 0 || total > 500) throw new HttpError(400, "total_mesas fuera de rango (0..500).");
    body.total_mesas = total; // el trigger AFTER UPDATE ajusta mesas
  }
  const ok = await repo.actualizarRestaurante(propietarioId, restauranteId, body);
  if (!ok) throw new HttpError(404, "Restaurante no encontrado.");
  return repo.getRestaurante(propietarioId, restauranteId);
}

export async function eliminar(propietarioId, restauranteId) {
  const ok = await repo.eliminarRestaurante(propietarioId, restauranteId);
  if (!ok) throw new HttpError(404, "Restaurante no encontrado.");
  return { ok: true };
}

/* ===== Config ===== */
export async function obtenerConfig(propietarioId, restauranteId) {
  const rest = await repo.getRestaurante(propietarioId, restauranteId);
  if (!rest) throw new HttpError(404, "Restaurante no encontrado.");
  return repo.getConfig(restauranteId);
}

export async function actualizarConfig(propietarioId, restauranteId, body) {
  const rest = await repo.getRestaurante(propietarioId, restauranteId);
  if (!rest) throw new HttpError(404, "Restaurante no encontrado.");
  const ok = await repo.updateConfig(restauranteId, body);
  if (!ok) throw new HttpError(400, "Sin cambios o datos inválidos.");
  return repo.getConfig(restauranteId);
}

/* ===== Mesas ===== */
export async function listarMesas(propietarioId, restauranteId) {
  const rest = await repo.getRestaurante(propietarioId, restauranteId);
  if (!rest) throw new HttpError(404, "Restaurante no encontrado.");
  return repo.listarMesas(restauranteId);
}

export async function actualizarMesa(propietarioId, restauranteId, mesaId, body) {
  const rest = await repo.getRestaurante(propietarioId, restauranteId);
  if (!rest) throw new HttpError(404, "Restaurante no encontrado.");

  if ("capacidad" in body) {
    const cap = toInt(body.capacidad, 4);
    if (cap < 1 || cap > 20) throw new HttpError(400, "capacidad fuera de rango (1..20).");
    body.capacidad = cap;
  }
  if ("visible" in body) body.visible = body.visible ? 1 : 0;
  if ("estatus" in body) {
    const ok = ["libre","ocupada","reservada","bloqueada"].includes(body.estatus);
    if (!ok) throw new HttpError(400, "estatus inválido.");
  }

  const ok = await repo.actualizarMesa(restauranteId, mesaId, body);
  if (!ok) throw new HttpError(404, "Mesa no encontrada.");
  return repo.getMesa(restauranteId, mesaId);
}

export async function sincronizarMesas(propietarioId, restauranteId, total) {
  const rest = await repo.getRestaurante(propietarioId, restauranteId);
  if (!rest) throw new HttpError(404, "Restaurante no encontrado.");
  const n = toInt(total, rest.total_mesas);
  if (n < 0 || n > 500) throw new HttpError(400, "total_mesas fuera de rango (0..500).");
  await repo.crearMesasPorSP(restauranteId, n);
  return repo.listarMesas(restauranteId);
}
