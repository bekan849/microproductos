import { Router } from "express";
import {
  getCategorias,
  postCategoria,
  putCategoria,
  patchCategoriaEstado,
  deleteCategoria,
} from "../controllers/categoria.controller";
import {
  decodeToken,
  requirePermission,
  requireRole,
} from "../middlewares/authorization.middleware";

export const categoriaRouter = Router();

categoriaRouter.get(
  "/",
  decodeToken,
  requirePermission("categorias.ver"),
  getCategorias
);

categoriaRouter.post(
  "/",
  decodeToken,
  requirePermission("categorias.crear"),
  postCategoria
);

categoriaRouter.put(
  "/:id",
  decodeToken,
  requirePermission("categorias.editar"),
  putCategoria
);

categoriaRouter.patch(
  "/:id/estado",
  decodeToken,
  requirePermission("categorias.editar"),
  patchCategoriaEstado
);

categoriaRouter.delete(
  "/:id",
  decodeToken,
  requireRole("ADMINISTRADOR"),
  deleteCategoria
);