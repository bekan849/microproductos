import { supabaseAdmin } from "../lib/supabase";

export type MarcaCreate = { nombre: string; descripcion?: string | null };
export type MarcaUpdate = { nombre?: string; descripcion?: string | null };

export async function listarMarcas() {
  const { data, error } = await supabaseAdmin
    .from("marcas")
    .select("idmarca, nombre, descripcion, estado, creado_en")
    .order("creado_en", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crearMarca(payload: MarcaCreate) {
  const nombre = payload.nombre?.trim();
  if (!nombre) throw new Error("El nombre es obligatorio");

  const { data, error } = await supabaseAdmin
    .from("marcas")
    .insert([{ nombre, descripcion: payload.descripcion ?? null }])
    .select("idmarca, nombre, descripcion, estado, creado_en")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function actualizarMarca(idmarca: string, payload: MarcaUpdate) {
  if (!idmarca) throw new Error("Falta idmarca");

  const update: Record<string, any> = {};
  if (payload.nombre !== undefined) {
    const nombre = payload.nombre.trim();
    if (!nombre) throw new Error("El nombre no puede quedar vacío");
    update.nombre = nombre;
  }
  if (payload.descripcion !== undefined) update.descripcion = payload.descripcion ?? null;

  const { data, error } = await supabaseAdmin
    .from("marcas")
    .update(update)
    .eq("idmarca", idmarca)
    .select("idmarca, nombre, descripcion, estado, creado_en")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function setEstadoMarca(idmarca: string, estado: boolean) {
  const { data, error } = await supabaseAdmin
    .from("marcas")
    .update({ estado })
    .eq("idmarca", idmarca)
    .select("idmarca, nombre, descripcion, estado, creado_en")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
export async function eliminarMarca(idmarca: string) {
  if (!idmarca) throw new Error("Falta idmarca");

  const { data, error } = await supabaseAdmin
    .from("marcas")
    .delete()
    .eq("idmarca", idmarca)
    .select("idmarca, nombre, descripcion, estado, creado_en")
    .single();

  if (error) throw new Error(error.message);
  return data;
}