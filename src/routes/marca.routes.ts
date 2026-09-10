import { auditMiddleware } from "../middlewares/audit.middleware";
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
  auditMiddleware("productos"),
  postMarca
);

marcaRouter.put(
  "/:id",
  requirePermission("marcas.editar"),
  auditMiddleware("productos"),
  putMarca
);

marcaRouter.patch(
  "/:id/estado",
  requirePermission("marcas.editar"),
  auditMiddleware("productos"),
  patchMarcaEstado
);

marcaRouter.delete(
  "/:id",
  requireRole("ADMINISTRADOR"),
  auditMiddleware("productos"),
  deleteMarca
);