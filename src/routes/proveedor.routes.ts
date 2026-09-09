import { Router } from "express";
import {
  getProveedores,
  postProveedor,
  putProveedor,
  patchProveedorEstado,
  deleteProveedor,
} from "../controllers/proveedor.controller";
import {
  requirePermission,
  requireRole,
} from "../middlewares/authorization.middleware";

export const proveedorRouter = Router();

proveedorRouter.get(
  "/",
  requirePermission("proveedores.ver"),
  getProveedores
);

proveedorRouter.post(
  "/",
  requirePermission("proveedores.crear"),
  postProveedor
);

proveedorRouter.put(
  "/:id",
  requirePermission("proveedores.editar"),
  putProveedor
);

proveedorRouter.patch(
  "/:id/estado",
  requirePermission("proveedores.editar"),
  patchProveedorEstado
);

proveedorRouter.delete(
  "/:id",
  requireRole("ADMINISTRADOR"),
  deleteProveedor
);