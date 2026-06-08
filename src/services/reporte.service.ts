import { supabaseAdmin } from "../lib/supabase";

export type ReporteAgrupacion = "dia" | "mes" | "anio";
export type EstadoReporte = "PENDIENTE" | "COMPLETADA" | "CANCELADA";

export type ReporteFiltro = {
  desde?: string;
  hasta?: string;
  estado?: EstadoReporte;
};

type VentaRow = {
  idventa: string;
  fechaventa: string | null;
  estado: EstadoReporte;
  total: number | null;
  idusuario?: string | null;
  creado_en?: string | null;
};

type CompraRow = {
  idcompra: string;
  idproveedor: string;
  idusuario?: string | null;
  fechaingreso: string | null;
  estado: EstadoReporte;
  total: number | null;
  creado_en?: string | null;
};

type DetalleVentaRow = {
  iddetalleventa: string;
  idventa: string;
};

type DetalleVentaLoteRow = {
  iddetalleventa: string;
  subtotalcosto: number | null;
};

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStartDate(value?: string) {
  if (!value) return undefined;
  return `${value}T00:00:00.000Z`;
}

function normalizeEndDate(value?: string) {
  if (!value) return undefined;
  return `${value}T23:59:59.999Z`;
}

function periodKey(dateValue: string | null | undefined, tipo: ReporteAgrupacion) {
  const d = new Date(dateValue ?? "");
  if (Number.isNaN(d.getTime())) return "Sin fecha";

  const year = d.getUTCFullYear();
  const month = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");

  if (tipo === "anio") return `${year}`;
  if (tipo === "mes") return `${year}-${month}`;
  return `${year}-${month}-${day}`;
}

function applyDateRange<T extends { gte: any; lte: any }>(
  query: any,
  field: string,
  desde?: string,
  hasta?: string
) {
  const from = normalizeStartDate(desde);
  const to = normalizeEndDate(hasta);

  let q = query;
  if (from) q = q.gte(field, from);
  if (to) q = q.lte(field, to);
  return q;
}

