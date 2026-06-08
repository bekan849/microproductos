import { supabaseAdmin } from "../lib/supabase";

export type CategoriaCreate = { nombre: string; descripcion?: string | null };
export type CategoriaUpdate = { nombre?: string; descripcion?: string | null };

export async function listarCategorias() {
  const { data, error } = await supabaseAdmin
    .from("categorias")
    .select("idcategoria, nombre, descripcion, estado, creado_en")
    .order("creado_en", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crearCategoria(payload: CategoriaCreate) {
  const nombre = payload.nombre?.trim();
  if (!nombre) throw new Error("El nombre es obligatorio");

  const { data, error } = await supabaseAdmin
    .from("categorias")
    .insert([{ nombre, descripcion: payload.descripcion ?? null }])
    .select("idcategoria, nombre, descripcion, estado, creado_en")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function actualizarCategoria(idcategoria: string, payload: CategoriaUpdate) {
  if (!idcategoria) throw new Error("Falta idcategoria");

  const update: Record<string, any> = {};
  if (payload.nombre !== undefined) {
    const nombre = payload.nombre.trim();
    if (!nombre) throw new Error("El nombre no puede quedar vacío");
    update.nombre = nombre;
  }
  if (payload.descripcion !== undefined) update.descripcion = payload.descripcion ?? null;

  const { data, error } = await supabaseAdmin
    .from("categorias")
    .update(update)
    .eq("idcategoria", idcategoria)
    .select("idcategoria, nombre, descripcion, estado, creado_en")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function setEstadoCategoria(idcategoria: string, estado: boolean) {
  const { data, error } = await supabaseAdmin
    .from("categorias")
    .update({ estado })
    .eq("idcategoria", idcategoria)
    .select("idcategoria, nombre, descripcion, estado, creado_en")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
export async function eliminarCategoria(idcategoria: string) {
  if (!idcategoria) throw new Error("Falta idcategoria");

  const { data, error } = await supabaseAdmin
    .from("categorias")
    .delete()
    .eq("idcategoria", idcategoria)
    .select("idcategoria, nombre, descripcion, estado, creado_en")
    .single();

  if (error) throw new Error(error.message);
  return data;
}