import { Router } from "express";
import {
  getMarcas,
  postMarca,
  putMarca,
  patchMarcaEstado,
  deleteMarca,
} from "../controllers/marca.controller";
import {
  decodeToken,
  requirePermission,
  requireRole,
} from "../middlewares/authorization.middleware";

export const marcaRouter = Router();

marcaRouter.get(
  "/",
  decodeToken,
  requirePermission("marcas.ver"),
  getMarcas
);

marcaRouter.post(
  "/",
  decodeToken,
  requirePermission("marcas.crear"),
  postMarca
);

marcaRouter.put(
  "/:id",
  decodeToken,
  requirePermission("marcas.editar"),
  putMarca
);

marcaRouter.patch(
  "/:id/estado",
  decodeToken,
  requirePermission("marcas.editar"),
  patchMarcaEstado
);

marcaRouter.delete(
  "/:id",
  decodeToken,
  requireRole("ADMINISTRADOR"),
  deleteMarca
);