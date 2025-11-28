/* ============================================================
   PROYECTO FÉNIX — TRIGGERS v0.4 CLEAN
   Autor: Joel (Hell)
   Fecha: 2025-10-19
   ============================================================
   Incluye:
     ✅ Función f_slugify()
     ✅ Triggers: restaurante, categoría, producto
     ✅ Procedimiento: sp_crear_mesas_restaurante()
     ✅ Triggers: sincronización restaurante ↔ mesas
     ✅ Vista: vw_mesas_estado_propietario
     ✅ Triggers: orden ↔ mesa
     ✅ Triggers: tickets (COCINA / VENTA / CANCELACION sin impresión)
   ============================================================ */

USE taqueria_oasis_db;

/* ============================================================
   FUNCIÓN: f_slugify
   ============================================================ */
DROP FUNCTION IF EXISTS f_slugify;
DELIMITER $$
CREATE FUNCTION f_slugify(s VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci)
RETURNS VARCHAR(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
DETERMINISTIC
BEGIN
  IF s IS NULL OR CHAR_LENGTH(TRIM(s)) = 0 THEN
    RETURN NULL;
  END IF;

  SET s = LOWER(TRIM(s));
  SET s = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(s,'á','a'),'é','e'),'í','i'),'ó','o'),'ú','u');
  SET s = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(s,'ä','a'),'ë','e'),'ï','i'),'ö','o'),'ü','u');
  SET s = REPLACE(s, 'ñ', 'n');
  SET s = REGEXP_REPLACE(s, '[^a-z0-9]+', '-');
  SET s = REGEXP_REPLACE(s, '^-+|-+$', '');
  RETURN LEFT(s, 160);
END$$
DELIMITER ;

/* ============================================================
   TRIGGERS: RESTAURANTE
   ============================================================ */
DROP TRIGGER IF EXISTS trg_rest_slug_bi;
DELIMITER $$
CREATE TRIGGER trg_rest_slug_bi
BEFORE INSERT ON restaurante
FOR EACH ROW
BEGIN
  DECLARE base VARCHAR(160);
  DECLARE cand VARCHAR(160);
  DECLARE suf INT DEFAULT 1;

  IF NEW.slug IS NULL OR CHAR_LENGTH(TRIM(NEW.slug)) = 0 THEN
    SET base = f_slugify(NEW.nombre);
    IF base IS NULL OR base = '' THEN SET base = CONCAT('rest-', UUID()); END IF;
    SET cand = base;

    WHILE EXISTS (SELECT 1 FROM restaurante r WHERE r.propietario_id = NEW.propietario_id AND r.slug = cand) DO
      SET suf = suf + 1; SET cand = CONCAT(base, '-', suf);
    END WHILE;

    SET NEW.slug = cand;
  ELSE
    SET NEW.slug = f_slugify(NEW.slug);
  END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_rest_slug_bu;
DELIMITER $$
CREATE TRIGGER trg_rest_slug_bu
BEFORE UPDATE ON restaurante
FOR EACH ROW
BEGIN
  DECLARE base VARCHAR(160);
  DECLARE cand VARCHAR(160);
  DECLARE suf INT DEFAULT 1;

  IF (NEW.slug IS NULL OR CHAR_LENGTH(TRIM(NEW.slug)) = 0)
     OR (NEW.nombre <> OLD.nombre)
     OR (NEW.slug <> OLD.slug) THEN

    SET base = f_slugify(COALESCE(NEW.slug, NEW.nombre));
    IF base IS NULL OR base = '' THEN SET base = CONCAT('rest-', UUID()); END IF;
    SET cand = base;

    WHILE EXISTS (SELECT 1 FROM restaurante r WHERE r.propietario_id = NEW.propietario_id AND r.slug = cand AND r.id <> OLD.id) DO
      SET suf = suf + 1; SET cand = CONCAT(base, '-', suf);
    END WHILE;

    SET NEW.slug = cand;
  END IF;
END$$
DELIMITER ;

