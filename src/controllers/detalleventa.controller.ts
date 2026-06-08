import type { Request, Response } from "express";
import {
  listarDetalleVenta,
  agregarLineaVenta,
  editarLineaVenta,
  eliminarLineaVenta,
} from "../services/detalleventa.service";

type ReqVenta = Request<{ id: string }>;
type ReqVentaDetalle = Request<{ id: string; iddetalle: string }>;

export async function getDetalleVenta(req: ReqVenta, res: Response) {
  try {
    const data = await listarDetalleVenta(req.params.id);

    return res.json({
      ok: true,
      data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({
      ok: false,
      message,
    });
  }
}

export async function postDetalleVenta(req: ReqVenta, res: Response) {
  try {
    const data = await agregarLineaVenta(req.params.id, req.body);

    return res.status(201).json({
      ok: true,
      data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({
      ok: false,
      message,
    });
  }
}

export async function putDetalleVenta(req: ReqVentaDetalle, res: Response) {
  try {
    const data = await editarLineaVenta(
      req.params.id,
      req.params.iddetalle,
      req.body
    );

    return res.json({
      ok: true,
      data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({
      ok: false,
      message,
    });
  }
}

export async function deleteDetalleVenta(req: ReqVentaDetalle, res: Response) {
  try {
    const data = await eliminarLineaVenta(
      req.params.id,
      req.params.iddetalle
    );

    return res.json({
      ok: true,
      data,
      message: "Línea eliminada correctamente",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({
      ok: false,
      message,
    });
  }
}