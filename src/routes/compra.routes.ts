import { Router } from "express";
import {
  getCompras,
  postCompra,
  getCompraById,
  patchCompraEstado,
  postRegistrarCompraCompleta,
} from "../controllers/compra.controller";
import {
  getDetalleCompra,
  postDetalleCompra,
  putDetalleCompra,
  deleteDetalleCompra,
} from "../controllers/detallecompra.controller";
import {
  requirePermission,
} from "../middlewares/authorization.middleware";

export const compraRouter = Router();

/* compra */
compraRouter.get(
  "/",
  requirePermission("compras.ver"),
  getCompras
);

compraRouter.post(
  "/",
  requirePermission("compras.crear"),
  postCompra
);

compraRouter.post(
  "/registrar-completa",
  requirePermission("compras.crear"),
  postRegistrarCompraCompleta
);

compraRouter.get(
  "/:id",
  requirePermission("compras.ver"),
  getCompraById
);

compraRouter.patch(
  "/:id/estado",
  requirePermission("compras.estado"),
  patchCompraEstado
);

/* detalle */
compraRouter.get(
  "/:id/detalles",
  requirePermission("compras.ver"),
  getDetalleCompra
);

compraRouter.post(
  "/:id/detalles",
  requirePermission("compras.editar"),
  postDetalleCompra
);

compraRouter.put(
  "/:id/detalles/:iddetalle",
  requirePermission("compras.editar"),
  putDetalleCompra
);

compraRouter.delete(
  "/:id/detalles/:iddetalle",
  requirePermission("compras.editar"),
  deleteDetalleCompra
);