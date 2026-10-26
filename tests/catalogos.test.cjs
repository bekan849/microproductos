const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);
process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='qa-only';process.env.JWT_SECRET='qa-only-secret';process.env.NODE_ENV='production';
require('dotenv').config=()=>({parsed:{}});
const {supabaseSystem}=require('../src/lib/supabase.ts');
const {empresaContext}=require('../src/lib/empresa-context.ts');
const {validarCatalogo,guardarCatalogo,listarCatalogos,eliminarCatalogo,obtenerCatalogo}=require('../src/services/catalogo.service.ts');
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
const config={nombre:'Cascos',subtitulo:'Selección',telefono:'59168685121',mostrarPrecios:true,soloConStock:true,modo:'manual',productos:[id(1)],marca:'',categoria:''};
let calls=[], foreign=false;
supabaseSystem.from=table=>{
 const call={table,filters:[]};calls.push(call);
 const q={select(columns){call.columns=columns;return q},insert(value){call.value=value;return q},update(value){call.value=value;return q},delete(){return q},
 eq(k,v){call.filters.push([k,v]);return q},in(k,v){call.ids=v;return q},order(){return q},limit(){return q},
 maybeSingle(){return Promise.resolve({data:foreign?null:{idcatalogo:id(8),...call.value},error:null})},
 then(resolve,reject){return Promise.resolve({data:table==='productos'?(foreign?[]:(call.ids??[]).map(idproducto=>({idproducto}))):[],error:null}).then(resolve,reject)}};
 return q;
};
test('Valida datos, deduplica y no acepta identidad ni campos adicionales',()=>{
 assert.equal(validarCatalogo({...config,idempresa:id(9),token:'secret'}).idempresa,undefined);
 assert.equal(validarCatalogo({...config,productos:[id(1),id(1)]}).productos.length,1);
 for(const extra of [{telefono:'javascript:bad'},{mostrarPrecios:'true'},{productos:['bad']},{nombre:''},{modo:'other'}])
   assert.throws(()=>validarCatalogo({...config,...extra}));
});
test('Todas las consultas y escrituras quedan en la empresa autenticada',async()=>{
 calls=[]; foreign=false;
 await empresaContext.run({idempresa:id(10),idusuario:id(2),permisos:[]},async()=>{
  await guardarCatalogo(config);
  assert.equal(calls.find(c=>c.table==='catalogos').value.idempresa,id(10));
  assert.deepEqual(calls.find(c=>c.table==='productos').filters,[['idempresa',id(10)]]);
  calls=[];await guardarCatalogo(config,id(8));
  assert.ok(calls.at(-1).filters.some(([k,v])=>k==='idempresa'&&v===id(10)));
  calls=[];await listarCatalogos(true);assert.equal(calls[0].columns,"idcatalogo,nombre,actualizado_en");await obtenerCatalogo(id(8));await eliminarCatalogo(id(8));
  assert.ok(calls.every(c=>c.filters.some(([k,v])=>k==='idempresa'&&v===id(10))));
  foreign=true;await assert.rejects(()=>guardarCatalogo(config),/esta empresa/);
  await assert.rejects(()=>guardarCatalogo({...config,productos:[]},id(9)),/no encontrado/);
  await assert.rejects(()=>eliminarCatalogo(id(9)),/no encontrado/);await assert.rejects(()=>obtenerCatalogo(id(9)),/no encontrado/);
 });
 await assert.rejects(()=>listarCatalogos(),/contexto|empresa/i);
});
test('Las rutas exigen sesión y permisos vigentes para consultar y guardar',async()=>{
 const jwt=require('jsonwebtoken');
 let permissions=[];
 supabaseSystem.rpc=async()=>({data:{usuario:{idusuario:id(2)},empresa:{idempresa:id(10)},roles:[],permisos:permissions.map(codigo=>({codigo}))},error:null});
 const {app}=require('../src/app.ts');
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});
 const base='http://127.0.0.1:'+server.address().port+'/api/catalogos';
 const token=jwt.sign({version:2,tipo:'empresa',idusuario:id(2),idempresa:id(10)},process.env.JWT_SECRET,{expiresIn:'5m'});
 try {
   assert.equal((await fetch(base)).status,401);
   assert.equal((await fetch(base,{headers:{Authorization:'Bearer '+token}})).status,403);
   foreign=false; permissions=['productos.ver'];
   assert.equal((await fetch(base,{headers:{Authorization:'Bearer '+token}})).status,200);
   assert.equal((await fetch(base,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(config)})).status,403);
 permissions=['productos.ver','productos.editar'];
   assert.equal((await fetch(base,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(config)})).status,201);
   foreign=true;
   assert.equal((await fetch(base,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(config)})).status,400);
 } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});



test('Portadas: compatibilidad, formatos, tamaño y exclusión de auditoría',()=>{
 const {validarPortada}=require('../src/services/catalogo-portada.ts');
 const image='data:image/jpeg;base64,'+fs.readFileSync(require('node:path').join(__dirname,'fixtures/cover.jpg')).toString('base64');
 assert.equal(validarCatalogo(config).portada,null);
 for(const ajuste of ['contain','cover'])assert.deepEqual(validarPortada({imagen:image,ajuste}),{imagen:image,ajuste});
 for(const value of [{imagen:image,ajuste:'stretch'},{imagen:'https://example.invalid/image.jpg',ajuste:'cover'},
 {imagen:'data:image/svg+xml;base64,PHN2Zy8+',ajuste:'contain'},{imagen:'data:image/jpeg;base64,'+'A'.repeat(1200004),ajuste:'cover'},
 {imagen:'data:image/jpeg;base64,AAAAAA==',ajuste:'cover'}])assert.throws(()=>validarPortada(value));
 const {auditValues}=require('../src/services/audit.service.ts');
 assert.ok(!JSON.stringify(auditValues({nombre:'Catálogo',configuracion:{portada:{imagen:image,ajuste:'contain'}}})).includes('base64'));
});

test('Tipo de precio: predeterminado público, elección mayorista y rechazo de valores inválidos',()=>{
 assert.equal(validarCatalogo(config).tipoPrecio,'publico');
 assert.equal(validarCatalogo({...config,tipoPrecio:'mayorista'}).tipoPrecio,'mayorista');
 for(const tipoPrecio of ['costo','',null,1,{}])assert.throws(()=>validarCatalogo({...config,tipoPrecio}),/Tipo de precio/);
});