/* ============================================================
   TRIGGERS: CATEGORÍA PRODUCTO
   ============================================================ */
DROP TRIGGER IF EXISTS trg_cat_slug_bi;
DELIMITER $$
CREATE TRIGGER trg_cat_slug_bi
BEFORE INSERT ON categoria_producto
FOR EACH ROW
BEGIN
  DECLARE base VARCHAR(160);
  DECLARE cand VARCHAR(160);
  DECLARE suf INT DEFAULT 1;

  IF NEW.slug IS NULL OR CHAR_LENGTH(TRIM(NEW.slug)) = 0 THEN
    SET base = f_slugify(NEW.nombre);
    IF base IS NULL OR base = '' THEN SET base = CONCAT('cat-', UUID()); END IF;
    SET cand = base;

    WHILE EXISTS (SELECT 1 FROM categoria_producto c WHERE c.restaurante_id = NEW.restaurante_id AND c.slug = cand) DO
      SET suf = suf + 1; SET cand = CONCAT(base, '-', suf);
    END WHILE;
    SET NEW.slug = cand;
  ELSE
    SET NEW.slug = f_slugify(NEW.slug);
  END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_cat_slug_bu;
DELIMITER $$
CREATE TRIGGER trg_cat_slug_bu
BEFORE UPDATE ON categoria_producto
FOR EACH ROW
BEGIN
  DECLARE base VARCHAR(160);
  DECLARE cand VARCHAR(160);
  DECLARE suf INT DEFAULT 1;

  IF (NEW.slug IS NULL OR CHAR_LENGTH(TRIM(NEW.slug)) = 0)
     OR (NEW.nombre <> OLD.nombre)
     OR (NEW.slug <> OLD.slug) THEN

    SET base = f_slugify(COALESCE(NEW.slug, NEW.nombre));
    IF base IS NULL OR base = '' THEN SET base = CONCAT('cat-', UUID()); END IF;
    SET cand = base;

    WHILE EXISTS (SELECT 1 FROM categoria_producto c WHERE c.restaurante_id = NEW.restaurante_id AND c.slug = cand AND c.id <> OLD.id) DO
      SET suf = suf + 1; SET cand = CONCAT(base, '-', suf);
    END WHILE;

    SET NEW.slug = cand;
  END IF;
END$$
DELIMITER ;

-- Al borrar una categoría, inactivar productos asociados
DROP TRIGGER IF EXISTS trg_cat_before_delete;
DELIMITER $$
CREATE TRIGGER trg_cat_before_delete
BEFORE DELETE ON categoria_producto
FOR EACH ROW
BEGIN
  UPDATE producto
     SET estatus = 'inactivo',
         categoria_id = NULL
   WHERE restaurante_id = OLD.restaurante_id
     AND categoria_id = OLD.id;
END$$
DELIMITER ;

/* ============================================================
   TRIGGERS: PRODUCTO
   ============================================================ */
DROP TRIGGER IF EXISTS trg_prod_validate_cat_leaf_bi;
DELIMITER $$
CREATE TRIGGER trg_prod_validate_cat_leaf_bi
BEFORE INSERT ON producto
FOR EACH ROW
BEGIN
  DECLARE p_parent BIGINT DEFAULT NULL;
  SELECT parent_id INTO p_parent
    FROM categoria_producto
   WHERE id = NEW.categoria_id
     AND restaurante_id = NEW.restaurante_id
   LIMIT 1;

  IF p_parent IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Solo se permiten productos en subcategorías (la categoría indicada es padre o no existe).';
  END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_prod_slug_bi;
