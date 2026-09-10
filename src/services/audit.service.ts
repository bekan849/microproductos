import { supabaseAdmin } from "../lib/supabase";

// Explicit business-field allowlist. Never persist request headers or raw bodies.
const fields = new Set("idusuario nombre apellido email estado idrol idpermiso codigo modulo idusuariorol idrolpermiso idproducto idcategoria idmarca idproveedor idcompra idventa iddetallecompra iddetalleventa cantidad stock stockminimo stockrestante precioventa preciomayor preciocosto precio total subtotal fechaventa fechaingreso codigoprod descripcion telefono direccion urlimagen nit".split(" "));
const containers = new Set(["items", "detalles", "venta", "compra", "producto", "usuario"]);
export function auditValues(value: unknown, depth = 0): unknown {
  if (!value || typeof value !== "object" || depth > 3) return null;
  if (Array.isArray(value)) return value.slice(0, 200).map(v => auditValues(v, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (fields.has(key) && (v === null || ["string", "boolean", "number"].includes(typeof v))) {
      result[key] = typeof v === "string" ? v.slice(0, 250) : v;
    } else if (containers.has(key)) result[key] = auditValues(v, depth + 1);
  }
  return result;
}

export const auditTables: Record<string, [string, string]> = {
  usuarios: ["usuarios", "idusuario"], roles: ["roles", "idrol"], permisos: ["permisos", "idpermiso"],
  "usuario-rol": ["usuario_rol", "idusuariorol"], "rol-permiso": ["rol_permiso", "idrolpermiso"],
  productos: ["productos", "idproducto"], categorias: ["categorias", "idcategoria"],
  marcas: ["marcas", "idmarca"], proveedores: ["proveedor", "idproveedor"],
  compras: ["compra", "idcompra"], ventas: ["venta", "idventa"],
  detalle_compra: ["detalle_compra", "iddetallecompra"], detalle_venta: ["detalle_venta", "iddetalleventa"],
};

export async function auditSnapshot(resource: string, id: string | null, body: any) {
  const table = auditTables[resource];
  if (!table) return { values: null, available: true };
  try {
    let query = supabaseAdmin.from(table[0]).select("*");
    if (id) query = query.eq(table[1], id);
    else if (resource === "usuario-rol" && body?.idusuario && body?.idrol)
      query = query.eq("idusuario", body.idusuario).eq("idrol", body.idrol);
    else if (resource === "rol-permiso" && body?.idrol && body?.idpermiso)
      query = query.eq("idrol", body.idrol).eq("idpermiso", body.idpermiso);
    else return { values: null, available: true };
    const { data, error } = await query.abortSignal(AbortSignal.timeout(4000)).maybeSingle();
    return { values: error ? null : auditValues(data), available: !error };
  } catch { return { values: null, available: false }; }
}

export async function appendAudit(event: Record<string, unknown>): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from("historial_acciones").insert(event)
      .abortSignal(AbortSignal.timeout(4000));
    if (error) throw error;
    return true;
  } catch {
    // The business operation may already be committed. Never report it as failed or retry it.
    console.error("No se pudo guardar un evento del historial. Revisar migración y conexión de auditoría.");
    return false;
  }
}

export function auditFilters(input: Record<string, unknown>) {
  const page = Number(input.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error("Página inválida");
  const text = (key: string) => {
    if (input[key] === undefined || input[key] === "") return "";
    if (typeof input[key] !== "string" || input[key].length > 100) throw new Error("Filtro inválido");
    return input[key] as string;
  };
  const date = (key: string) => {
    const value = text(key);
    if (!value) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)
      throw new Error("Fecha inválida");
    return value;
  };
  const desde = date("desde"), hasta = date("hasta");
  if (desde && hasta && desde > hasta) throw new Error("La fecha inicial debe ser anterior a la final");
  const accion = text("accion"), resultado = text("resultado");
  if (accion && !["crear", "editar", "eliminar", "cambiar_estado", "cambiar_password", "registrar_completa", "iniciar_sesion", "cerrar_sesion"].includes(accion)) throw new Error("Acción inválida");
  if (resultado && !["exito", "error"].includes(resultado)) throw new Error("Resultado inválido");
  return { page, desde, hasta, accion, resultado, usuario: text("usuario"), recurso: text("recurso") };
}

export async function listAudit(service: string, input: Record<string, unknown>) {
  const f = auditFilters(input), limit = 25;
  let q = supabaseAdmin.from("historial_acciones").select("*", { count: "exact" })
    .eq("servicio", service).order("fecha", { ascending: false }).order("id", { ascending: false })
    .range((f.page - 1) * limit, f.page * limit - 1);
  if (f.usuario) q = q.ilike("actor_email", "%" + f.usuario.replace(/[%_\\]/g, "\\$&") + "%");
  if (f.accion) q = q.eq("accion", f.accion);
  if (f.recurso) q = q.eq("recurso", f.recurso);
  if (f.resultado) q = q.eq("resultado", f.resultado);
  if (f.desde) q = q.gte("fecha", f.desde + "T00:00:00-04:00");
  if (f.hasta) q = q.lt("fecha", new Date(Date.parse(f.hasta + "T00:00:00-04:00") + 86400000).toISOString());
  const { data, error, count } = await q.abortSignal(AbortSignal.timeout(10000));
  if (error) throw new Error("No se pudo consultar el historial. Comprueba su instalación y la conexión.");
  return { data: data ?? [], total: count ?? 0, page: f.page, limit };
}
