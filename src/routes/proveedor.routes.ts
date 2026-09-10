import { auditMiddleware } from "../middlewares/audit.middleware";
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
  auditMiddleware("productos"),
  postProveedor
);

proveedorRouter.put(
  "/:id",
  requirePermission("proveedores.editar"),
  auditMiddleware("productos"),
  putProveedor
);

proveedorRouter.patch(
  "/:id/estado",
  requirePermission("proveedores.editar"),
  auditMiddleware("productos"),
  patchProveedorEstado
);

proveedorRouter.delete(
  "/:id",
  requireRole("ADMINISTRADOR"),
  auditMiddleware("productos"),
  deleteProveedor
);