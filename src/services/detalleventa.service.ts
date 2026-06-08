import { supabaseAdmin } from "../lib/supabase";
import { assertVentaEditable } from "./venta.service";

export type DetalleVentaCreate = {
  idproducto: string;
  cantidad: number;
  precioventa: number;
};

export type DetalleVentaUpdate = Partial<DetalleVentaCreate>;

async function recalcularTotalVenta(idventa: string) {
  const { data, error } = await supabaseAdmin
    .from("detalle_venta")
    .select("subtotal")
    .eq("idventa", idventa);

  if (error) throw new Error(error.message);

  const total = (data ?? []).reduce(
    (acc, row) => acc + Number(row.subtotal ?? 0),
    0
  );

  const { error: updateError } = await supabaseAdmin
    .from("venta")
    .update({ total })
    .eq("idventa", idventa);

  if (updateError) throw new Error(updateError.message);

  return total;
}

async function validarProductoVendible(idproducto: string) {
  const { data, error } = await supabaseAdmin
    .from("productos")
    .select("idproducto, nombre, estado, stock")
    .eq("idproducto", idproducto)
    .single();

  if (error || !data) {
    throw new Error("No se encontró el producto");
  }

  if (data.estado !== "ACTIVO") {
    throw new Error("Solo se pueden vender productos activos");
  }

  return data;
}

export async function listarDetalleVenta(idventa: string) {
  const { data, error } = await supabaseAdmin
    .from("detalle_venta")
    .select(`
      iddetalleventa,
      idventa,
      idproducto,
      cantidad,
      precioventa,
      subtotal,
      creado_en,
      productos:productos (
        idproducto,
        codigoprod,
        nombre,
        stock,
        estado
      )
    `)
    .eq("idventa", idventa)
    .order("creado_en", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function agregarLineaVenta(
  idventa: string,
  payload: DetalleVentaCreate
) {
  await assertVentaEditable(idventa);

  if (!payload.idproducto) throw new Error("idproducto es obligatorio");

  const cantidad = Number(payload.cantidad);
  const precioventa = Number(payload.precioventa);

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new Error("cantidad inválida");
  }

  if (!Number.isFinite(precioventa) || precioventa < 0) {
    throw new Error("precioventa inválido");
  }

  await validarProductoVendible(payload.idproducto);

  const { data, error } = await supabaseAdmin
    .from("detalle_venta")
    .insert([
      {
        idventa,
        idproducto: payload.idproducto,
        cantidad,
        precioventa,
      },
    ])
    .select(`
      iddetalleventa,
      idventa,
      idproducto,
      cantidad,
      precioventa,
      subtotal,
      creado_en
    `)
    .single();

  if (error) throw new Error(error.message);

  await recalcularTotalVenta(idventa);

  return data;
}

export async function editarLineaVenta(
  idventa: string,
  iddetalleventa: string,
  payload: DetalleVentaUpdate
) {
  await assertVentaEditable(idventa);

  const { data: actual, error: actualError } = await supabaseAdmin
    .from("detalle_venta")
    .select("iddetalleventa, idproducto, cantidad, precioventa")
    .eq("iddetalleventa", iddetalleventa)
    .eq("idventa", idventa)
    .single();

  if (actualError || !actual) {
    throw new Error("No se encontró la línea de detalle");
  }

  const nextIdProducto =
    payload.idproducto !== undefined ? payload.idproducto : actual.idproducto;

  const nextCantidad =
    payload.cantidad !== undefined
      ? Number(payload.cantidad)
      : Number(actual.cantidad);

  const nextPrecioVenta =
    payload.precioventa !== undefined
      ? Number(payload.precioventa)
      : Number(actual.precioventa);

  if (!nextIdProducto) {
    throw new Error("idproducto inválido");
  }

  if (!Number.isFinite(nextCantidad) || nextCantidad <= 0) {
    throw new Error("cantidad inválida");
  }

  if (!Number.isFinite(nextPrecioVenta) || nextPrecioVenta < 0) {
    throw new Error("precioventa inválido");
  }

  await validarProductoVendible(nextIdProducto);

  const update: Record<string, any> = {
    idproducto: nextIdProducto,
    cantidad: nextCantidad,
    precioventa: nextPrecioVenta,
  };

  const { data, error } = await supabaseAdmin
    .from("detalle_venta")
    .update(update)
    .eq("iddetalleventa", iddetalleventa)
    .eq("idventa", idventa)
    .select(`
      iddetalleventa,
      idventa,
      idproducto,
      cantidad,
      precioventa,
      subtotal,
      creado_en
    `)
    .single();

  if (error) throw new Error(error.message);

  await recalcularTotalVenta(idventa);

  return data;
}

export async function eliminarLineaVenta(
  idventa: string,
  iddetalleventa: string
) {
  await assertVentaEditable(idventa);

  const { error } = await supabaseAdmin
    .from("detalle_venta")
    .delete()
    .eq("iddetalleventa", iddetalleventa)
    .eq("idventa", idventa);

  if (error) throw new Error(error.message);

  await recalcularTotalVenta(idventa);

  return { ok: true };
}