DELIMITER $$
CREATE TRIGGER trg_prod_slug_bi
BEFORE INSERT ON producto
FOR EACH ROW
BEGIN
  DECLARE base VARCHAR(160);
  DECLARE cand VARCHAR(160);
  DECLARE suf INT DEFAULT 1;

  IF NEW.slug IS NULL OR CHAR_LENGTH(TRIM(NEW.slug)) = 0 THEN
    SET base = f_slugify(NEW.nombre);
    IF base IS NULL OR base = '' THEN SET base = CONCAT('prod-', UUID()); END IF;
    SET cand = base;

    WHILE EXISTS (SELECT 1 FROM producto p WHERE p.restaurante_id = NEW.restaurante_id AND p.slug = cand) DO
      SET suf = suf + 1; SET cand = CONCAT(base, '-', suf);
    END WHILE;
    SET NEW.slug = cand;
  ELSE
    SET NEW.slug = f_slugify(NEW.slug);
  END IF;

  IF NEW.precio < 0 THEN SET NEW.precio = 0.00; END IF;
END$$
DELIMITER ;

/* ============================================================
   PROCEDIMIENTO: CREAR MESAS (corregido con etiqueta)
   ============================================================ */
DROP PROCEDURE IF EXISTS sp_crear_mesas_restaurante;
DELIMITER $$
CREATE PROCEDURE sp_crear_mesas_restaurante(
  IN p_restaurante_id BIGINT UNSIGNED,
  IN p_total_mesas INT UNSIGNED
)
main_block: BEGIN
  DECLARE i INT DEFAULT 1;

  IF p_total_mesas IS NULL OR p_total_mesas <= 0 THEN
    LEAVE main_block;
  END IF;

  WHILE i <= p_total_mesas DO
    IF NOT EXISTS (
      SELECT 1 FROM mesa WHERE restaurante_id = p_restaurante_id AND orden = i
    ) THEN
      INSERT INTO mesa (restaurante_id, nombre, slug, capacidad, estatus, visible, orden)
      VALUES (p_restaurante_id, CONCAT('Mesa ', i), CONCAT('mesa-', LPAD(i,3,'0')), 4, 'libre', 1, i);
    END IF;
    SET i = i + 1;
  END WHILE;
END$$
DELIMITER ;

/* ============================================================
   TRIGGERS: RESTAURANTE ↔ MESAS
   ============================================================ */
DROP TRIGGER IF EXISTS trg_restaurante_crea_mesas;
DELIMITER $$
CREATE TRIGGER trg_restaurante_crea_mesas
AFTER INSERT ON restaurante
FOR EACH ROW
BEGIN
  IF COALESCE(NEW.total_mesas,0) > 0 THEN
    CALL sp_crear_mesas_restaurante(NEW.id, NEW.total_mesas);
  END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_restaurante_actualiza_mesas;
DELIMITER $$
CREATE TRIGGER trg_restaurante_actualiza_mesas
AFTER UPDATE ON restaurante
FOR EACH ROW
BEGIN
  IF COALESCE(NEW.total_mesas,0) <> COALESCE(OLD.total_mesas,0) THEN
    IF NEW.total_mesas > OLD.total_mesas THEN
      CALL sp_crear_mesas_restaurante(NEW.id, NEW.total_mesas);
    ELSE
      DELETE FROM mesa WHERE restaurante_id = NEW.id AND orden > NEW.total_mesas;
    END IF;
  END IF;
END$$
DELIMITER ;

/* ============================================================
   VISTA: ESTADO DE MESAS POR PROPIETARIO
   ============================================================ */
CREATE OR REPLACE VIEW vw_mesas_estado_propietario AS
SELECT
  p.id AS propietario_id,
  r.id AS restaurante_id,
  r.nombre AS restaurante_nombre,
  m.id AS mesa_id,
  m.nombre AS mesa_nombre,
  m.slug AS mesa_slug,
  m.capacidad,
  m.estatus,
  m.visible,
  m.updated_at AS mesa_actualizada
FROM propietario p
JOIN restaurante r ON r.propietario_id = p.id
JOIN mesa m ON m.restaurante_id = r.id
ORDER BY p.id, r.id, m.orden;

/* ============================================================
   TRIGGERS: ORDEN ↔ MESA / TICKETS
   v0.4 — Estados: pendiente / en_proceso / listo / pagada / cancelada
   ============================================================ */

