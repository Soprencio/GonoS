-- =============================================================================
-- GonoS — Datos de prueba para desarrollo
-- =============================================================================
-- Ejecutar DESPUÉS de schema.sql:
--   mysql -u root -p gonos < seed-dev.sql
-- =============================================================================

USE gonos;

-- Contraseña de todos los usuarios de prueba: "test1234"
-- Hash generado con bcrypt (salt rounds: 10)
-- =============================================================================

-- USUARIOS
INSERT INTO usuarios (mail, nombre, apellido, password_hash) VALUES
  ('juan@example.com',  'Juan',   'Pérez',  '$2a$10$MsYERowpc3MNSOQKQUGiiupCwRE9i.JRI2N02NYfOBLhHAq38bDP6'),
  ('maria@example.com', 'María',  'García', '$2a$10$MsYERowpc3MNSOQKQUGiiupCwRE9i.JRI2N02NYfOBLhHAq38bDP6'),
  ('carlos@example.com','Carlos', 'López',  '$2a$10$MsYERowpc3MNSOQKQUGiiupCwRE9i.JRI2N02NYfOBLhHAq38bDP6');

-- CLASE
INSERT INTO clases (nombre, descripcion, codigo) VALUES
  ('Diseño Arquitectónico 2026', 'Materia de diseño arquitectónico asistido por computadora', 'ABC123');

-- PARTICIPACIONES
-- roles: 1=Creador, 2=Profesor, 3=Alumno
INSERT INTO participaciones (usuario_id, clase_id, rol_id) VALUES
  (1, 1, 2),  -- Juan es Profesor en la clase
  (2, 1, 3),  -- María es Alumna
  (3, 1, 3);  -- Carlos es Alumno

-- TRABAJO
INSERT INTO trabajos (clase_id, participacion_id, descripcion, fecha_entrega, formatos_aceptados) VALUES
  (1, 1,
   'Diseñar y modelar una casa patio de 60m². Entregar archivo .obj o .stl del modelo 3D más una planta en .svg.',
   DATE_ADD(NOW(), INTERVAL 14 DAY),
   '[\".obj\", \".stl\", \".svg\"]');

-- ASIGNACIONES (creadas automáticamente para cada alumno)
INSERT INTO asignacion (tp_id, participacion_id) VALUES
  (1, 2),  -- María
  (1, 3);  -- Carlos
