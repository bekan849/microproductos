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
  decodeToken,
  requirePermission,
} from "../middlewares/authorization.middleware";

export const compraRouter = Router();

/* compra */
compraRouter.get(
  "/",
  decodeToken,
  requirePermission("compras.ver"),
  getCompras
);

compraRouter.post(
  "/",
  decodeToken,
  requirePermission("compras.crear"),
  postCompra
);

compraRouter.post(
  "/registrar-completa",
  decodeToken,
  requirePermission("compras.crear"),
  postRegistrarCompraCompleta
);

compraRouter.get(
  "/:id",
  decodeToken,
  requirePermission("compras.ver"),
  getCompraById
);

compraRouter.patch(
  "/:id/estado",
  decodeToken,
  requirePermission("compras.estado"),
  patchCompraEstado
);

/* detalle */
compraRouter.get(
  "/:id/detalles",
  decodeToken,
  requirePermission("compras.ver"),
  getDetalleCompra
);

compraRouter.post(
  "/:id/detalles",
  decodeToken,
  requirePermission("compras.editar"),
  postDetalleCompra
);

compraRouter.put(
  "/:id/detalles/:iddetalle",
  decodeToken,
  requirePermission("compras.editar"),
  putDetalleCompra
);

compraRouter.delete(
  "/:id/detalles/:iddetalle",
  decodeToken,
  requirePermission("compras.editar"),
  deleteDetalleCompra
);