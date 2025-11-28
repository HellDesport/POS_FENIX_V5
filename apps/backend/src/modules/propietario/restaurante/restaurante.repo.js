import { pool } from "../../../config/db.js";


/* =========================
   RESTAURANTE
   ========================= */
export async function crearRestaurante(propietarioId, data) {
  const [r] = await pool.query(
    `INSERT INTO restaurante (
       propietario_id, nombre, calle, numero_ext, numero_int, colonia,
       municipio, estado, pais, codigo_postal, referencia, total_mesas, timezone
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      propietarioId,
      String(data.nombre || "").trim(),
      data.calle ?? null,
      data.numero_ext ?? null,
      data.numero_int ?? null,
      data.colonia ?? null,
      data.municipio ?? null,
      data.estado ?? null,
      data.pais ?? "México",
      data.codigo_postal ?? null,
      data.referencia ?? null,
      Number.isFinite(+data.total_mesas) ? +data.total_mesas : 0,
      data.timezone ?? null,
    ]
  );
  return r.insertId;
}

export async function crearConfigSiNoExiste(restauranteId) {
  // la tabla tiene defaults; con solo restaurante_id alcanza
  await pool.query(
    `INSERT IGNORE INTO restaurante_config (restaurante_id) VALUES (?)`,
    [restauranteId]
  );
}

export async function listarRestaurantes(propietarioId) {
  const [rows] = await pool.query(
    `SELECT id, propietario_id, nombre, slug, estatus, total_mesas,
            created_at, updated_at
       FROM restaurante
      WHERE propietario_id = ?
      ORDER BY id DESC`,
    [propietarioId]
  );
  return rows;
}

export async function getRestaurante(propietarioId, restauranteId) {
  const [rows] = await pool.query(
    `SELECT *
       FROM restaurante
      WHERE propietario_id = ? AND id = ?
      LIMIT 1`,
    [propietarioId, restauranteId]
  );
  return rows[0] || null;
}

export async function actualizarRestaurante(propietarioId, restauranteId, data) {
  const allowed = [
    "nombre","calle","numero_ext","numero_int","colonia","municipio","estado",
    "pais","codigo_postal","referencia","estatus","total_mesas","timezone"
  ];
  const fields = [];
  const values = [];
  for (const k of allowed) if (k in data) { fields.push(`${k} = ?`); values.push(data[k]); }
  if (fields.length === 0) return 0;

  values.push(propietarioId, restauranteId);
  const [r] = await pool.query(
    `UPDATE restaurante SET ${fields.join(", ")}
      WHERE propietario_id = ? AND id = ?`,
    values
  );
  return r.affectedRows;
}

export async function eliminarRestaurante(propietarioId, restauranteId) {
  const [r] = await pool.query(
    `DELETE FROM restaurante WHERE propietario_id = ? AND id = ?`,
    [propietarioId, restauranteId]
  );
  return r.affectedRows;
}

/* =========================
   RESTAURANTE_CONFIG
   ========================= */
export async function getConfig(restauranteId) {
  const [rows] = await pool.query(
    `SELECT *
       FROM restaurante_config
      WHERE restaurante_id = ?
      LIMIT 1`,
    [restauranteId]
  );
  return rows[0] || null;
}

export async function updateConfig(restauranteId, data) {
  const allowed = [
    "impuesto_tasa","impuesto_modo","impuesto_configurado",
    "mostrar_desglose_iva_en_ticket","serie_folio","folio_actual",
    "folio_habilitado","impresora_nombre","impresora_endpoint",
    "moneda","config_status"
  ];
  const fields = [];
  const values = [];
  for (const k of allowed) if (k in data) { fields.push(`${k} = ?`); values.push(data[k]); }
  if (fields.length === 0) return 0;

  values.push(restauranteId);
  const [r] = await pool.query(
    `UPDATE restaurante_config SET ${fields.join(", ")}
      WHERE restaurante_id = ?`,
    values
  );
  return r.affectedRows;
}

/* =========================
   MESAS
   ========================= */
export async function listarMesas(restauranteId, { incluirOcultas = false } = {}) {
  const [rows] = await pool.query(
    `SELECT id, nombre, slug, capacidad, estatus, visible, orden, updated_at
       FROM mesa
      WHERE restaurante_id = ?
        ${incluirOcultas ? "" : "AND visible = 1"}
      ORDER BY orden ASC, id ASC`,
    [restauranteId]
  );
  return rows;
}
export async function getMesa(restauranteId, mesaId) {
  const [rows] = await pool.query(
    `SELECT * FROM mesa WHERE restaurante_id = ? AND id = ? LIMIT 1`,
    [restauranteId, mesaId]
  );
  return rows[0] || null;
}

export async function actualizarMesa(restauranteId, mesaId, data) {
  const allowed = ["nombre","capacidad","estatus","visible","orden","slug"];
  const fields = [];
  const values = [];
  for (const k of allowed) if (k in data) { fields.push(`${k} = ?`); values.push(data[k]); }
  if (fields.length === 0) return 0;

  values.push(restauranteId, mesaId);
  const [r] = await pool.query(
    `UPDATE mesa SET ${fields.join(", ")}
      WHERE restaurante_id = ? AND id = ?`,
    values
  );
  return r.affectedRows;
}

// opcional: re-ejecutar SP manualmente
export async function crearMesasPorSP(restauranteId, total) {
  await pool.query(`CALL sp_crear_mesas_restaurante(?, ?)`, [restauranteId, +total]);
}