async function obtenerVentasBase(filtro: ReporteFiltro = {}) {
  let query = supabaseAdmin
    .from("venta")
    .select("idventa, fechaventa, estado, total, idusuario, creado_en")
    .order("fechaventa", { ascending: true });

  query = applyDateRange(query, "fechaventa", filtro.desde, filtro.hasta);

  if (filtro.estado) {
    query = query.eq("estado", filtro.estado);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as VentaRow[];
}

async function obtenerComprasBase(filtro: ReporteFiltro = {}) {
  let query = supabaseAdmin
    .from("compra")
    .select("idcompra, idproveedor, idusuario, fechaingreso, estado, total, creado_en")
    .order("fechaingreso", { ascending: true });

  query = applyDateRange(query, "fechaingreso", filtro.desde, filtro.hasta);

  if (filtro.estado) {
    query = query.eq("estado", filtro.estado);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as CompraRow[];
}

async function obtenerCostoRealVentasPorIds(idventas: string[]) {
  if (!idventas.length) return 0;

  const { data: detalles, error: detalleError } = await supabaseAdmin
    .from("detalle_venta")
    .select("iddetalleventa, idventa")
    .in("idventa", idventas);

  if (detalleError) throw new Error(detalleError.message);

  const detalleRows = (detalles ?? []) as DetalleVentaRow[];
  const detalleIds = detalleRows.map((d) => d.iddetalleventa);

  if (!detalleIds.length) return 0;

  const { data: lotes, error: loteError } = await supabaseAdmin
    .from("detalle_venta_lote")
    .select("iddetalleventa, subtotalcosto")
    .in("iddetalleventa", detalleIds);

  if (loteError) throw new Error(loteError.message);

  return ((lotes ?? []) as DetalleVentaLoteRow[]).reduce(
    (acc, row) => acc + toNumber(row.subtotalcosto),
    0
  );
}

async function obtenerCostoPorVenta(idventas: string[]) {
  const result = new Map<string, number>();

  if (!idventas.length) return result;

  const { data: detalles, error: detalleError } = await supabaseAdmin
    .from("detalle_venta")
    .select("iddetalleventa, idventa")
    .in("idventa", idventas);

  if (detalleError) throw new Error(detalleError.message);

  const detalleRows = (detalles ?? []) as DetalleVentaRow[];
  const detalleIds = detalleRows.map((d) => d.iddetalleventa);

  if (!detalleIds.length) return result;

  const detalleToVenta = new Map<string, string>();
  for (const d of detalleRows) {
    detalleToVenta.set(d.iddetalleventa, d.idventa);
  }

  const { data: lotes, error: loteError } = await supabaseAdmin
    .from("detalle_venta_lote")
    .select("iddetalleventa, subtotalcosto")
    .in("iddetalleventa", detalleIds);

  if (loteError) throw new Error(loteError.message);

  for (const lote of (lotes ?? []) as DetalleVentaLoteRow[]) {
    const idventa = detalleToVenta.get(lote.iddetalleventa);
    if (!idventa) continue;

    const prev = result.get(idventa) ?? 0;
    result.set(idventa, prev + toNumber(lote.subtotalcosto));
  }

  return result;
}

export async function obtenerResumenReporte(filtro: ReporteFiltro = {}) {
  const [ventas, compras] = await Promise.all([
    obtenerVentasBase({ ...filtro, estado: "COMPLETADA" }),
    obtenerComprasBase({ ...filtro, estado: "COMPLETADA" }),
  ]);

  const ventasTotales = ventas.reduce((acc, v) => acc + toNumber(v.total), 0);
  const comprasTotales = compras.reduce((acc, c) => acc + toNumber(c.total), 0);
  const costoRealVentas = await obtenerCostoRealVentasPorIds(ventas.map((v) => v.idventa));
  const gananciaReal = ventasTotales - costoRealVentas;

  return {
    desde: filtro.desde ?? null,
    hasta: filtro.hasta ?? null,
    ventasTotales,
    comprasTotales,
    costoRealVentas,
    gananciaReal,
    cantidadVentas: ventas.length,
    cantidadCompras: compras.length,
  };
}

export async function obtenerReporteVentas(filtro: ReporteFiltro = {}) {
  const ventas = await obtenerVentasBase(filtro);

  return ventas.map((v) => ({
    idventa: v.idventa,
    fecha: v.fechaventa,
    estado: v.estado,
    total: toNumber(v.total),
    idusuario: v.idusuario ?? null,
    creado_en: v.creado_en ?? null,
  }));
}

export async function obtenerReporteCompras(filtro: ReporteFiltro = {}) {
  const compras = await obtenerComprasBase(filtro);

  return compras.map((c) => ({
    idcompra: c.idcompra,
    fecha: c.fechaingreso,
    estado: c.estado,
    total: toNumber(c.total),
    idproveedor: c.idproveedor,
    idusuario: c.idusuario ?? null,
    creado_en: c.creado_en ?? null,
  }));
}

export async function obtenerGananciasAgrupadas(
  tipo: ReporteAgrupacion,
  filtro: ReporteFiltro = {}
) {
  const [ventas, compras] = await Promise.all([
    obtenerVentasBase({ ...filtro, estado: "COMPLETADA" }),
    obtenerComprasBase({ ...filtro, estado: "COMPLETADA" }),
  ]);

  const costoPorVenta = await obtenerCostoPorVenta(ventas.map((v) => v.idventa));

  const grouped = new Map<
    string,
    {
      periodo: string;
      ventas: number;
      compras: number;
      costoRealVentas: number;
      gananciaReal: number;
      cantidadVentas: number;
      cantidadCompras: number;
    }
  >();

  for (const venta of ventas) {
    const key = periodKey(venta.fechaventa, tipo);
    const current = grouped.get(key) ?? {
      periodo: key,
      ventas: 0,
      compras: 0,
      costoRealVentas: 0,
      gananciaReal: 0,
      cantidadVentas: 0,
      cantidadCompras: 0,
    };

    current.ventas += toNumber(venta.total);
    current.costoRealVentas += costoPorVenta.get(venta.idventa) ?? 0;
    current.cantidadVentas += 1;
    current.gananciaReal = current.ventas - current.costoRealVentas;

    grouped.set(key, current);
  }

  for (const compra of compras) {
    const key = periodKey(compra.fechaingreso, tipo);
    const current = grouped.get(key) ?? {
      periodo: key,
      ventas: 0,
      compras: 0,
      costoRealVentas: 0,
      gananciaReal: 0,
      cantidadVentas: 0,
      cantidadCompras: 0,
    };

    current.compras += toNumber(compra.total);
    current.cantidadCompras += 1;
    current.gananciaReal = current.ventas - current.costoRealVentas;

    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.periodo.localeCompare(b.periodo)
  );
}