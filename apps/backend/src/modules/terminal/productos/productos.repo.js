// apps/backend/src/modules/terminal/productos/productos.repo.js

import { pool } from "../../../config/db.js";

/* ============================================================
   REPO - PRODUCTOS (ROL TERMINAL)
   ============================================================ */

// ------------------------------------------------------------
// LISTAR PRODUCTOS VISIBLES Y DISPONIBLES
// ------------------------------------------------------------
export async function listar(restauranteId, { categoria_id, q, limit, offset }) {
  const where = [
    "p.restaurante_id = ?",
    "p.estatus = 'disponible'"
  ];
  const params = [restauranteId];

  // Categoría opcional (solo subcategorías)
  if (categoria_id !== undefined && categoria_id !== null) {
    where.push("p.categoria_id = ?");
    params.push(categoria_id);
  }

  // Búsqueda opcional
  if (q) {
    where.push("(p.nombre LIKE ? OR p.slug LIKE ? OR p.descripcion LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const sql = `
    SELECT 
      p.id,
      p.nombre,
      p.descripcion,
      p.precio,
      p.imagen,
      p.categoria_id,
      c.nombre AS categoria_nombre,
      p.sku,
      p.orden,
      p.slug
    FROM producto p
    LEFT JOIN categoria_producto c
      ON c.id = p.categoria_id
     AND c.restaurante_id = p.restaurante_id
    WHERE ${where.join(" AND ")}
    ORDER BY p.orden ASC, p.nombre ASC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

// ------------------------------------------------------------
// OBTENER UN SOLO PRODUCTO
// ------------------------------------------------------------
export async function obtener(restauranteId, productoId) {
  const sql = `
    SELECT 
      p.id,
      p.nombre,
      p.descripcion,
      p.precio,
      p.imagen,
      p.categoria_id,
      c.nombre AS categoria_nombre,
      p.sku,
      p.orden,
      p.slug
    FROM producto p
    LEFT JOIN categoria_producto c
      ON c.id = p.categoria_id
     AND c.restaurante_id = p.restaurante_id
    WHERE 
      p.restaurante_id = ?
      AND p.id = ?
      AND p.estatus = 'disponible'
    LIMIT 1
  `;

  const [rows] = await pool.query(sql, [restauranteId, productoId]);
  return rows[0] || null;
}
