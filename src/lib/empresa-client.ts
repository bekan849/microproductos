import type { SupabaseClient } from '@supabase/supabase-js';
import { empresaContext, requireEmpresaContext } from './empresa-context';

const scopedTables = new Set(['categorias','marcas','proveedor','productos','productos_list_view',
  'compra','detalle_compra','venta','detalle_venta','detalle_venta_lote',
  'roles','usuario_rol','rol_permiso','historial_acciones','v_usuario_permisos']);
const rpcNames: Record<string,string> = {
  registrar_venta_completa_atomica: 'registrar_venta_empresa',
  dashboard_inicial: 'dashboard_empresa',
  registrar_compra_empresa: 'registrar_compra_empresa',
};

/** La API privilegiada de Supabase no aplica RLS: todos los accesos de negocio
 * pasan por este límite. No exporta consultas sin empresa ni RPC desconocidas. */
export function createEmpresaClient(client: SupabaseClient): SupabaseClient {
  return new Proxy(client, {
    get(target, property) {
      if (property === 'from') return (table: string) => {
        if (!scopedTables.has(table) && !['usuarios','permisos'].includes(table))
          throw new Error('Tabla no habilitada para consultas de empresa');
        const source = target.from(table);
        return new Proxy(source, {
          get(builder, action) {
            if (!['select','insert','update','delete'].includes(String(action)))
              throw new Error('Operación de empresa no habilitada');
            return (...args: any[]) => {
              const context = empresaContext.getStore();
              if (table === 'historial_acciones' && action === 'insert' && !context) {
                return builder.insert({ ...args[0], idempresa: null });
              }
              const scope = requireEmpresaContext();
              if (table === 'permisos') {
                if (action !== 'select') throw new Error('El catálogo de permisos es administrado por el sistema');
                return builder.select(...args);
              }
              if (table === 'usuarios') {
                if (action !== 'select') throw new Error('La identidad compartida requiere una operación autorizada');
                return builder.select(`${args[0] || '*'},__empresa:empresa_usuario!inner(idempresa,activa)`, args[1])
                  .eq('__empresa.idempresa',scope.idempresa);
              }
              if (action === 'insert') {
                const values = (Array.isArray(args[0]) ? args[0] : [args[0]]).map((row: any) => {
                  if (!row || typeof row !== 'object') throw new Error('Registro inválido');
                  if (row.idempresa !== undefined && row.idempresa !== scope.idempresa) throw new Error('Empresa incompatible');
                  return { ...row, idempresa: scope.idempresa,
                    ...(['compra','venta'].includes(table) ? { idusuario: scope.idusuario } : {}) };
                });
                return builder.insert(Array.isArray(args[0]) ? values : values[0], args[1]);
              }
              if (action === 'update' && Object.prototype.hasOwnProperty.call(args[0] ?? {}, 'idempresa'))
                throw new Error('No se puede trasladar un registro a otra empresa');
              const method = Reflect.get(builder, action) as (...input: any[]) => any;
              return method.apply(builder,args).eq('idempresa',scope.idempresa);
            };
          },
        });
      };
      if (property === 'rpc') return (name: string, args: Record<string,unknown> = {}) => {
        const scope = requireEmpresaContext();
        if (!rpcNames[name]) throw new Error('RPC no habilitada para empresas');
        return target.rpc(rpcNames[name], { ...args,p_idempresa:scope.idempresa,p_idusuario:scope.idusuario });
      };
      throw new Error('Acceso de sistema no disponible en el cliente de empresa');
    },
  });
}
