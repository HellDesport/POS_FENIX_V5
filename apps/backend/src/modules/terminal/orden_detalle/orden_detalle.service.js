import * as repo from "./orden_detalle.repo.js";
import { pool } from "../../../config/db.js";

/* ============================================================
   SERVICE - ORDEN DETALLE (ROL TERMINAL)
   ============================================================ */

export async function listar(ordenId) {
  return await repo.listarPorOrden(ordenId);
}

export async function agregar(ordenId, producto) {
  const { producto_id, producto_nombre, producto_sku, precio_unitario, cantidad } = producto;
  if (!producto_id || !cantidad || cantidad <= 0)
    throw new Error("Datos del producto inválidos");

  const detalle = await repo.agregarProducto({
    ordenId,
    productoId: producto_id,
    nombre: producto_nombre,
    sku: producto_sku || null,
    precioUnitario: precio_unitario,
    cantidad,
  });

  const totales = await repo.recalcularTotales(ordenId);
  return { detalle, totales };
}

export async function actualizarCantidad(detalleId, cantidad, ordenId) {
  const ok = await repo.actualizarCantidad(detalleId, cantidad);
  if (!ok) throw new Error("No se pudo actualizar la cantidad");
  const totales = await repo.recalcularTotales(ordenId);
  return { detalleId, cantidad, totales };
}

export async function eliminar(detalleId, ordenId) {
  const ok = await repo.eliminarDetalle(detalleId);
  if (!ok) throw new Error("No se pudo eliminar el producto");
  const totales = await repo.recalcularTotales(ordenId);
  return { detalleId, eliminado: true, totales };
}
