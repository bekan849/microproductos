import type { Request, Response } from "express";
import {
  listarCategorias,
  crearCategoria,
  actualizarCategoria,
  setEstadoCategoria,
  eliminarCategoria,
} from "../services/categoria.service";
type ReqWithId = Request<{ id: string }>;

export async function getCategorias(_req: Request, res: Response) {
  try {
    const data = await listarCategorias();
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function postCategoria(req: Request, res: Response) {
  try {
    const data = await crearCategoria(req.body);
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function putCategoria(req: ReqWithId, res: Response) {
  try {
    const data = await actualizarCategoria(req.params.id, req.body);
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function patchCategoriaEstado(req: ReqWithId, res: Response) {
  try {
    const { estado } = req.body as { estado?: boolean };
    if (typeof estado !== "boolean") throw new Error("estado debe ser boolean");

    const data = await setEstadoCategoria(req.params.id, estado);
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}
export async function deleteCategoria(req: ReqWithId, res: Response) {
  try {
    const data = await eliminarCategoria(req.params.id);
    return res.json({ ok: true, data, message: "Categoría eliminada correctamente" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}