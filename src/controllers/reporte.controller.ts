import type { Request, Response } from "express";
import {
  obtenerResumenReporte,
  obtenerGananciasAgrupadas,
  obtenerReporteVentas,
  obtenerReporteCompras,
  type ReporteAgrupacion,
  type EstadoReporte,
} from "../services/reporte.service";

/* ======================================================
   Helpers
====================================================== */
function parseString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function parseEstado(value: unknown): EstadoReporte | undefined {
  if (value === "PENDIENTE" || value === "COMPLETADA" || value === "CANCELADA") {
    return value;
  }
  return undefined;
}

function parseTipoAgrupacion(value: unknown): ReporteAgrupacion {
  if (value === "dia" || value === "mes" || value === "anio") {
    return value;
  }
  return "mes";
}

function buildFiltro(req: Request) {
  return {
    desde: parseString(req.query.desde),
    hasta: parseString(req.query.hasta),
    estado: parseEstado(req.query.estado),
  };
}

/* ======================================================
   Controller: Resumen
====================================================== */
export async function getResumenReporte(req: Request, res: Response) {
  try {
    const filtro = buildFiltro(req);

    const data = await obtenerResumenReporte(filtro);

    return res.status(200).json({
      ok: true,
      message: "Resumen de reportes obtenido correctamente",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      ok: false,
      message: error?.message || "Error al obtener el resumen de reportes",
    });
  }
}

/* ======================================================
   Controller: Ganancias agrupadas
====================================================== */
export async function getGananciasAgrupadas(req: Request, res: Response) {
  try {
    const tipo = parseTipoAgrupacion(req.query.tipo);
    const filtro = buildFiltro(req);

    const data = await obtenerGananciasAgrupadas(tipo, filtro);

    return res.status(200).json({
      ok: true,
      message: "Reporte de ganancias obtenido correctamente",
      data,
      meta: {
        tipo,
        ...filtro,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      ok: false,
      message: error?.message || "Error al obtener el reporte de ganancias",
    });
  }
}

/* ======================================================
   Controller: Reporte de ventas
====================================================== */
export async function getReporteVentas(req: Request, res: Response) {
  try {
    const filtro = buildFiltro(req);

    const data = await obtenerReporteVentas(filtro);

    return res.status(200).json({
      ok: true,
      message: "Reporte de ventas obtenido correctamente",
      total: data.length,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      ok: false,
      message: error?.message || "Error al obtener el reporte de ventas",
    });
  }
}

/* ======================================================
   Controller: Reporte de compras
====================================================== */
export async function getReporteCompras(req: Request, res: Response) {
  try {
    const filtro = buildFiltro(req);

    const data = await obtenerReporteCompras(filtro);

    return res.status(200).json({
      ok: true,
      message: "Reporte de compras obtenido correctamente",
      total: data.length,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      ok: false,
      message: error?.message || "Error al obtener el reporte de compras",
    });
  }
}