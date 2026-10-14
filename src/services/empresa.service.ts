import { supabaseSystem as supabaseAdmin } from '../lib/supabase';
type AccesosUsuario = { usuario: unknown; roles: Array<{ idrol: string; nombre: string }>; permisos: Array<{ idpermiso: string; codigo: string }> };

export type Empresa = { idempresa: string; codigo: string; nombre: string };
export type AccesosEmpresa = AccesosUsuario & { empresa: Empresa };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function listarEmpresas(idusuario: string): Promise<Empresa[]> {
  const { data, error } = await supabaseAdmin.rpc('listar_empresas_usuario', { p_idusuario: idusuario });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error('Respuesta de empresas inválida');
  return data;
}
export async function obtenerAccesosEmpresa(idusuario: string, idempresa: string): Promise<AccesosEmpresa> {
  if (!uuid.test(idusuario) || !uuid.test(idempresa)) throw new Error('Empresa o usuario inválidos');
  const { data, error } = await supabaseAdmin.rpc('obtener_accesos_empresa', { p_idusuario: idusuario, p_idempresa: idempresa });
  // Sin respaldo a permisos globales, incluso cuando falta la migración.
  if (error) throw new Error(error.message);
  if (data?.usuario?.idusuario !== idusuario || data?.empresa?.idempresa !== idempresa ||
      !Array.isArray(data.roles) || !Array.isArray(data.permisos)) throw new Error('Respuesta de accesos inválida');
  return data;
}

