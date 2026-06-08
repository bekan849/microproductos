import { supabaseAdmin } from "../lib/supabase";
import { assertCompraEditable } from "./compra.service";

export type DetalleCompraCreate = {
  idproducto: string;
  cantidad: number;
  preciocosto: number;
};

export type DetalleCompraUpdate = Partial<DetalleCompraCreate>;

async function recalcularTotalCompra(idcompra: string) {
  const { data, error } = await supabaseAdmin
    .from("detalle_compra")
    .select("subtotal")
    .eq("idcompra", idcompra);

  if (error) throw new Error(error.message);

  const total = (data ?? []).reduce(
    (acc, row) => acc + Number(row.subtotal ?? 0),
    0
  );

  const { error: updateError } = await supabaseAdmin
    .from("compra")
    .update({ total })
    .eq("idcompra", idcompra);

  if (updateError) throw new Error(updateError.message);

  return total;
}

export async function listarDetalleCompra(idcompra: string) {
  const { data, error } = await supabaseAdmin
    .from("detalle_compra")
    .select(`
      iddetallecompra,
      idcompra,
      idproducto,
      cantidad,
      preciocosto,
      subtotal,
      stockrestante,
      creado_en,
      productos:productos (
        idproducto,
        codigoprod,
        nombre,
        estado
      )
    `)
    .eq("idcompra", idcompra)
    .order("creado_en", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function agregarLineaCompra(
  idcompra: string,
  payload: DetalleCompraCreate
) {
  const compra = await assertCompraEditable(idcompra);

  if (!payload.idproducto) throw new Error("idproducto es obligatorio");
  if (!Number.isFinite(payload.cantidad) || payload.cantidad <= 0) {
    throw new Error("cantidad inválida");
  }
  if (!Number.isFinite(payload.preciocosto) || payload.preciocosto < 0) {
    throw new Error("preciocosto inválido");
  }

  const { data, error } = await supabaseAdmin
    .from("detalle_compra")
    .insert([
      {
        idcompra,
        idproducto: payload.idproducto,
        cantidad: payload.cantidad,
        preciocosto: payload.preciocosto,
        stockrestante: compra.estado === "COMPLETADA" ? payload.cantidad : 0,
      },
    ])
    .select(`
      iddetallecompra,
      idcompra,
      idproducto,
      cantidad,
      preciocosto,
      subtotal,
      stockrestante,
      creado_en
    `)
    .single();

  if (error) throw new Error(error.message);

  await recalcularTotalCompra(idcompra);

  return data;
}

export async function editarLineaCompra(
  idcompra: string,
  iddetallecompra: string,
  payload: DetalleCompraUpdate
) {
  await assertCompraEditable(idcompra);

  const { data: actual, error: actualError } = await supabaseAdmin
    .from("detalle_compra")
    .select("iddetallecompra, idproducto, cantidad, preciocosto, stockrestante")
    .eq("iddetallecompra", iddetallecompra)
    .eq("idcompra", idcompra)
    .single();

  if (actualError || !actual) {
    throw new Error("No se encontró la línea de detalle");
  }

  const nextCantidad =
    payload.cantidad !== undefined
      ? Number(payload.cantidad)
      : Number(actual.cantidad);

  const nextPrecioCosto =
    payload.preciocosto !== undefined
      ? Number(payload.preciocosto)
      : Number(actual.preciocosto);

  if (!Number.isFinite(nextCantidad) || nextCantidad <= 0) {
    throw new Error("cantidad inválida");
  }

  if (!Number.isFinite(nextPrecioCosto) || nextPrecioCosto < 0) {
    throw new Error("preciocosto inválido");
  }

  const update: Record<string, any> = {
    cantidad: nextCantidad,
    preciocosto: nextPrecioCosto,
  };

  if (payload.idproducto !== undefined) {
    if (!payload.idproducto) throw new Error("idproducto inválido");
    update.idproducto = payload.idproducto;
  }

  update.stockrestante = nextCantidad;

  const { data, error } = await supabaseAdmin
    .from("detalle_compra")
    .update(update)
    .eq("iddetallecompra", iddetallecompra)
    .eq("idcompra", idcompra)
    .select(`
      iddetallecompra,
      idcompra,
      idproducto,
      cantidad,
      preciocosto,
      subtotal,
      stockrestante,
      creado_en
    `)
    .single();

  if (error) throw new Error(error.message);

  await recalcularTotalCompra(idcompra);

  return data;
}

export async function eliminarLineaCompra(
  idcompra: string,
  iddetallecompra: string
) {
  await assertCompraEditable(idcompra);

  const { error } = await supabaseAdmin
    .from("detalle_compra")
    .delete()
    .eq("iddetallecompra", iddetallecompra)
    .eq("idcompra", idcompra);

  if (error) throw new Error(error.message);

  await recalcularTotalCompra(idcompra);

  return { ok: true };
}