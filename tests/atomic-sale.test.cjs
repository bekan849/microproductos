const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const root = path.resolve(__dirname,'..');

test('Ventas atómicas y dashboard en PostgreSQL aislado', async t => {
  const db = new PGlite();
  try {
    await db.exec(fs.readFileSync(path.join(__dirname,'fixture.sql'),'utf8'));
    for (const name of fs.readdirSync(path.join(root,'supabase/migrations')).sort()) {
      await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',name),'utf8'));
    }
    const id = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
    async function seed() {
      await db.exec('TRUNCATE detalle_venta_lote,detalle_venta,venta,detalle_compra,compra,productos CASCADE');
      await db.query("INSERT INTO productos(idproducto,nombre,stock,estado) VALUES ($1,'A',20,'ACTIVO'),($2,'B',2,'ACTIVO')",[id(1),id(2)]);
      await db.query("INSERT INTO compra(idcompra,estado,total) VALUES ($1,'COMPLETADA',100),($2,'COMPLETADA',70),($3,'PENDIENTE',50)",[id(11),id(12),id(13)]);
      await db.query(`INSERT INTO detalle_compra(iddetallecompra,idcompra,idproducto,cantidad,preciocosto,stockrestante,creado_en) VALUES
        ($1,$4,$6,10,5,10,'2026-01-01'),($2,$5,$6,10,7,10,'2026-02-01'),($3,$4,$7,2,3,2,'2026-01-01')`,[id(21),id(22),id(23),id(11),id(12),id(1),id(2)]);
    }
    async function sale(items, extra={}) {
      return (await db.query('SELECT public.registrar_venta_completa_atomica($1::jsonb) AS result',[JSON.stringify({items,...extra})])).rows[0].result;
    }
    const item = (n,q,p=10) => ({idproducto:id(n),cantidad:q,precioventa:p});
    async function snapshot() {
      const rows={};
      for(const table of ['productos','compra','detalle_compra','venta','detalle_venta','detalle_venta_lote'])
        rows[table]=(await db.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows;
      return rows;
    }
    async function rejected(items, message, extra) {
      const before=await snapshot();
      await assert.rejects(()=>sale(items,extra),message);
      assert.deepEqual(await snapshot(),before,'El error debe revertir todos los cambios');
    }
    await t.test('PEPS distribuye 12 unidades entre dos lotes y calcula su costo',async()=>{
      await seed();const result=await sale([item(1,12)]);
      assert.equal(result.estado,'COMPLETADA');assert.equal(Number(result.total),120);
      assert.equal((await db.query('SELECT stock FROM productos WHERE idproducto=$1',[id(1)])).rows[0].stock,8);
      assert.deepEqual((await db.query('SELECT stockrestante FROM detalle_compra WHERE idproducto=$1 ORDER BY creado_en',[id(1)])).rows.map(x=>x.stockrestante),[0,8]);
      assert.equal(Number((await db.query('SELECT sum(subtotalcosto) AS costo FROM detalle_venta_lote')).rows[0].costo),64);
    });
    await t.test('Stock general insuficiente no crea venta',async()=>{await seed();await rejected([item(1,21)],/Stock insuficiente/);});
    await t.test('Stock en lotes insuficiente revierte la venta y detalle',async()=>{await seed();await db.query('UPDATE productos SET stock=30 WHERE idproducto=$1',[id(1)]);await rejected([item(1,21)],/Stock insuficiente en los lotes/);});
    await t.test('Un precio inválido en el segundo lote restaura el primero',async()=>{await seed();await rejected([item(1,12,6)],/precio de venta/);});
    await t.test('Un error en el segundo producto restaura el primero',async()=>{await seed();await rejected([item(1,2),item(2,1,1)],/precio de venta/);});
    await t.test('Productos repetidos, decimales, cero y precios negativos se rechazan',async()=>{
      await seed();await rejected([item(1,1),item(1,2)],/repetidos/);
      await rejected([item(1,1.5)],/entero/);await rejected([item(1,0)],/entero/);
      await rejected([item(1,1,-1)],/precioventa/);await rejected([],/al menos/);
    });
    await t.test('Los lotes pendientes no se consumen aunque tengan stockrestante',async()=>{
      await seed();await db.query("UPDATE compra SET estado='PENDIENTE' WHERE idcompra=$1",[id(11)]);
      await rejected([item(1,12)],/Stock insuficiente en los lotes/);
    });
    await t.test('Un producto inactivo se rechaza',async()=>{await seed();await db.query("UPDATE productos SET estado='INACTIVO' WHERE idproducto=$1",[id(1)]);await rejected([item(1,1)],/activos/);});
    await t.test('Agotar el stock desactiva el producto y una segunda venta falla',async()=>{
      await seed();await sale([item(1,20)]);assert.equal((await db.query('SELECT estado FROM productos WHERE idproducto=$1',[id(1)])).rows[0].estado,'INACTIVO');await rejected([item(1,1)],/activos/);
    });
    await t.test('Un fallo de escritura tardío también revierte toda la operación',async()=>{
      await seed();await db.exec("ALTER TABLE detalle_venta_lote ADD CONSTRAINT prueba_fallo CHECK (cantidad < 2)");
      await rejected([item(1,2)],/prueba_fallo/);await db.exec('ALTER TABLE detalle_venta_lote DROP CONSTRAINT prueba_fallo');
    });
    await t.test('RPC inaccesibles para clientes públicos',async()=>{
      for(const role of ['anon','authenticated']) {
        const rows=(await db.query("SELECT has_function_privilege($1,'public.registrar_venta_completa_atomica(jsonb)','EXECUTE') AS sale, has_function_privilege($1,'public.dashboard_inicial(boolean,boolean)','EXECUTE') AS dashboard",[role])).rows[0];
        assert.equal(rows.sale,false);assert.equal(rows.dashboard,false);
      }
      assert.equal((await db.query("SELECT has_function_privilege('service_role','public.registrar_venta_completa_atomica(jsonb)','EXECUTE') AS ok")).rows[0].ok,true);
    });
    await t.test('Dashboard calcula margen y omite secciones sin permiso',async()=>{
      await seed();await sale([item(1,12)]);
      const data=(await db.query('SELECT public.dashboard_inicial(true,true) AS data')).rows[0].data;
      assert.equal(data.resumenDia.ventasTotales,120);assert.equal(data.resumenDia.costoRealVentas,64);assert.equal(data.resumenDia.gananciaReal,56);
      assert.equal(data.productosVendidosHoy.length,1);assert.equal(data.gananciasMensuales.length,1);
      const limited=(await db.query('SELECT public.dashboard_inicial(false,true) AS data')).rows[0].data;
      assert.equal(limited.resumenDia,undefined);assert.equal(limited.gananciasMensuales,undefined);
      assert.equal(limited.productosVendidosHoy.length,1);
    });
  } finally { await db.close(); }
});
