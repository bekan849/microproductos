import { auditMiddleware } from "../middlewares/audit.middleware";
import { Router } from "express";
import {
  getProductos,
  getProductoById,
  postProducto,
  putProducto,
  patchProductoEstado,
  deleteProducto,
} from "../controllers/producto.controller";
import {
  requirePermission,
  requireRole,
} from "../middlewares/authorization.middleware";

export const productoRouter = Router();

productoRouter.get(
  "/",
  requirePermission("productos.ver"),
  getProductos
);

productoRouter.get(
  "/:id",
  requirePermission("productos.ver"),
  getProductoById
);

productoRouter.post(
  "/",
  requirePermission("productos.crear"),
  auditMiddleware("productos"),
  postProducto
);

productoRouter.put(
  "/:id",
  requirePermission("productos.editar"),
  auditMiddleware("productos"),
  putProducto
);

productoRouter.patch(
  "/:id/estado",
  requirePermission("productos.estado"),
  auditMiddleware("productos"),
  patchProductoEstado
);

productoRouter.delete(
  "/:id",
  requireRole("ADMINISTRADOR"),
  auditMiddleware("productos"),
  deleteProducto
);