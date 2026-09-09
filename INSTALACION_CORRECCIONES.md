# Correcciones de SIS-STOCK

## Orden de instalación

1. Ejecutar `supabase/checks/preflight.sql` en el SQL Editor de Supabase y revisar el resultado. El esquema real no se pudo consultar: el hostname configurado no resolvió (ENOTFOUND).
2. Instalar la migración de `microusuarios`: `202609070001_optimize_auth_session.sql`.
3. Instalar las migraciones de este proyecto en orden: `202609070001_dashboard_performance.sql`, luego `202609070002_atomic_sale_registration.sql`.
4. Compilar/desplegar `microusuarios`, después `microproductos` y finalmente el frontend. Instalar el SQL ANTES de arrancar el backend actualizado para atender ventas completas.
5. Mantener el mismo secreto JWT en ambos microservicios. Usar `NODE_ENV=production`. `CORS_ORIGIN` admite orígenes explícitos separados por comas; las credenciales no usan un origen comodín.
6. Verificar con datos de prueba en una base de pruebas: inicio de sesión, recarga, dashboard, venta correcta, falta de stock y error de precio en el segundo lote. No ejecutar `tests/fixture.sql` en producción.

Las funciones se ejecutan como invocador y solo se conceden a `service_role`. El frontend nunca recibe esa clave. El backend conserva la comprobación de permisos antes de invocar las funciones.

## Compatibilidad del esquema

Las funciones usan tipos de las tablas mediante `%ROWTYPE` y `jsonb_populate_record`, incluyendo los identificadores y el estado de productos. Las pruebas usan UUID, estados ENUM, cantidades enteras y subtotales generados.

Se requieren las tablas/columnas que ya usa el código. `venta.fechaventa`, `compra.fechaingreso` y las fechas de creación deben ser compatibles con timestamps. Las claves primarias de ventas y detalles deben tener sus valores por defecto. El detalle de venta obtiene `subtotal` de la base como en el código anterior. `detalle_venta_lote.subtotalcosto` debe aceptar inserciones explícitas, como antes.

Revisar especialmente los triggers: si alguno ya descuenta stock al insertar detalles/completar ventas, no instalar sin adaptarlo, pues duplicaría el movimiento. Los índices `IF NOT EXISTS` se comparan por nombre, por lo que se debe comprobar si ya existen índices equivalentes con otro nombre. Crear índices puede bloquear escrituras brevemente; elegir un momento sin operaciones activas.

## Alcance

- `POST /api/ventas/registrar-completa` realiza una sola RPC transaccional, aplica PEPS, bloquea productos/lotes, rechaza repetidos y decimales, y revierte todo ante errores. No tiene respaldo al antiguo flujo inseguro.
- El responsable de esa venta proviene del usuario autenticado.
- `GET /api/dashboard/inicial` agrupa resumen diario/mensual, serie mensual y últimas 20 líneas vendidas en horario de Bolivia. Cada sección respeta `reportes.ver` o `ventas.ver`.
- Login y accesos usan RPC; si PostgREST indica que la función no existe, conservan un respaldo compatible. Otros errores no se ocultan con ese respaldo.
- JWT se verifica una vez por solicitud en productos. Se quitan logs de usuario/cuerpo y los logs de solicitudes en producción.
- Editar un detalle de compra pendiente conserva su stock restante en cero.

## Límites y trabajo posterior

Las compras completas y los cambios de estado de compras/ventas mantienen sus operaciones separadas anteriores. No se afirma atomicidad para esos caminos ni protección completa frente a ellos ejecutándose al mismo tiempo que una venta. Hay que migrarlos también a transacciones antes de considerar robusto todo el inventario concurrente. Las llamadas concurrentes al nuevo registro completo toman bloqueos de fila; las pruebas embebidas verifican rollback, pero no simulan varias conexiones PostgreSQL reales.

`microproductos` todavía autoriza usando los permisos del JWT; retirar permisos o bloquear una cuenta no invalida inmediatamente ese token allí. El servicio de usuarios sí consulta los permisos actuales. No se agregó caché de permisos en el backend.

No se ha reparado el inventario histórico ni se han sumado las 10 unidades mencionadas en el chat. `supabase/checks/inventario_diagnostico.sql` ayuda a localizar diferencias sin modificar datos; las correcciones requieren identificar producto, lote y comprobantes reales.

No se ha ejecutado SQL en Supabase ni se ha desplegado ningún servicio.

## Pruebas reproducibles

Con las dependencias del proyecto instaladas, ejecutar `node --test tests/api.test.cjs`.

Para las pruebas SQL se usa PostgreSQL embebido en memoria (PGlite), sin conectarse a Supabase:

```powershell
npm.cmd install --prefix .test-runtime @electric-sql/pglite --ignore-scripts --no-audit --no-fund
$env:PGLITE_MODULE = (Resolve-Path '.test-runtime/node_modules/@electric-sql/pglite').Path
node --test tests/atomic-sale.test.cjs
```

No incluir `.test-runtime` en Git. La prueba crea su propio esquema mínimo, que no constituye una copia certificada de la base real.

Referencias de implementación: [funciones de Supabase](https://supabase.com/docs/guides/database/functions) y [bloqueos de PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html).
