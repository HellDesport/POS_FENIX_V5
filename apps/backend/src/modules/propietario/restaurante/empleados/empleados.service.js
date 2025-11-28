import * as repo from "./empleados.repo.js";

// ============================================================
// LISTAR USUARIOS (por propietario logueado)
// ============================================================
export async function listarUsuarios(propietarioId, restauranteId) {
  return await repo.listarPorPropietario(propietarioId, restauranteId);
}

// ============================================================
// CREAR USUARIO LOCAL
// ============================================================
export async function crearUsuario(user, body) {
  const propietarioId = user.id;
  const { nombre, email, password, rol_local, restaurante_id } = body;

  if (!nombre || !email || !password || !rol_local || !restaurante_id) {
    throw new Error("Faltan datos obligatorios: nombre, email, password, rol_local, restaurante_id.");
  }

  const nuevo = await repo.crearUsuario(propietarioId, {
    nombre,
    email,
    password,
    rol_local,
    restaurante_id,
  });

  return nuevo;
}

export async function actualizarEmpleado(id, body) {
  return await repo.actualizarEmpleado(id, body);
}

export async function cambiarEstatus(id, activo) {
  return await repo.cambiarEstatus(id, activo);
}
