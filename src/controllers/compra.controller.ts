import type { Request, Response } from "express";
import {
  crearCompra,
  obtenerCompra,
  listarCompras,
  cambiarEstadoCompra,
  registrarCompraCompleta,
  type CompraEstado,
} from "../services/compra.service";
import { listarDetalleCompra } from "../services/detallecompra.service";

type ReqWithId = Request<{ id: string }>;

export async function getCompras(_req: Request, res: Response) {
  try {
    const data = await listarCompras();
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function postCompra(req: Request, res: Response) {
  try {
    const data = await crearCompra(req.body);
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function postRegistrarCompraCompleta(req: Request, res: Response) {
  try {
    const data = await registrarCompraCompleta(req.body);
    return res.status(201).json({
      ok: true,
      data,
      message: "Compra registrada correctamente con su detalle",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function getCompraById(req: ReqWithId, res: Response) {
  try {
    const compra = await obtenerCompra(req.params.id);
    const detalles = await listarDetalleCompra(req.params.id);

    return res.json({
      ok: true,
      data: {
        compra,
        detalles,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function patchCompraEstado(req: ReqWithId, res: Response) {
  try {
    const { estado } = req.body as { estado?: CompraEstado };

    if (!estado || !["PENDIENTE", "COMPLETADA", "CANCELADA"].includes(estado)) {
      throw new Error("estado inválido");
    }

    const data = await cambiarEstadoCompra(req.params.id, estado);
    return res.json({
      ok: true,
      data,
      message: `Compra actualizada a estado ${estado}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}