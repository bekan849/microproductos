import { Router } from "express";
import {
  getGananciasAgrupadas,
  getReporteCompras,
  getReporteVentas,
  getResumenReporte,
} from "../controllers/reporte.controller";
import { requirePermission } from "../middlewares/authorization.middleware";

export const reporteRouter = Router();

reporteRouter.get(
  "/resumen",
  requirePermission("reportes.ver"),
  getResumenReporte
);

reporteRouter.get(
  "/ganancias",
  requirePermission("reportes.ver"),
  getGananciasAgrupadas
);

reporteRouter.get(
  "/ventas",
  requirePermission("reportes.ver"),
  getReporteVentas
);

reporteRouter.get(
  "/compras",
  requirePermission("reportes.ver"),
  getReporteCompras
);