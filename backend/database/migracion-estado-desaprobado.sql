-- Migración: unificar el vocabulario de estados de entrega.
-- El estado 'Revisado' pasa a llamarse 'Desaprobado' para que el backend
-- y el frontend usen el mismo nombre (tras corregir, la entrega queda
-- Aprobado o Desaprobado; 'En revisión' se usa mientras está entregada).

-- 1) Actualizar datos existentes ANTES de cambiar el ENUM
UPDATE asignacion SET estado = 'Desaprobado' WHERE estado = 'Revisado';

-- 2) Cambiar el ENUM de la columna
ALTER TABLE asignacion
  MODIFY estado ENUM('Pendiente','En revisión','Desaprobado','Aprobado') NOT NULL DEFAULT 'Pendiente';
