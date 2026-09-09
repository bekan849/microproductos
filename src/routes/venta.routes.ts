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
  requirePermission,
} from "../middlewares/authorization.middleware";

export const ventaRouter = Router();

/* venta */
ventaRouter.get(
  "/",
  requirePermission("ventas.ver"),
  getVentas
);

ventaRouter.post(
  "/",
  requirePermission("ventas.crear"),
  postVenta
);

ventaRouter.post(
  "/registrar-completa",
  requirePermission("ventas.crear"),
  postRegistrarVentaCompleta
);

ventaRouter.get(
  "/dashboard/productos-vendidos-hoy",
  requirePermission("ventas.ver"),
  getProductosVendidosHoy
);

ventaRouter.get(
  "/:id",
  requirePermission("ventas.ver"),
  getVentaById
);

ventaRouter.patch(
  "/:id/estado",
  requirePermission("ventas.estado"),
  patchVentaEstado
);

/* detalle */
ventaRouter.get(
  "/:id/detalles",
  requirePermission("ventas.ver"),
  getDetalleVenta
);

ventaRouter.post(
  "/:id/detalles",
  requirePermission("ventas.editar"),
  postDetalleVenta
);

ventaRouter.put(
  "/:id/detalles/:iddetalle",
  requirePermission("ventas.editar"),
  putDetalleVenta
);

ventaRouter.delete(
  "/:id/detalles/:iddetalle",
  requirePermission("ventas.editar"),
  deleteDetalleVenta
);