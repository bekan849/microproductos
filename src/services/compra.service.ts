import { supabaseAdmin } from "../lib/supabase";
import { sincronizarEstadoProductoPorStock } from "./producto.service";

export type CompraEstado = "PENDIENTE" | "COMPLETADA" | "CANCELADA";

export type CompraCreate = {
  idproveedor: string;
  fechaingreso?: string;
  idusuario?: string;
};

export type CompraCompletaCreate = {
  idproveedor: string;
  fechaingreso?: string;
  idusuario?: string;
  items: Array<{
    idproducto: string;
    cantidad: number;
    preciocosto: number;
    precioventa?: number;
    precioventa_anterior?: number;
  }>;
};

const COMPRA_SELECT =
  "idcompra, idproveedor, idusuario, fechaingreso, estado, total, creado_en";

function validarCompraCreate(payload: CompraCreate) {
  if (!payload.idproveedor) {
    throw new Error("idproveedor es obligatorio");
  }
}

function validarCompraCompleta(payload: CompraCompletaCreate) {
  if (!payload.idproveedor) {
    throw new Error("idproveedor es obligatorio");
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("La compra debe tener al menos un item");
  }

  for (const item of payload.items) {
    if (!item.idproducto) throw new Error("idproducto es obligatorio");

    if (!Number.isSafeInteger(item.cantidad) || item.cantidad <= 0) {
      throw new Error("cantidad inválida");
    }

    if (!Number.isFinite(item.preciocosto) || item.preciocosto < 0) {
      throw new Error("preciocosto inválido");
    }
  }
}

function buildCompraInsertData(payload: CompraCreate) {
  const insertData: Record<string, any> = {
    idproveedor: payload.idproveedor,
    estado: "PENDIENTE",
    total: 0,
  };

  if (payload.fechaingreso) {
    insertData.fechaingreso = payload.fechaingreso;
  }

  if (payload.idusuario) {
    insertData.idusuario = payload.idusuario;
  }

  return insertData;
}

