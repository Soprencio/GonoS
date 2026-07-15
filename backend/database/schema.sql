-- =============================================================================
-- GonoS — Schema de base de datos para MariaDB 10.6+
-- =============================================================================
-- Ejecutar con:
--   mysql -u root -p < schema.sql
-- =============================================================================

CREATE DATABASE IF NOT EXISTS gonos DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gonos;

-- =============================================================================
-- CATÁLOGOS FIJOS
-- =============================================================================

CREATE TABLE roles (
  rol_id     TINYINT UNSIGNED AUTO_INCREMENT,
  nombre     VARCHAR(20) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rol_id),
  CONSTRAINT uq_roles_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tipos_ejes (
  teje_id    TINYINT UNSIGNED AUTO_INCREMENT,
  tipo       VARCHAR(1) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (teje_id),
  CONSTRAINT uq_tipos_ejes_tipo UNIQUE (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- ENTIDADES PRINCIPALES
-- =============================================================================

CREATE TABLE usuarios (
  usuario_id    INT UNSIGNED AUTO_INCREMENT,
  mail          VARCHAR(255) NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  apellido      VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,

  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id),
  CONSTRAINT uq_usuarios_mail UNIQUE (mail)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE clases (
  clase_id    INT UNSIGNED AUTO_INCREMENT,
  nombre      VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  codigo      VARCHAR(6) NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (clase_id),
  CONSTRAINT uq_clases_codigo UNIQUE (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- TABLAS PUENTE / DEPENDIENTES
-- =============================================================================

CREATE TABLE participaciones (
  participacion_id INT UNSIGNED AUTO_INCREMENT,
  usuario_id       INT UNSIGNED NOT NULL,
  clase_id         INT UNSIGNED NOT NULL,
  rol_id           TINYINT UNSIGNED NOT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (participacion_id),
  CONSTRAINT uq_part_usuario_clase UNIQUE (usuario_id, clase_id),
  CONSTRAINT fk_part_usuario  FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_part_clase    FOREIGN KEY (clase_id)   REFERENCES clases(clase_id)     ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_part_rol      FOREIGN KEY (rol_id)     REFERENCES roles(rol_id)        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE trabajos (
  tp_id              INT UNSIGNED AUTO_INCREMENT,
  clase_id           INT UNSIGNED NOT NULL,
  participacion_id   INT UNSIGNED NOT NULL,
  descripcion        TEXT NOT NULL,
  fecha_entrega      DATETIME NOT NULL,
  formatos_aceptados JSON NOT NULL,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tp_id),
  CONSTRAINT fk_tp_clase          FOREIGN KEY (clase_id)         REFERENCES clases(clase_id)             ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tp_participacion  FOREIGN KEY (participacion_id) REFERENCES participaciones(participacion_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE asignacion (
  asignacion_id    INT UNSIGNED AUTO_INCREMENT,
  tp_id            INT UNSIGNED NOT NULL,
  participacion_id INT UNSIGNED NOT NULL,
  nota             DECIMAL(5,2) NULL,
  estado           ENUM('Pendiente','En revisión','Revisado','Aprobado') NOT NULL DEFAULT 'Pendiente',
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (asignacion_id),
  CONSTRAINT uq_asignacion_tp_alumno UNIQUE (tp_id, participacion_id),
  CONSTRAINT fk_asig_tp             FOREIGN KEY (tp_id)            REFERENCES trabajos(tp_id)           ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_asig_participacion  FOREIGN KEY (participacion_id) REFERENCES participaciones(participacion_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE entrega (
  entrega_id       INT UNSIGNED AUTO_INCREMENT,
  asignacion_id    INT UNSIGNED NOT NULL,
  archivo          VARCHAR(255) NOT NULL,
  nombre_original  VARCHAR(255) NOT NULL,
  fecha_entrega    DATETIME NOT NULL,
  devolucion       TEXT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (entrega_id),
  CONSTRAINT fk_entrega_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignacion(asignacion_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE archivo_extra (
  archivo_extra_id  INT UNSIGNED AUTO_INCREMENT,
  entrega_id        INT UNSIGNED NOT NULL,
  nombre            VARCHAR(255) NOT NULL,
  nombre_original   VARCHAR(255) NOT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (archivo_extra_id),
  CONSTRAINT fk_archivo_extra_entrega FOREIGN KEY (entrega_id) REFERENCES entrega(entrega_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comentario_priv (
  com_priv_id      INT UNSIGNED AUTO_INCREMENT,
  entrega_id       INT UNSIGNED NOT NULL,
  participacion_id INT UNSIGNED NOT NULL,
  comentario       TEXT NOT NULL,
  fecha            DATETIME NOT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (com_priv_id),
  CONSTRAINT fk_coment_entrega        FOREIGN KEY (entrega_id)       REFERENCES entrega(entrega_id)             ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_coment_participacion  FOREIGN KEY (participacion_id) REFERENCES participaciones(participacion_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE posiciones (
  com_priv_id INT UNSIGNED NOT NULL,
  teje_id     TINYINT UNSIGNED NOT NULL,
  valor       DECIMAL(10,4) NOT NULL,
  PRIMARY KEY (com_priv_id, teje_id),
  CONSTRAINT fk_pos_coment FOREIGN KEY (com_priv_id) REFERENCES comentario_priv(com_priv_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pos_teje   FOREIGN KEY (teje_id)     REFERENCES tipos_ejes(teje_id)          ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- SEED: CATÁLOGOS FIJOS
-- =============================================================================

INSERT INTO roles (nombre) VALUES
  ('Creador'),
  ('Profesor'),
  ('Alumno');

INSERT INTO tipos_ejes (tipo) VALUES
  ('X'),
  ('Y'),
  ('Z');
