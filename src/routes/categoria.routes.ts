import { Router } from "express";
import {
  getCategorias,
  postCategoria,
  putCategoria,
  patchCategoriaEstado,
  deleteCategoria,
} from "../controllers/categoria.controller";
import {
  requirePermission,
  requireRole,
} from "../middlewares/authorization.middleware";

export const categoriaRouter = Router();

categoriaRouter.get(
  "/",
  requirePermission("categorias.ver"),
  getCategorias
);

categoriaRouter.post(
  "/",
  requirePermission("categorias.crear"),
  postCategoria
);

categoriaRouter.put(
  "/:id",
  requirePermission("categorias.editar"),
  putCategoria
);

categoriaRouter.patch(
  "/:id/estado",
  requirePermission("categorias.editar"),
  patchCategoriaEstado
);

categoriaRouter.delete(
  "/:id",
  requireRole("ADMINISTRADOR"),
  deleteCategoria
);