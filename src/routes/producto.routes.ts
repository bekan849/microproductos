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
  decodeToken,
  requirePermission,
  requireRole,
} from "../middlewares/authorization.middleware";

export const productoRouter = Router();

productoRouter.get(
  "/",
  decodeToken,
  requirePermission("productos.ver"),
  getProductos
);

productoRouter.get(
  "/:id",
  decodeToken,
  requirePermission("productos.ver"),
  getProductoById
);

productoRouter.post(
  "/",
  decodeToken,
  requirePermission("productos.crear"),
  postProducto
);

productoRouter.put(
  "/:id",
  decodeToken,
  requirePermission("productos.editar"),
  putProducto
);

productoRouter.patch(
  "/:id/estado",
  decodeToken,
  requirePermission("productos.estado"),
  patchProductoEstado
);

productoRouter.delete(
  "/:id",
  decodeToken,
  requireRole("ADMINISTRADOR"),
  deleteProducto
);