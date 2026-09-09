-- Solo lectura. Ejecutar en SQL Editor antes de instalar las migraciones.
-- Revisar tipos, valores por defecto, columnas generadas y triggers existentes.
SELECT table_name, column_name, data_type, udt_name, column_default, is_generated
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN
  ('usuarios','roles','permisos','usuario_rol','rol_permiso','productos','compra','detalle_compra','venta','detalle_venta','detalle_venta_lote','marcas')
ORDER BY table_name, ordinal_position;

SELECT c.relname AS tabla, t.tgname AS trigger, pg_get_triggerdef(t.oid) AS definicion
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal
  AND c.relname IN ('productos','compra','detalle_compra','venta','detalle_venta','detalle_venta_lote');

SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN
  ('usuarios','usuario_rol','rol_permiso','venta','compra','detalle_compra','detalle_venta','detalle_venta_lote');
