import type { Request, Response } from "express";
import {
  listarProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  setEstadoProducto,
  eliminarProducto,
  type ProductoEstado,
} from "../services/producto.service";

type ReqWithId = Request<{ id: string }>;

export async function getProductos(req: Request, res: Response) {
  try {
    const {
      q,
      idcategoria,
      idmarca,
      estado,
      soloConStock,
      page,
      limit,
      orderBy,
      order,
    } = req.query;
    const result = await listarProductos({
      q: typeof q === "string" ? q : undefined,
      idcategoria: typeof idcategoria === "string" ? idcategoria : undefined,
      idmarca: typeof idmarca === "string" ? idmarca : undefined,
      estado:
        typeof estado === "string" ? (estado.toUpperCase() as any) : undefined,
      page: typeof page === "string" ? Number(page) : undefined,
      limit: typeof limit === "string" ? Number(limit) : undefined,
      orderBy: typeof orderBy === "string" ? (orderBy as any) : undefined,
      order: typeof order === "string" ? (order as any) : undefined,
      soloConStock: typeof soloConStock === "string" ? soloConStock : undefined,
    });

    return res.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function getProductoById(req: ReqWithId, res: Response) {
  try {
    const data = await obtenerProductoPorId(req.params.id);
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(404).json({ ok: false, message });
  }
}

export async function postProducto(req: Request, res: Response) {
  try {
    const data = await crearProducto(req.body);
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function putProducto(req: ReqWithId, res: Response) {
  try {
    const data = await actualizarProducto(req.params.id, req.body);
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}

export async function patchProductoEstado(req: ReqWithId, res: Response) {
  try {
    const { estado } = req.body as { estado?: ProductoEstado | string };
    const estadoUpper = (estado ?? "").toString().toUpperCase();

    if (estadoUpper !== "ACTIVO" && estadoUpper !== "INACTIVO") {
      return res.status(400).json({
        ok: false,
        message: "estado inválido (ACTIVO | INACTIVO)",
      });
    }

    const data = await setEstadoProducto(
      req.params.id,
      estadoUpper as ProductoEstado
    );
    return res.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}
export async function deleteProducto(req: ReqWithId, res: Response) {
  try {
    const data = await eliminarProducto(req.params.id);
    return res.json({
      ok: true,
      data,
      message: "Producto eliminado correctamente",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return res.status(400).json({ ok: false, message });
  }
}
