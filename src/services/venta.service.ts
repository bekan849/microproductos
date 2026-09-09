import { supabaseAdmin } from "../lib/supabase";
import { sincronizarEstadoProductoPorStock } from "./producto.service";

export type VentaEstado = "PENDIENTE" | "COMPLETADA" | "CANCELADA";

export type VentaCreate = {
  fechaventa?: string;
  idusuario?: string;
};

export type VentaCompletaCreate = {
  fechaventa?: string;
  idusuario?: string;
  items: Array<{
    idproducto: string;
    cantidad: number;
    precioventa: number;
  }>;
};

type LoteCompraDisponible = {
  iddetallecompra: string;
  idproducto: string;
  cantidad: number;
  preciocosto: number;
  stockrestante: number;
  creado_en: string;
};

type DetalleVentaLoteRow = {
  iddetalleventalote: string;
  iddetalleventa: string;
  iddetallecompra: string;
  idproducto: string;
  cantidad: number;
  preciocosto: number;
  subtotalcosto: number;
  creado_en: string;
};

const VENTA_SELECT = "idventa, fechaventa, estado, total, creado_en, idusuario";

const DETALLE_VENTA_SELECT = `
  iddetalleventa,
  idventa,
  idproducto,
  cantidad,
  precioventa,
  subtotal,
  creado_en
`;

function validarVentaCompleta(payload: VentaCompletaCreate) {
  if (!Array.isArray(payload?.items) || payload.items.length === 0) {
    throw new Error("La venta debe tener al menos un item");
  }

  const ids = new Set<string>();
  for (const item of payload.items) {
    if (!item || typeof item.idproducto !== "string" || !item.idproducto.trim()) throw new Error("idproducto es obligatorio");
    const id = item.idproducto.trim().toLowerCase();
    if (ids.has(id)) throw new Error("No se permiten productos repetidos");
    ids.add(id);
    if (!item.idproducto) throw new Error("idproducto es obligatorio");

    if (!Number.isSafeInteger(item.cantidad) || item.cantidad <= 0) {
      throw new Error("cantidad inválida");
    }

    if (!Number.isFinite(item.precioventa) || item.precioventa < 0) {
      throw new Error("precioventa inválido");
    }
  }
}

function buildVentaInsertData(payload: VentaCreate = {}) {
  const insertRow: Record<string, any> = {
    estado: "PENDIENTE",
    total: 0,
  };

  if (payload.fechaventa) {
    insertRow.fechaventa = payload.fechaventa;
  }

  if (payload.idusuario) {
    insertRow.idusuario = payload.idusuario;
  }

  return insertRow;
}

