import type { Request, Response } from "express";
import { listarProveedores, crearProveedor, actualizarProveedor, setEstadoProveedor,eliminarProveedor } from "../services/proveedor.service";

type ReqWithId = Request<{ id: string }>;

export async function getProveedores(_req: Request, res: Response) {
  try {
    const data = await listarProveedores();
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function postProveedor(req: Request, res: Response) {
  try {
    const data = await crearProveedor(req.body);
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function putProveedor(req: ReqWithId, res: Response) {
  try {
    const data = await actualizarProveedor(req.params.id, req.body);
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function patchProveedorEstado(req: ReqWithId, res: Response) {
  try {
    const { estado } = req.body as { estado?: boolean };
    if (typeof estado !== "boolean") throw new Error("estado debe ser boolean");

    const data = await setEstadoProveedor(req.params.id, estado);
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}


export async function deleteProveedor(req: ReqWithId, res: Response) {
  try {
    const data = await eliminarProveedor(req.params.id);
    return res.json({
      ok: true,
      data,
      message: "Proveedor eliminado correctamente",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}