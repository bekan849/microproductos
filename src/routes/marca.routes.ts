import { Router } from "express";
import {
  getMarcas,
  postMarca,
  putMarca,
  patchMarcaEstado,
  deleteMarca,
} from "../controllers/marca.controller";
import {
  requirePermission,
  requireRole,
} from "../middlewares/authorization.middleware";

export const marcaRouter = Router();

marcaRouter.get(
  "/",
  requirePermission("marcas.ver"),
  getMarcas
);

marcaRouter.post(
  "/",
  requirePermission("marcas.crear"),
  postMarca
);

marcaRouter.put(
  "/:id",
  requirePermission("marcas.editar"),
  putMarca
);

marcaRouter.patch(
  "/:id/estado",
  requirePermission("marcas.editar"),
  patchMarcaEstado
);

marcaRouter.delete(
  "/:id",
  requireRole("ADMINISTRADOR"),
  deleteMarca
);