DROP TRIGGER IF EXISTS trg_orden_creacion_mesa_ocupada;
DELIMITER $$
CREATE TRIGGER trg_orden_creacion_mesa_ocupada
AFTER INSERT ON orden
FOR EACH ROW
BEGIN
  IF NEW.mesa_id IS NOT NULL AND NEW.estado IN ('pendiente','en_proceso') THEN
    UPDATE mesa SET estatus = 'ocupada' WHERE id = NEW.mesa_id;
  END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_orden_cambio_estado_mesa;
DELIMITER $$
CREATE TRIGGER trg_orden_cambio_estado_mesa
AFTER UPDATE ON orden
FOR EACH ROW
BEGIN
  IF OLD.estado IN ('pendiente','en_proceso','listo')
     AND NEW.estado IN ('pagada','cancelada')
     AND NEW.mesa_id IS NOT NULL THEN
    UPDATE mesa SET estatus = 'libre' WHERE id = NEW.mesa_id;
  END IF;
END$$
DELIMITER ;

-- Tickets automáticos: COCINA / VENTA / CANCELACION (solo registro)
DROP TRIGGER IF EXISTS trg_ticket_por_estado;
DELIMITER $$
CREATE TRIGGER trg_ticket_por_estado
AFTER UPDATE ON orden
FOR EACH ROW
BEGIN
  DECLARE v_impresora_nombre   VARCHAR(120);
  DECLARE v_impresora_endpoint VARCHAR(200);
  DECLARE v_contenido_qr       VARCHAR(255);

  SET v_contenido_qr = CONCAT('TCK-', NEW.id, '-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'));

  -- Ticket COCINA (al enviar a cocina)
  IF OLD.estado <> NEW.estado AND NEW.estado = 'en_proceso' THEN
    SELECT impresora_cocina, impresora_endpoint
      INTO v_impresora_nombre, v_impresora_endpoint
      FROM restaurante_config WHERE restaurante_id = NEW.restaurante_id LIMIT 1;

    INSERT INTO ticket (
      orden_id, restaurante_id, tipo,
      contenido_qr, impresora_nombre, impresora_endpoint, generado_por
    ) VALUES (
      NEW.id, NEW.restaurante_id, 'COCINA',
      v_contenido_qr, v_impresora_nombre, v_impresora_endpoint, NEW.usuario_id
    );
  END IF;

  -- Ticket VENTA (al pagar)
  IF OLD.estado <> NEW.estado AND NEW.estado = 'pagada' THEN
    SELECT impresora_terminal, impresora_endpoint
      INTO v_impresora_nombre, v_impresora_endpoint
      FROM restaurante_config WHERE restaurante_id = NEW.restaurante_id LIMIT 1;

    INSERT INTO ticket (
      orden_id, restaurante_id, tipo,
      contenido_qr, impresora_nombre, impresora_endpoint, generado_por
    ) VALUES (
      NEW.id, NEW.restaurante_id, 'VENTA',
      v_contenido_qr, v_impresora_nombre, v_impresora_endpoint, NEW.usuario_id
    );
  END IF;

  -- CANCELACION (solo registro, sin impresión ni QR obligatorio)
  IF OLD.estado <> NEW.estado AND NEW.estado = 'cancelada' THEN
    INSERT INTO ticket (orden_id, restaurante_id, tipo, generado_por)
    VALUES (NEW.id, NEW.restaurante_id, 'CANCELACION', NEW.usuario_id);
  END IF;
END$$
DELIMITER ;

-- Al eliminar una orden, liberar mesa
DROP TRIGGER IF EXISTS trg_orden_delete_mesa_libre;
DELIMITER $$
CREATE TRIGGER trg_orden_delete_mesa_libre
AFTER DELETE ON orden
FOR EACH ROW
BEGIN
  IF OLD.mesa_id IS NOT NULL THEN
    UPDATE mesa SET estatus = 'libre' WHERE id = OLD.mesa_id;
  END IF;
END$$
DELIMITER ;
