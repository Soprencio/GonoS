-- =============================================================================
-- GonoS — Stored Procedures para MariaDB 10.6+
-- Rama dev
-- =============================================================================
-- Ejecutar con:
--   mariadb -u root -p gonos < backend/database/procedures.sql
-- =============================================================================

USE gonos;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET collation_connection = 'utf8mb4_unicode_ci';

DELIMITER $$

-- ─────────────────────────────────────────────────────────────────────────────
-- USUARIOS & AUTENTICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_usuario_por_mail$$
CREATE PROCEDURE sp_usuario_por_mail(IN p_mail VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
BEGIN
  SELECT usuario_id, mail, password_hash, nombre, apellido, activo
  FROM usuarios
  WHERE mail = p_mail COLLATE utf8mb4_unicode_ci;
END$$

DROP PROCEDURE IF EXISTS sp_crear_usuario$$
CREATE PROCEDURE sp_crear_usuario(
  IN p_mail VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_password_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_nombre VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_apellido VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
  INSERT INTO usuarios (mail, password_hash, nombre, apellido)
  VALUES (p_mail, p_password_hash, p_nombre, p_apellido);
  SELECT LAST_INSERT_ID() AS usuario_id;
END$$

DROP PROCEDURE IF EXISTS sp_usuario_por_id$$
CREATE PROCEDURE sp_usuario_por_id(IN p_usuario_id INT UNSIGNED)
BEGIN
  SELECT usuario_id, mail, nombre, apellido, activo
  FROM usuarios
  WHERE usuario_id = p_usuario_id;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- CLASES & PARTICIPACIONES
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_verificar_codigo_clase$$
CREATE PROCEDURE sp_verificar_codigo_clase(IN p_codigo VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
BEGIN
  SELECT clase_id, nombre, codigo
  FROM clases
  WHERE codigo = p_codigo COLLATE utf8mb4_unicode_ci;
END$$

DROP PROCEDURE IF EXISTS sp_listar_clases_usuario$$
CREATE PROCEDURE sp_listar_clases_usuario(IN p_usuario_id INT UNSIGNED)
BEGIN
  SELECT c.clase_id, c.nombre, c.descripcion, c.codigo, c.created_at,
         r.nombre AS rol,
         (SELECT COUNT(*) FROM trabajos WHERE clase_id = c.clase_id) AS cantidad_trabajos
  FROM clases c
  JOIN participaciones p ON c.clase_id = p.clase_id
  JOIN roles r ON p.rol_id = r.rol_id
  WHERE p.usuario_id = p_usuario_id
  ORDER BY c.created_at DESC;
END$$

DROP PROCEDURE IF EXISTS sp_crear_clase$$
CREATE PROCEDURE sp_crear_clase(
  IN p_usuario_id INT UNSIGNED,
  IN p_nombre VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_descripcion TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_codigo VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
  DECLARE v_clase_id INT UNSIGNED;
  INSERT INTO clases (nombre, descripcion, codigo) VALUES (p_nombre, p_descripcion, p_codigo);
  SET v_clase_id = LAST_INSERT_ID();
  INSERT INTO participaciones (usuario_id, clase_id, rol_id) VALUES (p_usuario_id, v_clase_id, 1);
  SELECT v_clase_id AS clase_id;
END$$

DROP PROCEDURE IF EXISTS sp_obtener_participacion$$
CREATE PROCEDURE sp_obtener_participacion(
  IN p_usuario_id INT UNSIGNED,
  IN p_clase_id INT UNSIGNED
)
BEGIN
  SELECT p.participacion_id, p.rol_id, r.nombre AS rol
  FROM participaciones p
  JOIN roles r ON p.rol_id = r.rol_id
  WHERE p.usuario_id = p_usuario_id AND p.clase_id = p_clase_id;
END$$

DROP PROCEDURE IF EXISTS sp_listar_participantes_clase$$
CREATE PROCEDURE sp_listar_participantes_clase(IN p_clase_id INT UNSIGNED)
BEGIN
  SELECT p.participacion_id, p.rol_id, p.created_at AS fecha_ingreso,
         r.nombre AS rol,
         u.usuario_id, u.nombre, u.apellido, u.mail
  FROM participaciones p
  JOIN usuarios u ON p.usuario_id = u.usuario_id
  JOIN roles r ON p.rol_id = r.rol_id
  WHERE p.clase_id = p_clase_id
  ORDER BY r.rol_id, u.apellido, u.nombre;
END$$

DROP PROCEDURE IF EXISTS sp_obtener_participante_por_id$$
CREATE PROCEDURE sp_obtener_participante_por_id(
  IN p_participacion_id INT UNSIGNED,
  IN p_clase_id INT UNSIGNED
)
BEGIN
  SELECT p.participacion_id, r.nombre AS rol
  FROM participaciones p
  JOIN roles r ON p.rol_id = r.rol_id
  WHERE p.participacion_id = p_participacion_id AND p.clase_id = p_clase_id;
END$$

DROP PROCEDURE IF EXISTS sp_eliminar_participante$$
CREATE PROCEDURE sp_eliminar_participante(IN p_participacion_id INT UNSIGNED)
BEGIN
  DELETE FROM participaciones WHERE participacion_id = p_participacion_id;
END$$

DROP PROCEDURE IF EXISTS sp_obtener_clase_detalle$$
CREATE PROCEDURE sp_obtener_clase_detalle(
  IN p_clase_id INT UNSIGNED,
  IN p_rol_id INT
)
BEGIN
  SELECT c.clase_id, c.nombre, c.descripcion,
         CASE WHEN p_rol_id IN (1, 2) THEN c.codigo ELSE NULL END AS codigo,
         c.created_at,
         (SELECT COUNT(*) FROM trabajos WHERE clase_id = c.clase_id) AS cantidad_trabajos
  FROM clases c
  WHERE c.clase_id = p_clase_id;
END$$

DROP PROCEDURE IF EXISTS sp_listar_trabajos_resumen_clase$$
CREATE PROCEDURE sp_listar_trabajos_resumen_clase(IN p_clase_id INT UNSIGNED)
BEGIN
  SELECT tp_id, descripcion, fecha_entrega, formatos_aceptados, created_at
  FROM trabajos
  WHERE clase_id = p_clase_id
  ORDER BY created_at DESC;
END$$

DROP PROCEDURE IF EXISTS sp_unirse_clase$$
CREATE PROCEDURE sp_unirse_clase(
  IN p_usuario_id INT UNSIGNED,
  IN p_clase_id INT UNSIGNED
)
BEGIN
  DECLARE v_part_id INT UNSIGNED;
  INSERT INTO participaciones (usuario_id, clase_id, rol_id) VALUES (p_usuario_id, p_clase_id, 3);
  SET v_part_id = LAST_INSERT_ID();
  INSERT INTO asignacion (tp_id, participacion_id)
  SELECT tp_id, v_part_id FROM trabajos WHERE clase_id = p_clase_id;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- COMENTARIOS PRIVADOS Y EVALUACIÓN
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_obtener_entrega_clase$$
CREATE PROCEDURE sp_obtener_entrega_clase(IN p_entrega_id INT UNSIGNED)
BEGIN
  SELECT e.entrega_id, e.asignacion_id, a.participacion_id, t.clase_id
  FROM entrega e
  JOIN asignacion a ON e.asignacion_id = a.asignacion_id
  JOIN trabajos t ON a.tp_id = t.tp_id
  WHERE e.entrega_id = p_entrega_id;
END$$

DROP PROCEDURE IF EXISTS sp_crear_comentario_privado$$
CREATE PROCEDURE sp_crear_comentario_privado(
  IN p_entrega_id INT UNSIGNED,
  IN p_participacion_id INT UNSIGNED,
  IN p_comentario TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_pos_x FLOAT,
  IN p_pos_y FLOAT,
  IN p_pos_z FLOAT
)
BEGIN
  DECLARE v_com_id INT UNSIGNED;
  DECLARE v_ahora DATETIME;
  SET v_ahora = NOW();

  INSERT INTO comentario_priv (entrega_id, participacion_id, comentario, fecha)
  VALUES (p_entrega_id, p_participacion_id, p_comentario, v_ahora);
  SET v_com_id = LAST_INSERT_ID();

  IF p_pos_x IS NOT NULL AND p_pos_y IS NOT NULL AND p_pos_z IS NOT NULL THEN
    INSERT INTO posiciones (com_priv_id, teje_id, valor) VALUES
      (v_com_id, 1, p_pos_x),
      (v_com_id, 2, p_pos_y),
      (v_com_id, 3, p_pos_z);
  END IF;

  SELECT v_com_id AS com_priv_id, v_ahora AS fecha;
END$$

DROP PROCEDURE IF EXISTS sp_listar_comentarios_privados$$
CREATE PROCEDURE sp_listar_comentarios_privados(IN p_entrega_id INT UNSIGNED)
BEGIN
  SELECT c.com_priv_id, c.comentario, c.fecha,
         p.posicion_x, p.posicion_y, p.posicion_z,
         u.nombre AS profe_nombre, u.apellido AS profe_apellido
  FROM comentario_priv c
  LEFT JOIN (
    SELECT com_priv_id,
      MAX(CASE WHEN teje_id = 1 THEN valor END) AS posicion_x,
      MAX(CASE WHEN teje_id = 2 THEN valor END) AS posicion_y,
      MAX(CASE WHEN teje_id = 3 THEN valor END) AS posicion_z
    FROM posiciones
    GROUP BY com_priv_id
  ) p ON c.com_priv_id = p.com_priv_id
  JOIN participaciones pp ON c.participacion_id = pp.participacion_id
  JOIN usuarios u ON pp.usuario_id = u.usuario_id
  WHERE c.entrega_id = p_entrega_id
  ORDER BY c.fecha ASC;
END$$

DROP PROCEDURE IF EXISTS sp_obtener_comentario_privado$$
CREATE PROCEDURE sp_obtener_comentario_privado(IN p_com_id INT UNSIGNED)
BEGIN
  SELECT c.com_priv_id, c.participacion_id, e.entrega_id,
         a.participacion_id AS alumno_participacion_id, t.clase_id
  FROM comentario_priv c
  JOIN entrega e ON c.entrega_id = e.entrega_id
  JOIN asignacion a ON e.asignacion_id = a.asignacion_id
  JOIN trabajos t ON a.tp_id = t.tp_id
  WHERE c.com_priv_id = p_com_id;
END$$

DROP PROCEDURE IF EXISTS sp_eliminar_comentario_privado$$
CREATE PROCEDURE sp_eliminar_comentario_privado(IN p_com_id INT UNSIGNED)
BEGIN
  DELETE FROM comentario_priv WHERE com_priv_id = p_com_id;
END$$

DROP PROCEDURE IF EXISTS sp_actualizar_estado_entrega$$
CREATE PROCEDURE sp_actualizar_estado_entrega(
  IN p_entrega_id INT UNSIGNED,
  IN p_estado VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
  UPDATE asignacion a
  JOIN entrega e ON a.asignacion_id = e.asignacion_id
  SET a.estado = p_estado
  WHERE e.entrega_id = p_entrega_id;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- ENTREGAS Y ARCHIVOS
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_listar_archivos_extra$$
CREATE PROCEDURE sp_listar_archivos_extra(IN p_entrega_id INT UNSIGNED)
BEGIN
  SELECT archivo_extra_id, nombre, nombre_original
  FROM archivo_extra
  WHERE entrega_id = p_entrega_id;
END$$

DROP PROCEDURE IF EXISTS sp_eliminar_archivos_extra$$
CREATE PROCEDURE sp_eliminar_archivos_extra(IN p_entrega_id INT UNSIGNED)
BEGIN
  DELETE FROM archivo_extra WHERE entrega_id = p_entrega_id;
END$$

DROP PROCEDURE IF EXISTS sp_obtener_asignacion_para_entrega$$
CREATE PROCEDURE sp_obtener_asignacion_para_entrega(IN p_asignacion_id INT UNSIGNED)
BEGIN
  SELECT a.asignacion_id, a.estado, a.participacion_id,
         t.tp_id, t.clase_id, t.fecha_entrega, t.formatos_aceptados
  FROM asignacion a
  JOIN trabajos t ON a.tp_id = t.tp_id
  WHERE a.asignacion_id = p_asignacion_id;
END$$

DROP PROCEDURE IF EXISTS sp_obtener_ultima_entrega$$
CREATE PROCEDURE sp_obtener_ultima_entrega(IN p_asignacion_id INT UNSIGNED)
BEGIN
  SELECT entrega_id, archivo
  FROM entrega
  WHERE asignacion_id = p_asignacion_id
  ORDER BY created_at DESC
  LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS sp_guardar_entrega$$
CREATE PROCEDURE sp_guardar_entrega(
  IN p_asignacion_id INT UNSIGNED,
  IN p_archivo VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_nombre_original VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_devolucion VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
  DECLARE v_entrega_id INT UNSIGNED;
  DECLARE v_ahora DATETIME;
  SET v_ahora = NOW();

  SELECT entrega_id INTO v_entrega_id
  FROM entrega
  WHERE asignacion_id = p_asignacion_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_entrega_id IS NOT NULL THEN
    UPDATE entrega
    SET archivo = p_archivo,
        nombre_original = p_nombre_original,
        fecha_entrega = v_ahora,
        devolucion = p_devolucion
    WHERE entrega_id = v_entrega_id;
  ELSE
    INSERT INTO entrega (asignacion_id, archivo, nombre_original, fecha_entrega, devolucion)
    VALUES (p_asignacion_id, p_archivo, p_nombre_original, v_ahora, p_devolucion);
    SET v_entrega_id = LAST_INSERT_ID();
  END IF;

  UPDATE asignacion SET estado = 'En revisión' WHERE asignacion_id = p_asignacion_id;

  SELECT v_entrega_id AS entrega_id;
END$$

DROP PROCEDURE IF EXISTS sp_guardar_archivo_extra$$
CREATE PROCEDURE sp_guardar_archivo_extra(
  IN p_entrega_id INT UNSIGNED,
  IN p_nombre VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_nombre_original VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
  INSERT INTO archivo_extra (entrega_id, nombre, nombre_original)
  VALUES (p_entrega_id, p_nombre, p_nombre_original);
END$$

DROP PROCEDURE IF EXISTS sp_obtener_trabajo_simple$$
CREATE PROCEDURE sp_obtener_trabajo_simple(IN p_tp_id INT UNSIGNED)
BEGIN
  SELECT tp_id, clase_id, participacion_id, descripcion, fecha_entrega, formatos_aceptados, nota_minima
  FROM trabajos
  WHERE tp_id = p_tp_id;
END$$

DROP PROCEDURE IF EXISTS sp_listar_entregas_trabajo$$
CREATE PROCEDURE sp_listar_entregas_trabajo(IN p_tp_id INT UNSIGNED)
BEGIN
  SELECT e.entrega_id, e.archivo, e.nombre_original, e.fecha_entrega, e.devolucion,
         a.asignacion_id, a.estado, a.nota, t.nota_minima, t.fecha_entrega AS fecha_limite,
         u.usuario_id, u.nombre AS alumno_nombre, u.apellido AS alumno_apellido, u.mail AS alumno_mail
  FROM entrega e
  JOIN asignacion a ON e.asignacion_id = a.asignacion_id
  JOIN trabajos t ON a.tp_id = t.tp_id
  JOIN participaciones p ON a.participacion_id = p.participacion_id
  JOIN usuarios u ON p.usuario_id = u.usuario_id
  WHERE a.tp_id = p_tp_id
  ORDER BY e.fecha_entrega DESC;
END$$

DROP PROCEDURE IF EXISTS sp_obtener_entrega_detalle$$
CREATE PROCEDURE sp_obtener_entrega_detalle(IN p_entrega_id INT UNSIGNED)
BEGIN
  SELECT e.*, a.asignacion_id, a.tp_id, a.estado AS asignacion_estado, a.nota,
         t.clase_id, t.nota_minima, t.fecha_entrega AS fecha_limite,
         p.usuario_id, p.clase_id AS part_clase_id,
         u.nombre AS alumno_nombre, u.apellido AS alumno_apellido
  FROM entrega e
  JOIN asignacion a ON e.asignacion_id = a.asignacion_id
  JOIN trabajos t ON a.tp_id = t.tp_id
  JOIN participaciones p ON a.participacion_id = p.participacion_id
  JOIN usuarios u ON p.usuario_id = u.usuario_id
  WHERE e.entrega_id = p_entrega_id;
END$$

DROP PROCEDURE IF EXISTS sp_obtener_entrega_archivo$$
CREATE PROCEDURE sp_obtener_entrega_archivo(IN p_entrega_id INT UNSIGNED)
BEGIN
  SELECT e.archivo, e.nombre_original, a.tp_id,
         p.usuario_id, p.clase_id
  FROM entrega e
  JOIN asignacion a ON e.asignacion_id = a.asignacion_id
  JOIN participaciones p ON a.participacion_id = p.participacion_id
  WHERE e.entrega_id = p_entrega_id;
END$$

DROP PROCEDURE IF EXISTS sp_obtener_archivo_extra$$
CREATE PROCEDURE sp_obtener_archivo_extra(
  IN p_entrega_id INT UNSIGNED,
  IN p_archivo_extra_id INT UNSIGNED
)
BEGIN
  SELECT nombre, nombre_original
  FROM archivo_extra
  WHERE archivo_extra_id = p_archivo_extra_id AND entrega_id = p_entrega_id;
END$$

DROP PROCEDURE IF EXISTS sp_actualizar_nota_entrega$$
CREATE PROCEDURE sp_actualizar_nota_entrega(
  IN p_entrega_id INT UNSIGNED,
  IN p_nota DECIMAL(5,2),
  IN p_estado VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
  UPDATE asignacion a
  JOIN entrega e ON a.asignacion_id = e.asignacion_id
  SET a.nota = p_nota, a.estado = p_estado
  WHERE e.entrega_id = p_entrega_id;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- PUBLICACIONES Y TRABAJOS
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_listar_publicaciones_clase$$
CREATE PROCEDURE sp_listar_publicaciones_clase(IN p_clase_id INT UNSIGNED)
BEGIN
  SELECT p.publicacion_id, p.mensaje, p.created_at,
         u.nombre AS profe_nombre, u.apellido AS profe_apellido
  FROM publicaciones p
  JOIN participaciones pp ON p.participacion_id = pp.participacion_id
  JOIN usuarios u ON pp.usuario_id = u.usuario_id
  WHERE p.clase_id = p_clase_id
  ORDER BY p.created_at DESC;
END$$

DROP PROCEDURE IF EXISTS sp_crear_publicacion_clase$$
CREATE PROCEDURE sp_crear_publicacion_clase(
  IN p_clase_id INT UNSIGNED,
  IN p_participacion_id INT UNSIGNED,
  IN p_mensaje TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
  DECLARE v_pub_id INT UNSIGNED;
  INSERT INTO publicaciones (clase_id, participacion_id, mensaje)
  VALUES (p_clase_id, p_participacion_id, p_mensaje);
  SET v_pub_id = LAST_INSERT_ID();

  SELECT p.publicacion_id, p.mensaje, p.created_at,
         u.nombre AS profe_nombre, u.apellido AS profe_apellido
  FROM publicaciones p
  JOIN participaciones pp ON p.participacion_id = pp.participacion_id
  JOIN usuarios u ON pp.usuario_id = u.usuario_id
  WHERE p.publicacion_id = v_pub_id;
END$$

DROP PROCEDURE IF EXISTS sp_listar_alumnos_clase$$
CREATE PROCEDURE sp_listar_alumnos_clase(IN p_clase_id INT UNSIGNED)
BEGIN
  SELECT p.participacion_id, u.usuario_id, u.nombre, u.apellido, u.mail
  FROM participaciones p
  JOIN usuarios u ON p.usuario_id = u.usuario_id
  JOIN roles r ON p.rol_id = r.rol_id
  WHERE p.clase_id = p_clase_id AND r.nombre = 'Alumno'
  ORDER BY u.apellido, u.nombre;
END$$

DROP PROCEDURE IF EXISTS sp_crear_trabajo$$
CREATE PROCEDURE sp_crear_trabajo(
  IN p_clase_id INT UNSIGNED,
  IN p_participacion_id INT UNSIGNED,
  IN p_descripcion TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_fecha_entrega DATETIME,
  IN p_formatos_aceptados JSON,
  IN p_nota_minima DECIMAL(5,2)
)
BEGIN
  DECLARE v_tp_id INT UNSIGNED;
  INSERT INTO trabajos (clase_id, participacion_id, descripcion, fecha_entrega, formatos_aceptados, nota_minima)
  VALUES (p_clase_id, p_participacion_id, p_descripcion, p_fecha_entrega, p_formatos_aceptados, p_nota_minima);
  SET v_tp_id = LAST_INSERT_ID();
  SELECT v_tp_id AS tp_id;
END$$

DROP PROCEDURE IF EXISTS sp_crear_asignacion$$
CREATE PROCEDURE sp_crear_asignacion(
  IN p_tp_id INT UNSIGNED,
  IN p_participacion_id INT UNSIGNED
)
BEGIN
  INSERT INTO asignacion (tp_id, participacion_id)
  VALUES (p_tp_id, p_participacion_id);
END$$

DROP PROCEDURE IF EXISTS sp_listar_comentarios_publicos$$
CREATE PROCEDURE sp_listar_comentarios_publicos(IN p_tp_id INT UNSIGNED)
BEGIN
  SELECT c.comentario_publico_id, c.mensaje, c.created_at,
         u.nombre, u.apellido, r.nombre AS rol
  FROM comentario_publico c
  JOIN participaciones p ON c.participacion_id = p.participacion_id
  JOIN usuarios u ON p.usuario_id = u.usuario_id
  JOIN roles r ON p.rol_id = r.rol_id
  WHERE c.tp_id = p_tp_id
  ORDER BY c.created_at ASC;
END$$

DROP PROCEDURE IF EXISTS sp_crear_comentario_publico$$
CREATE PROCEDURE sp_crear_comentario_publico(
  IN p_tp_id INT UNSIGNED,
  IN p_participacion_id INT UNSIGNED,
  IN p_mensaje TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
  DECLARE v_id INT UNSIGNED;
  INSERT INTO comentario_publico (tp_id, participacion_id, mensaje)
  VALUES (p_tp_id, p_participacion_id, p_mensaje);
  SET v_id = LAST_INSERT_ID();

  SELECT c.comentario_publico_id, c.mensaje, c.created_at,
         u.nombre, u.apellido, r.nombre AS rol
  FROM comentario_publico c
  JOIN participaciones p ON c.participacion_id = p.participacion_id
  JOIN usuarios u ON p.usuario_id = u.usuario_id
  JOIN roles r ON p.rol_id = r.rol_id
  WHERE c.comentario_publico_id = v_id;
END$$

DROP PROCEDURE IF EXISTS sp_listar_trabajos_docente$$
CREATE PROCEDURE sp_listar_trabajos_docente(IN p_clase_id INT UNSIGNED)
BEGIN
  SELECT t.tp_id, t.descripcion, t.fecha_entrega, t.formatos_aceptados, t.nota_minima, t.created_at, t.participacion_id,
         (SELECT COUNT(*) FROM asignacion WHERE tp_id = t.tp_id) AS total_alumnos,
         (SELECT COUNT(*) FROM asignacion WHERE tp_id = t.tp_id AND estado = 'Pendiente') AS pendientes,
         (SELECT COUNT(*) FROM asignacion WHERE tp_id = t.tp_id AND estado = 'En revisión') AS en_revision,
         (SELECT COUNT(*) FROM asignacion WHERE tp_id = t.tp_id AND estado = 'Desaprobado') AS desaprobados,
         (SELECT COUNT(*) FROM asignacion WHERE tp_id = t.tp_id AND estado = 'Aprobado') AS aprobados
  FROM trabajos t
  WHERE t.clase_id = p_clase_id
  ORDER BY t.created_at DESC;
END$$

DROP PROCEDURE IF EXISTS sp_listar_trabajos_alumno$$
CREATE PROCEDURE sp_listar_trabajos_alumno(
  IN p_clase_id INT UNSIGNED,
  IN p_participacion_id INT UNSIGNED
)
BEGIN
  SELECT t.tp_id, t.descripcion, t.fecha_entrega, t.formatos_aceptados, t.nota_minima, t.created_at,
         a.estado, a.nota, a.asignacion_id
  FROM trabajos t
  JOIN asignacion a ON t.tp_id = a.tp_id
  WHERE t.clase_id = p_clase_id AND a.participacion_id = p_participacion_id
  ORDER BY t.created_at DESC;
END$$

DROP PROCEDURE IF EXISTS sp_obtener_trabajo_detalle$$
CREATE PROCEDURE sp_obtener_trabajo_detalle(IN p_tp_id INT UNSIGNED)
BEGIN
  SELECT t.*, c.clase_id, c.nombre AS clase_nombre
  FROM trabajos t
  JOIN clases c ON t.clase_id = c.clase_id
  WHERE t.tp_id = p_tp_id;
END$$

DROP PROCEDURE IF EXISTS sp_obtener_asignacion_alumno$$
CREATE PROCEDURE sp_obtener_asignacion_alumno(
  IN p_tp_id INT UNSIGNED,
  IN p_participacion_id INT UNSIGNED
)
BEGIN
  SELECT a.asignacion_id, a.estado, a.nota,
         (SELECT e.entrega_id FROM entrega e WHERE e.asignacion_id = a.asignacion_id ORDER BY e.created_at DESC LIMIT 1) AS entrega_id,
         (SELECT e.fecha_entrega FROM entrega e WHERE e.asignacion_id = a.asignacion_id ORDER BY e.created_at DESC LIMIT 1) AS fecha_entrega_alumno
  FROM asignacion a
  WHERE a.tp_id = p_tp_id AND a.participacion_id = p_participacion_id;
END$$

DROP PROCEDURE IF EXISTS sp_listar_trabajos_alumno_perfil$$
CREATE PROCEDURE sp_listar_trabajos_alumno_perfil(
  IN p_clase_id INT UNSIGNED,
  IN p_participacion_id INT UNSIGNED
)
BEGIN
  SELECT t.tp_id, t.descripcion, t.fecha_entrega, t.nota_minima,
         a.asignacion_id, a.nota, a.estado,
         (SELECT e.entrega_id FROM entrega e WHERE e.asignacion_id = a.asignacion_id ORDER BY e.created_at DESC LIMIT 1) AS entrega_id
  FROM trabajos t
  JOIN asignacion a ON t.tp_id = a.tp_id
  WHERE t.clase_id = p_clase_id AND a.participacion_id = p_participacion_id
  ORDER BY t.fecha_entrega ASC;
END$$

DELIMITER ;
