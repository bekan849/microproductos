import { supabaseAdmin } from "../lib/supabase";
export type CatalogoConfig = {
  nombre: string; subtitulo: string; telefono: string; mostrarPrecios: boolean;
  soloConStock: boolean; modo: "manual" | "automatico"; productos: string[];
  marca: string; categoria: string;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validarId(id: string) { if (!uuid.test(id)) throw new Error("Identificador inválido"); return id; }
export function validarCatalogo(input: unknown): CatalogoConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Catálogo inválido");
  const b = input as Record<string, unknown>;
  const str = (key: string, max: number) => {
    if (typeof b[key] !== "string" || (b[key] as string).length > max) throw new Error("Campo inválido: " + key);
    return (b[key] as string).trim();
  };
  const nombre = str("nombre", 80), subtitulo = str("subtitulo", 160), telefono = str("telefono", 15);
  if (!nombre || (telefono && !/^[1-9][0-9]{7,14}$/.test(telefono))) throw new Error("Revisa el título o el número de WhatsApp con código de país");
  if (typeof b.mostrarPrecios !== "boolean" || typeof b.soloConStock !== "boolean" || !["manual", "automatico"].includes(String(b.modo)))
    throw new Error("Configuración inválida");
  if (!Array.isArray(b.productos) || b.productos.length > 1000 || b.productos.some(id => typeof id !== "string" || !uuid.test(id)))
    throw new Error("Selecciona hasta 1000 productos válidos");
  const marca = str("marca", 36), categoria = str("categoria", 36);
  if (marca) validarId(marca); if (categoria) validarId(categoria);
  return { nombre, subtitulo, telefono, mostrarPrecios: b.mostrarPrecios, soloConStock: b.soloConStock,
    modo: b.modo as CatalogoConfig["modo"], productos: [...new Set(b.productos as string[])], marca, categoria };
}
const columns = "idcatalogo,nombre,configuracion,actualizado_en";
function dbError(error: {code?: string} | null) {
  if (!error) return;
  if (["42P01","PGRST205"].includes(error.code ?? "")) throw new Error("Falta aplicar la migración de catálogos en la base de datos");
  throw new Error("No se pudo guardar o consultar el catálogo");
}
export async function listarCatalogos() {
  const { data, error } = await supabaseAdmin.from("catalogos").select(columns).order("actualizado_en", { ascending: false }).limit(200);
  dbError(error); return data;
}
export async function guardarCatalogo(input: unknown, id?: string) {
  const config = validarCatalogo(input);
  // Verify selections belong to the authenticated company, in bounded batches.
  for (let start = 0; start < config.productos.length; start += 100) {
    const ids = config.productos.slice(start, start + 100);
    const { data, error } = await supabaseAdmin.from("productos").select("idproducto").in("idproducto", ids);
    dbError(error);
    if (data?.length !== ids.length) throw new Error("La selección contiene productos no disponibles en esta empresa");
  }
  const row = { nombre: config.nombre, configuracion: config, actualizado_en: new Date().toISOString() };
  const query = id ? supabaseAdmin.from("catalogos").update(row).eq("idcatalogo", validarId(id)) : supabaseAdmin.from("catalogos").insert(row);
  const { data, error } = await query.select(columns).maybeSingle();
  dbError(error);
  if (!data) throw new Error("Catálogo no encontrado en esta empresa");
  return data;
}
export async function eliminarCatalogo(id: string) {
  const { data, error } = await supabaseAdmin.from("catalogos").delete().eq("idcatalogo", validarId(id)).select("idcatalogo").maybeSingle();
  dbError(error); if (!data) throw new Error("Catálogo no encontrado en esta empresa"); return data;
}

