import type { Request, Response } from "express";
import { listarMarcas, crearMarca, actualizarMarca, setEstadoMarca, eliminarMarca } from "../services/marca.service";

type ReqWithId = Request<{ id: string }>;

export async function getMarcas(_req: Request, res: Response) {
  try {
    const data = await listarMarcas();
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function postMarca(req: Request, res: Response) {
  try {
    const data = await crearMarca(req.body);
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function putMarca(req: ReqWithId, res: Response) {
  try {
    const data = await actualizarMarca(req.params.id, req.body);
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function patchMarcaEstado(req: ReqWithId, res: Response) {
  try {
    const { estado } = req.body as { estado?: boolean };
    if (typeof estado !== "boolean") throw new Error("estado debe ser boolean");

    const data = await setEstadoMarca(req.params.id, estado);
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}
export async function deleteMarca(req: ReqWithId, res: Response) {
  try {
    const data = await eliminarMarca(req.params.id);
    return res.json({ ok: true, data, message: "Marca eliminada correctamente" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}