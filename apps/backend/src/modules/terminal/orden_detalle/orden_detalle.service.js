import * as productosRepo from "../productos/productos.repo.js";
import { pool } from "../../../config/db.js";
import * as repo from "./orden_detalle.repo.js";

/* ============================================================
   SERVICE - ORDEN DETALLE (ROL TERMINAL)
   ============================================================ */

/* ============================================================
   LISTAR PRODUCTOS DE UNA ORDEN
   ============================================================ */
export async function listar(ordenId) {
  return await repo.listarPorOrden(ordenId);
}

/* ============================================================
   AGREGAR PRODUCTO A LA ORDEN
   ============================================================ */
export async function agregar(ordenId, producto) {
  const { producto_id, cantidad } = producto;

  if (!producto_id || !cantidad || cantidad <= 0) {
    throw new Error("Datos del producto inválidos");
  }

  // 1) Obtener restaurante asociado a la orden
  const [[ordenInfo]] = await pool.query(
    "SELECT restaurante_id FROM orden WHERE id = ?",
    [ordenId]
  );

  const restauranteId = ordenInfo?.restaurante_id;
  if (!restauranteId) throw new Error("Orden no encontrada");

  // 2) Obtener el producto REAL desde la BD
  const prod = await productosRepo.obtener(restauranteId, producto_id);
  if (!prod) {
    throw new Error("Producto no disponible o no existe");
  }

  // 3) Datos autocompletados
  const nombre = prod.nombre;
  const sku = prod.sku || null;
  const precioUnitario = prod.precio;

  // 4) Insertar detalle REAL
  const detalle = await repo.agregarProducto({
    ordenId,
    productoId: producto_id,
    nombre,
    sku,
    precioUnitario,
    cantidad,
  });

  // 5) Recalcular totales
  const totales = await repo.recalcularTotales(ordenId);

  return { detalle, totales };
}

/* ============================================================
   ACTUALIZAR CANTIDAD
   ============================================================ */
export async function actualizarCantidad(detalleId, cantidad, ordenId) {
  const ok = await repo.actualizarCantidad(detalleId, cantidad);
  if (!ok) throw new Error("No se pudo actualizar la cantidad");

  const totales = await repo.recalcularTotales(ordenId);
  return { detalleId, cantidad, totales };
}

/* ============================================================
   ELIMINAR DETALLE
   ============================================================ */
export async function eliminar(detalleId, ordenId) {
  const ok = await repo.eliminarDetalle(detalleId);
  if (!ok) throw new Error("No se pudo eliminar el producto");

  const totales = await repo.recalcularTotales(ordenId);
  return { detalleId, eliminado: true, totales };
}
