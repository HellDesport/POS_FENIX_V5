// apps/backend/src/modules/propietario/restaurante/producto/producto.repo.js
import { pool } from "../../../../config/db.js";

// ---------------------------------------------------------
// LISTAR
// ---------------------------------------------------------
export async function list(restauranteId, { categoriaId, estatus, q, limit, offset }) {
  const where = ["p.restaurante_id = ?"];
  const params = [restauranteId];

  // categoriaId: undefined => no filtra; null => IS NULL; number finito => '='
  if (categoriaId !== undefined) {
    if (categoriaId === null) {
      where.push("p.categoria_id IS NULL");
    } else if (typeof categoriaId === "number" && Number.isFinite(categoriaId)) {
      where.push("p.categoria_id = ?");
      params.push(categoriaId);
    }
    // cualquier otro valor se ignora para no romper
  }

  // estatus opcional (normalizado)
  if (estatus) {
    where.push("p.estatus = ?");
    params.push(String(estatus).trim());
  }

  if (q) {
    where.push("(p.nombre LIKE ? OR p.slug LIKE ? OR p.descripcion LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const limitNum  = Number(limit)  > 0 ? Number(limit)  : 100;
  const offsetNum = Number(offset) >= 0 ? Number(offset) : 0;

  const sql = `
    SELECT 
      p.id, p.categoria_id, p.nombre, p.slug, p.descripcion, p.precio, p.estatus,
      p.sku, p.imagen, p.orden, p.created_at, p.updated_at,
      c.nombre AS categoria_nombre
    FROM producto p
    LEFT JOIN categoria_producto c 
      ON c.id = p.categoria_id
     AND c.restaurante_id = p.restaurante_id   -- 🔒 evita fuga cross-restaurante
    WHERE ${where.join(" AND ")}
    ORDER BY p.orden ASC, p.nombre ASC
    LIMIT ${limitNum} OFFSET ${offsetNum}
  `;

  if (process.env.NODE_ENV !== "production") {
    console.log("[producto.repo] SQL:", sql);
    console.log("[producto.repo] Params:", params);
  }

  const [rows] = await pool.query(sql, params);
  return rows;
}

// ---------------------------------------------------------
// OBTENER POR ID
// ---------------------------------------------------------
export async function getById(restauranteId, id) {
  const [rows] = await pool.query(
    `SELECT 
        p.*, 
        c.nombre AS categoria_nombre
     FROM producto p
     LEFT JOIN categoria_producto c 
       ON c.id = p.categoria_id
      AND c.restaurante_id = p.restaurante_id   -- 🔒
     WHERE p.restaurante_id = ? AND p.id = ?`,
    [restauranteId, id]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------
// CREAR
// ---------------------------------------------------------
export async function create(data) {
  const sql = `
    INSERT INTO producto
      (restaurante_id, categoria_id, nombre, slug, descripcion, sku, imagen,
       precio, estatus, orden)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `;

  // Slug provisional; el trigger lo normaliza/asegura unicidad
  const slug =
    data.slug ||
    (data.nombre ? String(data.nombre).toLowerCase().trim().replace(/\s+/g, "-") : null) ||
    `producto-${Date.now()}`;

  const params = [
    data.restaurante_id,
    data.categoria_id || null,
    data.nombre,
    slug,
    data.descripcion || null,
    data.sku || null,
    data.imagen || null,
    data.precio || 0,
    data.estatus || "disponible",
    data.orden || 0,
  ];

  const [r] = await pool.query(sql, params);
  return r.insertId;
}

// ---------------------------------------------------------
// ACTUALIZAR
// ---------------------------------------------------------
export async function update(id, restauranteId, data) {
  const set = [];
  const params = [];
  const map = {
    categoria_id: "categoria_id",
    nombre: "nombre",
    slug: "slug",
    descripcion: "descripcion",
    sku: "sku",
    imagen: "imagen",
    precio: "precio",
    estatus: "estatus",
    orden: "orden",
  };

  for (const k of Object.keys(map)) {
    if (data[k] !== undefined) {
      set.push(`${map[k]} = ?`);
      params.push(data[k]);
    }
  }

  if (!set.length) return 0;

  params.push(restauranteId, id);
  const [r] = await pool.query(
    `UPDATE producto 
     SET ${set.join(", ")}, updated_at = NOW()
     WHERE restaurante_id = ? AND id = ?`,
    params
  );
  return r.affectedRows;
}

// ---------------------------------------------------------
// CAMBIAR ESTATUS
// ---------------------------------------------------------
export async function changeStatus(id, restauranteId, estatus) {
  const [r] = await pool.query(
    `UPDATE producto 
     SET estatus = ?, updated_at = NOW()
     WHERE restaurante_id = ? AND id = ?`,
    [estatus, restauranteId, id]
  );
  return r.affectedRows;
}

// ---------------------------------------------------------
// ELIMINAR
// ---------------------------------------------------------
export async function remove(id, restauranteId) {
  const [r] = await pool.query(
    `DELETE FROM producto 
     WHERE restaurante_id = ? AND id = ?`,
    [restauranteId, id]
  );
  return r.affectedRows;
}

// ---------------------------------------------------------
// Helper de categoría (solo lectura)
// ---------------------------------------------------------
export async function getCategoriaById(restauranteId, categoriaId) {
  const [rows] = await pool.query(
    `SELECT id, restaurante_id, parent_id
       FROM categoria_producto
      WHERE id = ? AND restaurante_id = ?
      LIMIT 1`,
    [categoriaId, restauranteId]
  );
  return rows[0] || null;
}