export async function crearCompra(payload: CompraCreate) {
  validarCompraCreate(payload);

  const insertData = buildCompraInsertData(payload);

  const { data, error } = await supabaseAdmin
    .from("compra")
    .insert([insertData])
    .select(COMPRA_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function obtenerCompra(idcompra: string) {
  const { data, error } = await supabaseAdmin
    .from("compra")
    .select(COMPRA_SELECT)
    .eq("idcompra", idcompra)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listarCompras() {
  const { data, error } = await supabaseAdmin
    .from("compra")
    .select(COMPRA_SELECT)
    .order("fechaingreso", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function assertCompraEditable(idcompra: string) {
  const compra = await obtenerCompra(idcompra);

  if (compra.estado !== "PENDIENTE") {
    throw new Error(
      "Solo se puede modificar el detalle de una compra en estado PENDIENTE"
    );
  }

  return compra;
}

async function obtenerDetalleCompraParaStock(idcompra: string) {
  const { data, error } = await supabaseAdmin
    .from("detalle_compra")
    .select("iddetallecompra, idproducto, cantidad, stockrestante")
    .eq("idcompra", idcompra);

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function validarLoteNoConsumido(idcompra: string) {
  const detalles = await obtenerDetalleCompraParaStock(idcompra);

  if (detalles.length === 0) {
    throw new Error("La compra no tiene detalles");
  }

  for (const det of detalles) {
    const cantidad = Number(det.cantidad ?? 0);
    const stockrestante = Number(det.stockrestante ?? 0);

    if (stockrestante < cantidad) {
      throw new Error(
        "No se puede cambiar el estado porque ya se vendió parte de este lote"
      );
    }
  }
}

async function sumarStockPorCompra(idcompra: string) {
  const detalles = await obtenerDetalleCompraParaStock(idcompra);

  if (detalles.length === 0) {
    throw new Error("La compra no tiene detalles");
  }

  for (const det of detalles) {
    const cantidad = Number(det.cantidad ?? 0);

    const { error: updDetError } = await supabaseAdmin
      .from("detalle_compra")
      .update({ stockrestante: cantidad })
      .eq("iddetallecompra", det.iddetallecompra);

    if (updDetError) throw new Error(updDetError.message);

    const { data: producto, error: prodError } = await supabaseAdmin
      .from("productos")
      .select("idproducto, stock")
      .eq("idproducto", det.idproducto)
      .single();

    if (prodError || !producto) {
      throw new Error(`No se encontró el producto ${det.idproducto}`);
    }

    const nuevoStock = Number(producto.stock ?? 0) + cantidad;

    const { error: updProdError } = await supabaseAdmin
      .from("productos")
      .update({ stock: nuevoStock })
      .eq("idproducto", det.idproducto);
    await sincronizarEstadoProductoPorStock(det.idproducto);
    if (updProdError) throw new Error(updProdError.message);
  }
}

async function restarStockPorCompra(idcompra: string) {
  const detalles = await obtenerDetalleCompraParaStock(idcompra);

  for (const det of detalles) {
    const cantidadLote = Number(det.cantidad ?? 0);

    const { data: producto, error: prodError } = await supabaseAdmin
      .from("productos")
      .select("idproducto, stock")
      .eq("idproducto", det.idproducto)
      .single();

    if (prodError || !producto) {
      throw new Error(`No se encontró el producto ${det.idproducto}`);
    }

    const stockActual = Number(producto.stock ?? 0);

    if (stockActual < cantidadLote) {
      throw new Error(
        `El stock actual del producto ${det.idproducto} es menor al lote que se intenta revertir`
      );
    }

    const nuevoStock = stockActual - cantidadLote;

    const { error: updProdError } = await supabaseAdmin
      .from("productos")
      .update({ stock: nuevoStock })
      .eq("idproducto", det.idproducto);

    if (updProdError) throw new Error(updProdError.message);

    const { error: updDetError } = await supabaseAdmin
      .from("detalle_compra")
      .update({ stockrestante: 0 })
      .eq("iddetallecompra", det.iddetallecompra);
await sincronizarEstadoProductoPorStock(det.idproducto);
    if (updDetError) throw new Error(updDetError.message);
  }
}

export async function registrarCompraCompleta(payload: CompraCompletaCreate) {
  validarCompraCompleta(payload);
  const { data, error } = await supabaseAdmin.rpc('registrar_compra_empresa', { p_payload: payload });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Falta instalar la actualización SQL de compras. No se registró la compra.');
    throw new Error(error.message);
  }
  if (!data) throw new Error('No se recibió la compra registrada');
  return data;
}

async function actualizarEstadoCompra(idcompra: string, estado: CompraEstado) {
  const { data, error } = await supabaseAdmin
    .from("compra")
    .update({ estado })
    .eq("idcompra", idcompra)
    .select(COMPRA_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function cambiarEstadoCompra(
  idcompra: string,
  estado: CompraEstado
) {
  const compra = await obtenerCompra(idcompra);

  if (compra.estado === estado) {
    return compra;
  }

  if (
    compra.estado === "COMPLETADA" &&
    (estado === "PENDIENTE" || estado === "CANCELADA")
  ) {
    await validarLoteNoConsumido(idcompra);

    const compraActualizada = await actualizarEstadoCompra(idcompra, estado);

    try {
      await restarStockPorCompra(idcompra);
      return compraActualizada;
    } catch (err) {
      await actualizarEstadoCompra(idcompra, "COMPLETADA");
      throw err;
    }
  }

  if (
    (compra.estado === "PENDIENTE" || compra.estado === "CANCELADA") &&
    estado === "COMPLETADA"
  ) {
    try {
      await sumarStockPorCompra(idcompra);
    } catch (err) {
      throw err;
    }

    try {
      return await actualizarEstadoCompra(idcompra, "COMPLETADA");
    } catch (err) {
      await restarStockPorCompra(idcompra);
      throw err;
    }
  }

  return await actualizarEstadoCompra(idcompra, estado);
}
