import { supabaseAdmin } from "../lib/supabase";

export type ProveedorCreate = {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
};

export type ProveedorUpdate = Partial<ProveedorCreate>;

export async function listarProveedores() {
  const { data, error } = await supabaseAdmin
    .from("proveedor")
    .select("idproveedor, nombre, email, telefono, direccion, estado, creado_en")
    .order("creado_en", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crearProveedor(payload: ProveedorCreate) {
  const nombre = payload.nombre?.trim();
  if (!nombre) throw new Error("El nombre es obligatorio");

  const { data, error } = await supabaseAdmin
    .from("proveedor")
    .insert([{
      nombre,
      email: payload.email ?? null,
      telefono: payload.telefono ?? null,
      direccion: payload.direccion ?? null
    }])
    .select("idproveedor, nombre, email, telefono, direccion, estado, creado_en")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function actualizarProveedor(idproveedor: string, payload: ProveedorUpdate) {
  if (!idproveedor) throw new Error("Falta idproveedor");

  const update: Record<string, any> = {};
  if (payload.nombre !== undefined) {
    const nombre = payload.nombre.trim();
    if (!nombre) throw new Error("El nombre no puede quedar vacío");
    update.nombre = nombre;
  }
  if (payload.email !== undefined) update.email = payload.email ?? null;
  if (payload.telefono !== undefined) update.telefono = payload.telefono ?? null;
  if (payload.direccion !== undefined) update.direccion = payload.direccion ?? null;

  const { data, error } = await supabaseAdmin
    .from("proveedor")
    .update(update)
    .eq("idproveedor", idproveedor)
    .select("idproveedor, nombre, email, telefono, direccion, estado, creado_en")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function setEstadoProveedor(idproveedor: string, estado: boolean) {
  const { data, error } = await supabaseAdmin
    .from("proveedor")
    .update({ estado })
    .eq("idproveedor", idproveedor)
    .select("idproveedor, nombre, email, telefono, direccion, estado, creado_en")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
export async function eliminarProveedor(idproveedor: string) {
  if (!idproveedor) throw new Error("Falta idproveedor");

  const { data, error } = await supabaseAdmin
    .from("proveedor")
    .delete()
    .eq("idproveedor", idproveedor)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}