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
  postProducto
);

productoRouter.put(
  "/:id",
  requirePermission("productos.editar"),
  putProducto
);

productoRouter.patch(
  "/:id/estado",
  requirePermission("productos.estado"),
  patchProductoEstado
);

productoRouter.delete(
  "/:id",
  requireRole("ADMINISTRADOR"),
  deleteProducto
);