import { Router } from "express";
import {
  getProveedores,
  postProveedor,
  putProveedor,
  patchProveedorEstado,
  deleteProveedor,
} from "../controllers/proveedor.controller";
import {
  decodeToken,
  requirePermission,
  requireRole,
} from "../middlewares/authorization.middleware";

export const proveedorRouter = Router();

proveedorRouter.get(
  "/",
  decodeToken,
  requirePermission("proveedores.ver"),
  getProveedores
);

proveedorRouter.post(
  "/",
  decodeToken,
  requirePermission("proveedores.crear"),
  postProveedor
);

proveedorRouter.put(
  "/:id",
  decodeToken,
  requirePermission("proveedores.editar"),
  putProveedor
);

proveedorRouter.patch(
  "/:id/estado",
  decodeToken,
  requirePermission("proveedores.editar"),
  patchProveedorEstado
);

proveedorRouter.delete(
  "/:id",
  decodeToken,
  requireRole("ADMINISTRADOR"),
  deleteProveedor
);