-- Migración: agregar nota_minima a trabajos
-- Ejecutar manualmente:  mysql -u root -p gonos < database/migracion-nota-minima.sql
ALTER TABLE trabajos ADD COLUMN nota_minima DECIMAL(5,2) NOT NULL DEFAULT 6.00;
