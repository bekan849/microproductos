import type { Request, Response } from "express";
import {
  crearVenta,
  listarVentas,
  obtenerVenta,
  registrarVentaCompleta,
  cambiarEstadoVenta,
  type VentaEstado,
  listarProductosVendidosHoy,
} from "../services/venta.service";
import { listarDetalleVenta } from "../services/detalleventa.service";


type ReqWithId = Request<{ id: string }>;

type ReqPatchEstado = Request<{ id: string }, any, { estado: VentaEstado }>;

export async function getVentas(_req: Request, res: Response) {
  try {
    const data = await listarVentas();
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function postVenta(req: Request, res: Response) {
  try {
    const data = await crearVenta(req.body);
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function getVentaById(req: ReqWithId, res: Response) {
  try {
    const venta = await obtenerVenta(req.params.id);
    const detalles = await listarDetalleVenta(req.params.id);

    return res.json({
      ok: true,
      data: { venta, detalles },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(404).json({ ok: false, message });
  }
}

export async function postRegistrarVentaCompleta(req: Request, res: Response) {
  try {
    console.log("BODY registrar venta completa:", req.body);

    const data = await registrarVentaCompleta(req.body);

    return res.status(201).json({ ok: true, data });
  } catch (err) {
    console.error("ERROR registrar venta completa:", err);

    const message =
      err instanceof Error ? err.message : "Error inesperado";

    return res.status(400).json({ ok: false, message });
  }
}

export async function patchVentaEstado(req: ReqPatchEstado, res: Response) {
  try {
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({
        ok: false,
        message: "estado es obligatorio",
      });
    }

    if (!["PENDIENTE", "COMPLETADA", "CANCELADA"].includes(estado)) {
      return res.status(400).json({
        ok: false,
        message: "estado inválido (PENDIENTE | COMPLETADA | CANCELADA)",
      });
    }

    const data = await cambiarEstadoVenta(req.params.id, estado);

    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}
export async function getProductosVendidosHoy(_req: Request, res: Response) {
  try {
    const data = await listarProductosVendidosHoy();
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}