// apps/backend/src/modules/propietario/categoria_producto/categoria_producto.repo.js
import { pool } from "../../../../config/db.js";

/** Listar categorías del restaurante */
export async function findAllByRestaurante({ restauranteId, parentId, incluyeInactivas, q }) {
  console.log(">> [Repo] categorias.list restaurante_id =", restauranteId, { parentId, incluyeInactivas, q });
  const where = ["c.restaurante_id = ?"];
  const params = [restauranteId];

  if (parentId !== undefined) {
    if (parentId === null) where.push("c.parent_id IS NULL");
    else { where.push("c.parent_id = ?"); params.push(parentId); }
  }
  if (!incluyeInactivas) where.push("c.activo = 1");
  if (q) { where.push("(c.nombre LIKE ? OR c.slug LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }

  const sql = `
    SELECT c.id, c.parent_id, c.nombre, c.slug, c.descripcion,
           c.visible, c.activo, c.orden, c.created_at, c.updated_at
    FROM categoria_producto c
    WHERE ${where.join(" AND ")}
    ORDER BY c.orden ASC, c.nombre ASC
  `;
  const [rows] = await pool.query(sql, params);
  console.log(">> [Repo] Filas devueltas:", rows.length);
  return rows;
}

/** Obtener una categoría específica */
export async function getById({ restauranteId, categoriaId }) {
  const [rows] = await pool.query(
    `SELECT id, parent_id, nombre, slug, descripcion, visible, activo, orden, created_at, updated_at
     FROM categoria_producto
     WHERE restaurante_id = ? AND id = ?`,
    [restauranteId, categoriaId]
  );
  return rows[0] || null;
}

/** Crear categoría o subcategoría */
export async function create({ restauranteId, parentId, nombre, descripcion, visible, activo, orden, slug }) {
  const [r] = await pool.query(
    `INSERT INTO categoria_producto
      (restaurante_id, parent_id, nombre, slug, descripcion, visible, activo, orden)
     VALUES (?,?,?,?,?,?,?,?)`,
    [restauranteId, parentId, nombre, slug, descripcion, visible, activo, orden]
  );
  return getById({ restauranteId, categoriaId: r.insertId });
}

/** Actualizar */
export async function update({ restauranteId, categoriaId, changes }) {
  const set = [];
  const params = [];
  const map = {
    parentId: "parent_id",
    nombre: "nombre",
    slug: "slug",
    descripcion: "descripcion",
    visible: "visible",
    activo: "activo",
    orden: "orden",
  };

  for (const k of Object.keys(changes)) {
    if (changes[k] === undefined) continue;
    set.push(`${map[k]} = ?`);
    params.push(changes[k]);
  }
  if (set.length === 0) return getById({ restauranteId, categoriaId });

  params.push(restauranteId, categoriaId);
  const sql = `UPDATE categoria_producto SET ${set.join(", ")}, updated_at = NOW()
               WHERE restaurante_id = ? AND id = ?`;
  const [r] = await pool.query(sql, params);
  if (r.affectedRows === 0) return null;
  return getById({ restauranteId, categoriaId });
}

/** Eliminar (solo una categoría) */
export async function remove({ restauranteId, categoriaId }) {
  const [r] = await pool.query(
    `DELETE FROM categoria_producto WHERE restaurante_id = ? AND id = ?`,
    [restauranteId, categoriaId]
  );
  return r.affectedRows;
}

/** Contar productos en la categoría */
export async function countProductos({ restauranteId, categoriaId }) {
  const [rows] = await pool.query(
    `SELECT COUNT(1) AS n FROM producto WHERE restaurante_id = ? AND categoria_id = ?`,
    [restauranteId, categoriaId]
  );
  return Number(rows[0]?.n || 0);
}

/**
 * Borra el ÁRBOL: la categoría indicada y todos sus descendientes.
 * Afecta productos del árbol antes de borrar categorías:
 *  - hardDeleteProducts=false (default): estatus='inactivo', categoria_id=NULL
 *  - hardDeleteProducts=true: elimina productos del árbol
 */
export async function removeTree({ restauranteId, categoriaId, hardDeleteProducts = false }) {
  const conn = await pool.getConnection();
  try {
    // 1) Construir árbol en JS (sin CTE)
    const root = Number(categoriaId);
    const ids = new Set([root]);
    let frontera = [root];

    while (frontera.length) {
      const placeholders = frontera.map(() => "?").join(",");
      const [rows] = await conn.query(
        `SELECT id
           FROM categoria_producto
          WHERE restaurante_id = ? AND parent_id IN (${placeholders})`,
        [restauranteId, ...frontera]
      );
      const nuevos = [];
      for (const r of rows) {
        if (!ids.has(r.id)) {
          ids.add(r.id);
          nuevos.push(r.id);
        }
      }
      frontera = nuevos;
    }

    const idList = Array.from(ids);
    if (idList.length === 0) return 0;

    await conn.beginTransaction();

    // 2) Afectar productos del árbol
    const inPlaceholders = idList.map(() => "?").join(",");
    if (hardDeleteProducts) {
      await conn.query(
        `DELETE FROM producto
          WHERE restaurante_id = ?
            AND categoria_id IN (${inPlaceholders})`,
        [restauranteId, ...idList]
      );
    } else {
      await conn.query(
        `UPDATE producto
            SET estatus = 'inactivo', categoria_id = NULL
          WHERE restaurante_id = ?
            AND categoria_id IN (${inPlaceholders})`,
        [restauranteId, ...idList]
      );
    }

    // 3) Borrar categorías del árbol
    await conn.query(
      `DELETE FROM categoria_producto
        WHERE restaurante_id = ?
          AND id IN (${inPlaceholders})`,
      [restauranteId, ...idList]
    );

    await conn.commit();
    return idList.length;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
