import { auditMiddleware } from "../middlewares/audit.middleware";
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
  auditMiddleware("productos"),
  postCompra
);

compraRouter.post(
  "/registrar-completa",
  requirePermission("compras.crear"),
  auditMiddleware("productos"),
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
  auditMiddleware("productos"),
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
  auditMiddleware("productos"),
  postDetalleCompra
);

compraRouter.put(
  "/:id/detalles/:iddetalle",
  requirePermission("compras.editar"),
  auditMiddleware("productos"),
  putDetalleCompra
);

compraRouter.delete(
  "/:id/detalles/:iddetalle",
  requirePermission("compras.editar"),
  auditMiddleware("productos"),
  deleteDetalleCompra
);