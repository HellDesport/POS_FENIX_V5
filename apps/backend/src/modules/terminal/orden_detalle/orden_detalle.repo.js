import { pool } from "../../../config/db.js";

/* ============================================================
   REPO - ORDEN DETALLE (ROL TERMINAL)
   ============================================================ */

// Listar detalle de una orden
export async function listarPorOrden(ordenId) {
  const [rows] = await pool.query(
    `SELECT 
        d.id,
        d.producto_id,
        d.producto_nombre,
        d.precio_unitario,
        d.cantidad,
        d.importe,
        d.orden
     FROM orden_detalle d
     WHERE d.orden_id = ?
     ORDER BY d.orden ASC`,
    [ordenId]
  );
  return rows;
}

// Agregar producto a una orden
export async function agregarProducto({
  ordenId,
  productoId,
  nombre,
  sku,
  precioUnitario,
  cantidad,
}) {
  const [result] = await pool.query(
    `INSERT INTO orden_detalle 
        (orden_id, producto_id, producto_nombre, producto_sku, precio_unitario, cantidad, importe)
     VALUES (?, ?, ?, ?, ?, ?, ROUND(? * ?, 2))`,
    [ordenId, productoId, nombre, sku, precioUnitario, cantidad, precioUnitario, cantidad]
  );

  const [rows] = await pool.query(
    `SELECT * FROM orden_detalle WHERE id = ?`,
    [result.insertId]
  );
  return rows[0];
}

// Actualizar cantidad
export async function actualizarCantidad(detalleId, cantidad) {
  const [result] = await pool.query(
    `UPDATE orden_detalle
        SET cantidad = ?, importe = ROUND(precio_unitario * ?, 2)
      WHERE id = ?`,
    [cantidad, cantidad, detalleId]
  );
  return result.affectedRows > 0;
}

// Eliminar producto del detalle
export async function eliminarDetalle(detalleId) {
  const [result] = await pool.query(
    `DELETE FROM orden_detalle WHERE id = ?`,
    [detalleId]
  );
  return result.affectedRows > 0;
}

// Recalcular totales de una orden (subtotal, iva, total)
export async function recalcularTotales(ordenId) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(importe), 0) AS subtotal
       FROM orden_detalle
      WHERE orden_id = ?`,
    [ordenId]
  );

  // 🔹 Convertimos a número explícitamente
  const subtotal = parseFloat(rows[0]?.subtotal || 0);
  const iva = parseFloat((subtotal * 0.16).toFixed(2));
  const total = parseFloat((subtotal + iva).toFixed(2));

  await pool.query(
    `UPDATE orden
        SET subtotal = ?, iva = ?, total = ?
      WHERE id = ?`,
    [subtotal, iva, total, ordenId]
  );

  return { subtotal, iva, total };
}