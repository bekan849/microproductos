import type { Request, Response } from "express";
import { listarCatalogos, obtenerCatalogo, guardarCatalogo, eliminarCatalogo } from "../services/catalogo.service";
export async function getCatalogos(req: Request, res: Response) {
  try { return res.json({ ok: true, data: await listarCatalogos(req.query.resumen === "true") }); }
  catch (e) { return res.status(400).json({ ok: false, message: e instanceof Error ? e.message : "Error de catálogo" }); }
}
export async function saveCatalogo(req: Request, res: Response) {
  try { return res.status(req.method === "POST" ? 201 : 200).json({ ok: true, data: await guardarCatalogo(req.body, req.params.id as string | undefined) }); }
  catch (e) { return res.status(400).json({ ok: false, message: e instanceof Error ? e.message : "Error de catálogo" }); }
}
export async function deleteCatalogo(req: Request, res: Response) {
  try { return res.json({ ok: true, data: await eliminarCatalogo(req.params.id as string) }); }
  catch (e) { return res.status(400).json({ ok: false, message: e instanceof Error ? e.message : "Error de catálogo" }); }
}


export async function getCatalogo(req: Request, res: Response) {
  try { return res.json({ ok: true, data: await obtenerCatalogo(req.params.id as string) }); }
  catch (e) { return res.status(400).json({ ok: false, message: e instanceof Error ? e.message : "Error de catálogo" }); }
}
