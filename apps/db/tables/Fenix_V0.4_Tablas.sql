/* ============================================================
   PROYECTO FÉNIX — TABLAS v0.4 (Fase 4)
   Autor: Joel (Hell)
   Fecha: 2025-10-19
   Descripción:
     - Esquema base limpio con collation unificada utf8mb4_0900_ai_ci
     - Estados de orden extendidos (pendiente/en_proceso/listo/pagada/cancelada)
     - Restaurante_config con impresoras separadas (terminal/cocina)
     - Tabla ticket con FK a usuario (generado_por) e índices útiles
   ============================================================ */

DROP DATABASE IF EXISTS taqueria_oasis_db;
CREATE DATABASE taqueria_oasis_db
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE taqueria_oasis_db;

/* ============================================================
   1) PROPIETARIO
   ============================================================ */
CREATE TABLE propietario (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  razon_social      VARCHAR(255) NOT NULL DEFAULT '',
  nombre            VARCHAR(150) NOT NULL,
  email             VARCHAR(150) NOT NULL,
  telefono          VARCHAR(30),
  password_hash     VARCHAR(255) NOT NULL,
  email_verificado  TINYINT(1) NOT NULL DEFAULT 0,
  activo            TINYINT(1) NOT NULL DEFAULT 1,
  last_login        TIMESTAMP NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prop_email (email),
  CHECK (activo IN (0,1)),
  CHECK (email_verificado IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* ============================================================
   2) RESTAURANTE
   ============================================================ */
CREATE TABLE restaurante (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  propietario_id   BIGINT UNSIGNED NOT NULL,
  nombre           VARCHAR(140) NOT NULL,
  slug             VARCHAR(160) NOT NULL,
  calle            VARCHAR(160),
  numero_ext       VARCHAR(16),
  numero_int       VARCHAR(16),
  colonia          VARCHAR(100),
  municipio        VARCHAR(100),
  estado           VARCHAR(100),
  pais             VARCHAR(60) DEFAULT 'México',
  codigo_postal    VARCHAR(10),
  referencia       VARCHAR(255),
  estatus          ENUM('activo','inactivo','suspendido') NOT NULL DEFAULT 'activo',
  max_sesiones     TINYINT UNSIGNED NOT NULL DEFAULT 1,
  total_mesas      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  timezone         VARCHAR(40),
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rest_prop_nombre (propietario_id, nombre),
  UNIQUE KEY uq_rest_prop_slug   (propietario_id, slug),
  KEY ix_rest_prop_estatus (propietario_id, estatus),
  CONSTRAINT fk_rest_prop FOREIGN KEY (propietario_id)
    REFERENCES propietario(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_rest_max_ses CHECK (max_sesiones BETWEEN 1 AND 100),
  CONSTRAINT chk_rest_total_mesas CHECK (total_mesas BETWEEN 0 AND 500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* ============================================================
   3) CONFIGURACIÓN POR SUCURSAL
   ============================================================ */
CREATE TABLE restaurante_config (
  restaurante_id                 BIGINT UNSIGNED NOT NULL,
  impuesto_tasa                  DECIMAL(5,2) NOT NULL DEFAULT 16.00,
  impuesto_modo                  ENUM('INCLUIDO','DESGLOSADO','EXENTO') NOT NULL DEFAULT 'INCLUIDO',
  impuesto_configurado           TINYINT(1) NOT NULL DEFAULT 1,
  mostrar_desglose_iva_en_ticket TINYINT(1) NOT NULL DEFAULT 0,
  serie_folio                    VARCHAR(10) NOT NULL DEFAULT 'A',
  folio_actual                   INT UNSIGNED NOT NULL DEFAULT 1,
  folio_habilitado               TINYINT(1) NOT NULL DEFAULT 1,
  impresora_nombre               VARCHAR(120),   -- legado
  impresora_endpoint             VARCHAR(200),   -- legado / microservicio
  impresora_terminal             VARCHAR(120),   -- NUEVO v0.4
  impresora_cocina               VARCHAR(120),   -- NUEVO v0.4
  moneda                         VARCHAR(8) NOT NULL DEFAULT 'MXN',
  config_status                  ENUM('borrador','listo') NOT NULL DEFAULT 'listo',
  PRIMARY KEY (restaurante_id),
  CONSTRAINT fk_cfg_rest FOREIGN KEY (restaurante_id)
    REFERENCES restaurante(id)
    ON DELETE CASCADE,
  CHECK (impuesto_tasa BETWEEN 0 AND 100),
  CHECK (folio_actual >= 1),
  CHECK (impuesto_configurado IN (0,1)),
  CHECK (folio_habilitado IN (0,1)),
  CHECK (mostrar_desglose_iva_en_ticket IN (0,1)),
  CONSTRAINT chk_cfg_exento_tasa
    CHECK (
      (impuesto_modo='EXENTO' AND impuesto_tasa=0.00)
      OR (impuesto_modo IN ('INCLUIDO','DESGLOSADO'))
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* ============================================================
   4) USUARIOS
   ============================================================ */
CREATE TABLE usuario (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  propietario_id   BIGINT UNSIGNED NOT NULL,
  nombre           VARCHAR(150) NOT NULL,
  email            VARCHAR(150) NOT NULL,
  email_verificado TINYINT(1) NOT NULL DEFAULT 0,
  telefono         VARCHAR(30),
  password_hash    VARCHAR(255) NOT NULL,
  rol_global       ENUM('NINGUNO','ADMINISTRACION','ADMIN') NOT NULL DEFAULT 'NINGUNO',
  activo           TINYINT(1) NOT NULL DEFAULT 1,
  last_login       TIMESTAMP NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_email (email),
  KEY ix_usuario_prop (propietario_id),
  CONSTRAINT fk_usuario_prop FOREIGN KEY (propietario_id)
    REFERENCES propietario(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CHECK (activo IN (0,1)),
  CHECK (email_verificado IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* ============================================================
   5) USUARIO ↔ RESTAURANTE (ROLES LOCALES)
   ============================================================ */
CREATE TABLE usuario_restaurante (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id      BIGINT UNSIGNED NOT NULL,
  restaurante_id  BIGINT UNSIGNED NOT NULL,
  rol_local       ENUM('GERENTE','CAJERO','MESERO','COCINA','TERMINAL') NOT NULL,
  activo          TINYINT(1) NOT NULL DEFAULT 1,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_rest (usuario_id, restaurante_id),
  KEY ix_rest_rol_activo (restaurante_id, rol_local, activo),
  KEY ix_usr_rol_activo  (usuario_id, rol_local, activo),
  CONSTRAINT fk_usr_rest_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuario(id) ON DELETE CASCADE,
  CONSTRAINT fk_usr_rest_rest FOREIGN KEY (restaurante_id)
    REFERENCES restaurante(id) ON DELETE CASCADE,
  CHECK (activo IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* ============================================================
   6) CATEGORIA_PRODUCTO
   ============================================================ */
CREATE TABLE categoria_producto (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurante_id BIGINT UNSIGNED NOT NULL,
  parent_id      BIGINT UNSIGNED NULL,
  nombre         VARCHAR(120) NOT NULL,
  slug           VARCHAR(140) NOT NULL,
  descripcion    VARCHAR(255),
  orden          SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  visible        TINYINT(1) NOT NULL DEFAULT 1,
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cat_rest_slug (restaurante_id, slug),
  UNIQUE KEY uq_cat_rest_id   (restaurante_id, id),
  KEY ix_cat_rest_parent_orden (restaurante_id, parent_id, orden),
  CONSTRAINT fk_cat_rest FOREIGN KEY (restaurante_id)
    REFERENCES restaurante(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cat_parent FOREIGN KEY (restaurante_id, parent_id)
    REFERENCES categoria_producto(restaurante_id, id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CHECK (orden BETWEEN 0 AND 65535),
  CHECK (visible IN (0,1)),
  CHECK (activo IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* ============================================================
   7) PRODUCTO
   ============================================================ */
CREATE TABLE producto (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurante_id BIGINT UNSIGNED NOT NULL,
  categoria_id   BIGINT UNSIGNED NULL,    -- NOTA: categoria_id SIEMPRE debe hacer referencia a una subcategoría (hoja), 
										                      -- no a categorías padre. Validado en triggers y servicio.
  nombre         VARCHAR(200) NOT NULL,
  slug           VARCHAR(160) NOT NULL,
  descripcion    VARCHAR(255),
  sku            VARCHAR(60),
  imagen         VARCHAR(255),
  precio         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  estatus        ENUM('disponible','agotado','oculto','inactivo')
                  NOT NULL DEFAULT 'disponible',
  orden          SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prod_rest_slug (restaurante_id, slug),
  UNIQUE KEY uq_prod_rest_sku  (restaurante_id, sku),
  KEY ix_prod_cat_orden (categoria_id, orden),
  KEY ix_prod_rest_nombre (restaurante_id, nombre),
  KEY ix_prod_estado (estatus),
  CONSTRAINT fk_prod_rest FOREIGN KEY (restaurante_id)
    REFERENCES restaurante(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_prod_cat FOREIGN KEY (categoria_id)
    REFERENCES categoria_producto(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CHECK (precio >= 0),
  CHECK (orden BETWEEN 0 AND 65535)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/* ============================================================
   8) MESA
   ============================================================ */
CREATE TABLE mesa (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurante_id BIGINT UNSIGNED NOT NULL,
  nombre         VARCHAR(60) NOT NULL,
  slug           VARCHAR(80) NOT NULL,
  capacidad      TINYINT UNSIGNED DEFAULT 4,
  estatus        ENUM('libre','ocupada','reservada','bloqueada') NOT NULL DEFAULT 'libre',
  visible        TINYINT(1) NOT NULL DEFAULT 1,
  orden          SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mesa_rest_slug   (restaurante_id, slug),
  UNIQUE KEY uq_mesa_rest_nombre (restaurante_id, nombre),
  UNIQUE KEY uq_mesa_rest_id     (restaurante_id, id),
  KEY ix_mesa_rest_status (restaurante_id, estatus, orden),
  CONSTRAINT fk_mesa_rest FOREIGN KEY (restaurante_id)
    REFERENCES restaurante(id) ON DELETE CASCADE,
  CHECK (capacidad BETWEEN 1 AND 20),
  CHECK (visible IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_0900_ai_ci;

/* ============================================================
   9) ORDEN (Encabezado de venta) — v0.4
   ============================================================ */
CREATE TABLE orden (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurante_id       BIGINT UNSIGNED NOT NULL,
  mesa_id              BIGINT UNSIGNED NULL,
  usuario_id           BIGINT UNSIGNED NULL,

  orden_tipo           ENUM('AQUI','LLEVAR','DOMICILIO') NOT NULL DEFAULT 'AQUI',
  estado               ENUM('pendiente','en_proceso','listo','pagada','cancelada')
                        NOT NULL DEFAULT 'pendiente',

  iva_modo_en_venta    ENUM('INCLUIDO','DESGLOSADO','EXENTO') NOT NULL DEFAULT 'INCLUIDO',
  iva_tasa_en_venta    DECIMAL(5,2) NOT NULL DEFAULT 16.00,

  subtotal             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  iva                  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total                DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ajuste_redondeo      DECIMAL(6,2)  NOT NULL DEFAULT 0.00,
  
  envio_monto          DECIMAL(12,2) DEFAULT 0.00,
  
  factura_solicitada   TINYINT(1) NOT NULL DEFAULT 0,
  cfdi_status          ENUM('N/A','PENDIENTE','TIMBRADO','CANCELADO') NOT NULL DEFAULT 'N/A',
  cfdi_uuid            CHAR(36) NULL,

  serie_folio          VARCHAR(10) NULL,
  folio                INT UNSIGNED NULL,

  abierta_en           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pagada_en            TIMESTAMP NULL,
  cancelada_en         TIMESTAMP NULL,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_orden_folio (restaurante_id, serie_folio, folio),
  KEY ix_orden_rest_estado (restaurante_id, estado, abierta_en),
  KEY ix_orden_mesa (mesa_id, estado),
  KEY ix_orden_tipo_estado (orden_tipo, estado, abierta_en),

  CONSTRAINT fk_orden_rest FOREIGN KEY (restaurante_id)
    REFERENCES restaurante(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_orden_mesa FOREIGN KEY (mesa_id)
    REFERENCES mesa(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT fk_orden_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuario(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT chk_cfdi_coherencia
    CHECK (
      (cfdi_status='N/A' AND cfdi_uuid IS NULL)
      OR (cfdi_status IN ('PENDIENTE','TIMBRADO','CANCELADO'))
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_0900_ai_ci;

/* ============================================================
   10) ORDEN_DETALLE
   ============================================================ */
CREATE TABLE orden_detalle (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_id         BIGINT UNSIGNED NOT NULL,
  producto_id      BIGINT UNSIGNED NULL,
  producto_nombre  VARCHAR(200) NOT NULL,
  producto_sku     VARCHAR(60),
  precio_unitario  DECIMAL(12,2) NOT NULL,
  cantidad         DECIMAL(10,3) NOT NULL DEFAULT 1.000,
  importe          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  orden            SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_det_orden (orden_id, orden),
  CONSTRAINT fk_det_orden FOREIGN KEY (orden_id)
    REFERENCES orden(id) ON DELETE CASCADE,
  CONSTRAINT fk_det_prod FOREIGN KEY (producto_id)
    REFERENCES producto(id) ON DELETE SET NULL,
  CHECK (cantidad > 0),
  CHECK (precio_unitario >= 0),
  CHECK (importe = ROUND(precio_unitario * cantidad, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_0900_ai_ci;

/* ============================================================
   11) ORDEN_PAGO
   ============================================================ */
CREATE TABLE orden_pago (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_id     BIGINT UNSIGNED NOT NULL,
  medio        ENUM('EFECTIVO','TARJETA_EXTERNA','TRANSFERENCIA','OTRO') NOT NULL,
  monto        DECIMAL(12,2) NOT NULL,
  nota_medio   VARCHAR(100),
  creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_pago_orden (orden_id),
  KEY ix_pago_medio (medio, creado_en),
  CONSTRAINT fk_pago_orden FOREIGN KEY (orden_id)
    REFERENCES orden(id) ON DELETE CASCADE,
  CHECK (monto >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_0900_ai_ci;

/* ============================================================
   12) TICKET (metadatos de impresión)
   ============================================================ */
CREATE TABLE ticket (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_id           BIGINT UNSIGNED NOT NULL,
  restaurante_id     BIGINT UNSIGNED NOT NULL,
  tipo               ENUM('VENTA','REIMPRESION','COCINA','CANCELACION') NOT NULL DEFAULT 'VENTA',
  contenido_qr       VARCHAR(255) DEFAULT NULL,
  contenido_json TEXT NULL,
  copias_generadas   SMALLINT UNSIGNED DEFAULT 0,
  impresora_nombre   VARCHAR(120) DEFAULT NULL,
  impresora_endpoint VARCHAR(200) DEFAULT NULL,
  generado_por       BIGINT UNSIGNED DEFAULT NULL,
  generado_en        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY ix_ticket_orden (orden_id),
  KEY ix_ticket_rest_tipo_fecha (restaurante_id, tipo, generado_en),
  KEY ix_ticket_impresora_fecha (impresora_nombre, generado_en),

  CONSTRAINT fk_ticket_orden FOREIGN KEY (orden_id)
      REFERENCES orden(id) ON DELETE CASCADE,

  CONSTRAINT fk_ticket_rest FOREIGN KEY (restaurante_id)
      REFERENCES restaurante(id) ON DELETE CASCADE,

  CONSTRAINT fk_ticket_usuario FOREIGN KEY (generado_por)
      REFERENCES usuario(id)
      ON DELETE SET NULL ON UPDATE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_0900_ai_ci;
