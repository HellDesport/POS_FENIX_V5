import * as service from "./empleados.service.js";

// ============================================================
// LISTAR USUARIOS (propietario actual)
// ============================================================
export async function listar(req, res, next) {
  try {
    const propietarioId = req.user.id;
    const restauranteId = req.params.restauranteId;
    const data = await service.listarUsuarios(propietarioId, restauranteId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
// ============================================================
// CREAR NUEVO USUARIO LOCAL
// ============================================================
export async function crear(req, res, next) {
  try {
    const data = await service.crearUsuario(req.user, req.body);
    res.status(201).json({
      ok: true,
      message: "Usuario creado correctamente",
      data,
    });
  } catch (err) {
    next(err); // Se pasa al middleware de errores
  }
}


// ============================================================
// ACTUALIZAR EMPLEADO
// ============================================================
export async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const data = await service.actualizarEmpleado(id, req.body);
    res.json({ ok: true, message: "Empleado actualizado correctamente", data });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// CAMBIAR ESTATUS (activar / desactivar)
// ============================================================
export async function cambiarEstatus(req, res, next) {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    const data = await service.cambiarEstatus(id, activo);
    res.json({ ok: true, message: "Estatus actualizado", data });
  } catch (err) {
    next(err);
  }
}
