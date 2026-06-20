import { Router } from "express";
import {
  getVentas,
  postVenta,
  getVentaById,
  patchVentaEstado,
  postRegistrarVentaCompleta,
  getProductosVendidosHoy,
} from "../controllers/venta.controller";
import {
  getDetalleVenta,
  postDetalleVenta,
  putDetalleVenta,
  deleteDetalleVenta,
} from "../controllers/detalleventa.controller";
import {
  decodeToken,
  requirePermission,
} from "../middlewares/authorization.middleware";

export const ventaRouter = Router();

/* venta */
ventaRouter.get(
  "/",
  decodeToken,
  requirePermission("ventas.ver"),
  getVentas
);

ventaRouter.post(
  "/",
  decodeToken,
  requirePermission("ventas.crear"),
  postVenta
);

ventaRouter.post(
  "/registrar-completa",
  decodeToken,
  requirePermission("ventas.crear"),
  postRegistrarVentaCompleta
);

ventaRouter.get(
  "/dashboard/productos-vendidos-hoy",
  decodeToken,
  requirePermission("ventas.ver"),
  getProductosVendidosHoy
);

ventaRouter.get(
  "/:id",
  decodeToken,
  requirePermission("ventas.ver"),
  getVentaById
);

ventaRouter.patch(
  "/:id/estado",
  decodeToken,
  requirePermission("ventas.estado"),
  patchVentaEstado
);

/* detalle */
ventaRouter.get(
  "/:id/detalles",
  decodeToken,
  requirePermission("ventas.ver"),
  getDetalleVenta
);

ventaRouter.post(
  "/:id/detalles",
  decodeToken,
  requirePermission("ventas.editar"),
  postDetalleVenta
);

ventaRouter.put(
  "/:id/detalles/:iddetalle",
  decodeToken,
  requirePermission("ventas.editar"),
  putDetalleVenta
);

ventaRouter.delete(
  "/:id/detalles/:iddetalle",
  decodeToken,
  requirePermission("ventas.editar"),
  deleteDetalleVenta
);