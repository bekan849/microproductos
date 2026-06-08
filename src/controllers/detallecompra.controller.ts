import type { Request, Response } from "express";
import {
  listarDetalleCompra,
  agregarLineaCompra,
  editarLineaCompra,
  eliminarLineaCompra,
} from "../services/detallecompra.service";

type ReqCompra = Request<{ id: string }>;
type ReqDetalle = Request<{ id: string; iddetalle: string }>;

export async function getDetalleCompra(req: ReqCompra, res: Response) {
  try {
    const data = await listarDetalleCompra(req.params.id);
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function postDetalleCompra(req: ReqCompra, res: Response) {
  try {
    const data = await agregarLineaCompra(req.params.id, req.body);
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function putDetalleCompra(req: ReqDetalle, res: Response) {
  try {
    const data = await editarLineaCompra(
      req.params.id,
      req.params.iddetalle,
      req.body
    );
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function deleteDetalleCompra(req: ReqDetalle, res: Response) {
  try {
    const data = await eliminarLineaCompra(req.params.id, req.params.iddetalle);
    return res.json({
      ok: true,
      data,
      message: "Línea de detalle eliminada correctamente",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}