export async function crearVenta(payload: VentaCreate = {}) {
  const insertRow = buildVentaInsertData(payload);

  const { data, error } = await supabaseAdmin
    .from("venta")
    .insert([insertRow])
    .select(VENTA_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function obtenerVenta(idventa: string) {
  const { data, error } = await supabaseAdmin
    .from("venta")
    .select(VENTA_SELECT)
    .eq("idventa", idventa)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listarVentas() {
  const { data, error } = await supabaseAdmin
    .from("venta")
    .select(VENTA_SELECT)
    .order("fechaventa", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function assertVentaEditable(idventa: string) {
  const venta = await obtenerVenta(idventa);

  if (venta.estado !== "PENDIENTE") {
    throw new Error(
      "Solo se puede modificar el detalle de una venta en estado PENDIENTE"
    );
  }

  return venta;
}

async function actualizarEstadoVenta(idventa: string, estado: VentaEstado) {
  const { data, error } = await supabaseAdmin
    .from("venta")
    .update({ estado })
    .eq("idventa", idventa)
    .select(VENTA_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function obtenerDetalleVenta(idventa: string) {
  const { data, error } = await supabaseAdmin
    .from("detalle_venta")
    .select(DETALLE_VENTA_SELECT)
    .eq("idventa", idventa)
    .order("creado_en", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function obtenerLotesDisponiblesPorProducto(
  idproducto: string
): Promise<LoteCompraDisponible[]> {
  const { data, error } = await supabaseAdmin
    .from("detalle_compra")
    .select(
      `
      iddetallecompra,
      idproducto,
      cantidad,
      preciocosto,
      stockrestante,
      creado_en
    `
    )
    .eq("idproducto", idproducto)
    .gt("stockrestante", 0)
    .order("creado_en", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as LoteCompraDisponible[];
}

async function obtenerConsumosLotePorVenta(
  idventa: string
): Promise<DetalleVentaLoteRow[]> {
  const { data, error } = await supabaseAdmin
    .from("detalle_venta_lote")
    .select(
      `
      iddetalleventalote,
      iddetalleventa,
      iddetallecompra,
      idproducto,
      cantidad,
      preciocosto,
      subtotalcosto,
      creado_en,
      detalle_venta!inner(idventa)
    `
    )
    .eq("detalle_venta.idventa", idventa);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DetalleVentaLoteRow[];
}

async function sumarStockProducto(idproducto: string, cantidad: number) {
  const { data: producto, error } = await supabaseAdmin
    .from("productos")
    .select("idproducto, stock")
    .eq("idproducto", idproducto)
    .single();

  if (error || !producto) {
    throw new Error(`No se encontró el producto ${idproducto}`);
  }

  const nuevoStock = Number(producto.stock ?? 0) + Number(cantidad);

  const { error: updError } = await supabaseAdmin
    .from("productos")
    .update({ stock: nuevoStock })
    .eq("idproducto", idproducto);
  await sincronizarEstadoProductoPorStock(idproducto);
  if (updError) throw new Error(updError.message);
}

async function restarStockProducto(idproducto: string, cantidad: number) {
  const { data: producto, error } = await supabaseAdmin
    .from("productos")
    .select("idproducto, stock")
    .eq("idproducto", idproducto)
    .single();

  if (error || !producto) {
    throw new Error(`No se encontró el producto ${idproducto}`);
  }

  const stockActual = Number(producto.stock ?? 0);

  if (stockActual < cantidad) {
    throw new Error(
      `Stock insuficiente del producto ${idproducto} para completar la venta`
    );
  }

  const nuevoStock = stockActual - Number(cantidad);

  const { error: updError } = await supabaseAdmin
    .from("productos")
    .update({ stock: nuevoStock })
    .eq("idproducto", idproducto);
  await sincronizarEstadoProductoPorStock(idproducto);
  if (updError) throw new Error(updError.message);
}

async function consumirStockPorPeps(
  iddetalleventa: string,
  idproducto: string,
  cantidadNecesaria: number,
  precioventa: number
) {
  const lotes = await obtenerLotesDisponiblesPorProducto(idproducto);

  if (!lotes.length) {
    throw new Error(`No hay stock disponible para el producto ${idproducto}`);
  }

  const stockDisponibleTotal = lotes.reduce(
    (acc, lote) => acc + Number(lote.stockrestante ?? 0),
    0
  );

  if (stockDisponibleTotal < cantidadNecesaria) {
    throw new Error(
      `Stock insuficiente para el producto ${idproducto}. Disponible: ${stockDisponibleTotal}, requerido: ${cantidadNecesaria}`
    );
  }

  let restante = Number(cantidadNecesaria);

  for (const lote of lotes) {
    if (restante <= 0) break;

    const disponible = Number(lote.stockrestante ?? 0);
    if (disponible <= 0) continue;

    const cantidadConsumida = Math.min(disponible, restante);
    const nuevoStockRestante = disponible - cantidadConsumida;
    const preciocosto = Number(lote.preciocosto ?? 0);

    if (Number(precioventa) < preciocosto) {
      throw new Error(
        `El precio de venta no puede ser menor al precio de compra. Producto: ${idproducto}. Precio venta: ${precioventa}, precio costo: ${preciocosto}`
      );
    }

    const subtotalcosto = cantidadConsumida * preciocosto;

    const { error: updDetalleCompraError } = await supabaseAdmin
      .from("detalle_compra")
      .update({ stockrestante: nuevoStockRestante })
      .eq("iddetallecompra", lote.iddetallecompra);

    if (updDetalleCompraError) throw new Error(updDetalleCompraError.message);

    await restarStockProducto(idproducto, cantidadConsumida);

    const { error: insertConsumoError } = await supabaseAdmin
      .from("detalle_venta_lote")
      .insert([
        {
          iddetalleventa,
          iddetallecompra: lote.iddetallecompra,
          idproducto,
          cantidad: cantidadConsumida,
          preciocosto,
          subtotalcosto,
        },
      ]);

    if (insertConsumoError) throw new Error(insertConsumoError.message);

    restante -= cantidadConsumida;
  }

  if (restante > 0) {
    throw new Error(
      `No se pudo consumir completamente el stock del producto ${idproducto}`
    );
  }
}

async function revertirConsumoVenta(idventa: string) {
  const consumos = await obtenerConsumosLotePorVenta(idventa);

  for (const consumo of consumos) {
    const cantidad = Number(consumo.cantidad ?? 0);

    const { data: detalleCompra, error: detalleCompraError } =
      await supabaseAdmin
        .from("detalle_compra")
        .select("iddetallecompra, stockrestante")
        .eq("iddetallecompra", consumo.iddetallecompra)
        .single();

    if (detalleCompraError || !detalleCompra) {
      throw new Error(
        `No se encontró el lote de compra ${consumo.iddetallecompra}`
      );
    }

    const nuevoStockRestante =
      Number(detalleCompra.stockrestante ?? 0) + cantidad;

    const { error: updDetalleCompraError } = await supabaseAdmin
      .from("detalle_compra")
      .update({ stockrestante: nuevoStockRestante })
      .eq("iddetallecompra", consumo.iddetallecompra);

    if (updDetalleCompraError) throw new Error(updDetalleCompraError.message);

    await sumarStockProducto(consumo.idproducto, cantidad);
  }

  if (consumos.length > 0) {
    const { error: deleteConsumosError } = await supabaseAdmin
      .from("detalle_venta_lote")
      .delete()
      .in(
        "iddetalleventalote",
        consumos.map((c) => c.iddetalleventalote)
      );

    if (deleteConsumosError) throw new Error(deleteConsumosError.message);
  }
}

export async function registrarVentaCompleta(payload: VentaCompletaCreate) {
  validarVentaCompleta(payload);
  const { data, error } = await supabaseAdmin.rpc("registrar_venta_completa_atomica", {
    p_payload: {
      ...(payload.fechaventa ? { fechaventa: payload.fechaventa } : {}),
      ...(payload.idusuario ? { idusuario: payload.idusuario } : {}),
      items: payload.items.map((item) => ({
        idproducto: item.idproducto.trim(), cantidad: item.cantidad, precioventa: item.precioventa,
      })),
    },
  });
  if (error?.code === "PGRST202") {
    throw new Error("Falta instalar la migración de registro atómico de ventas en Supabase");
  }
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No se recibió la venta registrada");
  return data;
}

export async function cambiarEstadoVenta(idventa: string, estado: VentaEstado) {
  const venta = await obtenerVenta(idventa);

  if (venta.estado === estado) {
    return venta;
  }

  const detalles = await obtenerDetalleVenta(idventa);

  if (!detalles.length && estado === "COMPLETADA") {
    throw new Error("No se puede completar una venta sin detalle");
  }

  if (
    venta.estado === "COMPLETADA" &&
    (estado === "PENDIENTE" || estado === "CANCELADA")
  ) {
    const ventaActualizada = await actualizarEstadoVenta(idventa, estado);

    try {
      await revertirConsumoVenta(idventa);
      return ventaActualizada;
    } catch (err) {
      await actualizarEstadoVenta(idventa, "COMPLETADA");
      throw err;
    }
  }

  if (
    (venta.estado === "PENDIENTE" || venta.estado === "CANCELADA") &&
    estado === "COMPLETADA"
  ) {
    const ventaActualizada = await actualizarEstadoVenta(idventa, "COMPLETADA");

    try {
      for (const detalle of detalles) {
        await consumirStockPorPeps(
          detalle.iddetalleventa,
          detalle.idproducto,
          Number(detalle.cantidad),
          Number(detalle.precioventa)
        );
      }

      return ventaActualizada;
    } catch (err) {
      await actualizarEstadoVenta(idventa, venta.estado);
      throw err;
    }
  }

  return await actualizarEstadoVenta(idventa, estado);
}

export async function listarProductosVendidosHoy() {
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // Bolivia usa UTC-4 durante todo el año.
  const inicioUtc = new Date(`${hoy}T04:00:00.000Z`);
  const finUtc = new Date(inicioUtc.getTime() + 24 * 60 * 60 * 1000);

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
      venta!inner (
        idventa,
        fechaventa,
        estado
      ),
      productos:productos (
        idproducto,
        codigoprod,
        nombre,
        urlimagen,
        marcas:marcas (
          nombre
        )
      )
    `)
    .eq("venta.estado", "COMPLETADA")
    .gte("venta.fechaventa", inicioUtc.toISOString())
    .lt("venta.fechaventa", finUtc.toISOString())
    .order("creado_en", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.iddetalleventa,
    idventa: row.idventa,
    ventaCodigo: String(row.idventa).slice(0, 8).toUpperCase(),
    cantidad: Number(row.cantidad ?? 0),
    precioUnitario: Number(row.precioventa ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    producto: row.productos?.nombre ?? "Producto sin nombre",
    codigo: row.productos?.codigoprod ?? "",
    marca: row.productos?.marcas?.nombre ?? "Sin marca",
    imagen: row.productos?.urlimagen ?? null,
  }));
}