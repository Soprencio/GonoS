-- Migración: unificar el vocabulario de estados de entrega.
-- El estado 'Revisado' pasa a llamarse 'Desaprobado' para que el backend
-- y el frontend usen el mismo nombre (tras corregir, la entrega queda
-- Aprobado o Desaprobado; 'En revisión' se usa mientras está entregada).

USE gonos;

-- 1) Ampliar el ENUM temporalmente para que acepte tanto 'Revisado' como 'Desaprobado'
ALTER TABLE asignacion
  MODIFY estado ENUM('Pendiente', 'En revisión', 'Revisado', 'Desaprobado', 'Aprobado') NOT NULL DEFAULT 'Pendiente';

-- 2) Ahora que 'Desaprobado' es un valor válido, migrar los registros existentes
UPDATE asignacion SET estado = 'Desaprobado' WHERE estado = 'Revisado';

-- 3) Dejar el ENUM limpio sin el valor antiguo 'Revisado'
ALTER TABLE asignacion
  MODIFY estado ENUM('Pendiente', 'En revisión', 'Desaprobado', 'Aprobado') NOT NULL DEFAULT 'Pendiente';
