const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);
process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='qa-only';process.env.JWT_SECRET='qa-secret-only';process.env.NODE_ENV='production';
require('dotenv').config=()=>({parsed:{}});
const jwt=require('jsonwebtoken');
const originalVerify=jwt.verify;let verifications=0;
jwt.verify=(...args)=>{verifications++;return originalVerify(...args);};
const {supabaseSystem}=require('../src/lib/supabase.ts');
let serverPermissions=[];
const actor='00000000-0000-0000-0000-000000000001',company='00000000-0000-0000-0000-000000000010';
let calls=[];let rpcError=null;
supabaseSystem.rpc=async(name,args)=>{if(name==='obtener_accesos_empresa')return {data:{usuario:{idusuario:actor},empresa:{idempresa:company},roles:[],permisos:serverPermissions.map(codigo=>({codigo}))},error:null};calls.push({name,args});return {data:rpcError?null:{idventa:'qa',estado:'COMPLETADA',...args},error:rpcError};};
supabaseSystem.from=()=>{throw Error('El registro completo no debe escribir mediante llamadas separadas');};
const {app}=require('../src/app.ts');

test('API de productos integra permisos, RPC y usuario autenticado',async t=>{
  const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
  const base='http://127.0.0.1:'+server.address().port;
  const token=permisos=>jwt.sign({version:2,tipo:'empresa',idusuario:actor,idempresa:company,permisos,roles:[]},process.env.JWT_SECRET,{expiresIn:'5m'});
  const request=(url,permisos,body)=>{serverPermissions=permisos??[];return fetch(base+url,{method:body?'POST':'GET',headers:{...(permisos?{Authorization:'Bearer '+token(permisos)}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});};
  try {
    await t.test('Sin token o sin permiso no se consulta la base',async()=>{
      calls=[];assert.equal((await request('/api/dashboard/inicial')).status,401);
      assert.equal((await request('/api/dashboard/inicial',[])).status,403);assert.equal(calls.length,0);
    });
    await t.test('Una verificación JWT y una RPC con permisos por sección',async()=>{
      calls=[];verifications=0;const response=await request('/api/dashboard/inicial',['ventas.ver']);
      assert.equal(response.status,200);assert.equal(verifications,1);assert.equal(calls.length,1);
      assert.deepEqual(calls[0],{name:'dashboard_empresa',args:{p_reportes:false,p_ventas:true,p_idempresa:company,p_idusuario:actor}});
    });
    await t.test('El responsable de la venta proviene del token',async()=>{
      calls=[];const response=await request('/api/ventas/registrar-completa',['ventas.crear'],{idusuario:'otro-usuario',items:[{idproducto:'producto',cantidad:1,precioventa:5}]});
      assert.equal(response.status,201);assert.equal(calls.length,1);assert.equal(calls[0].args.p_payload.idusuario,actor);
    });
    await t.test('Decimales y productos repetidos fallan antes de escribir',async()=>{
      calls=[];const item={idproducto:'producto',cantidad:1,precioventa:5};
      assert.equal((await request('/api/ventas/registrar-completa',['ventas.crear'],{items:[{...item,cantidad:1.5}]})).status,400);
      assert.equal((await request('/api/ventas/registrar-completa',['ventas.crear'],{items:[item,item]})).status,400);
      assert.equal(calls.length,0);
    });
    await t.test('Migración ausente produce error y no vuelve al flujo inseguro',async()=>{
      calls=[];rpcError={code:'PGRST202',message:'missing'};
      const response=await request('/api/ventas/registrar-completa',['ventas.crear'],{items:[{idproducto:'producto',cantidad:1,precioventa:5}]});
      assert.equal(response.status,400);assert.match((await response.json()).message,/migración/);assert.equal(calls.length,1);rpcError=null;
    });
  } finally { server.closeAllConnections();await new Promise(resolve=>server.close(resolve)); }
});
