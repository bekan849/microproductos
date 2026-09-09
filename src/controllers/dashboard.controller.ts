import type { Request, Response } from "express";
import { obtenerDashboardInicial } from "../services/dashboard.service";

export async function getDashboardInicial(req: Request, res: Response) {
  const permisos = req.user?.permisos ?? [];
  if (!permisos.some((p) => p === "reportes.ver" || p === "ventas.ver")) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para consultar el dashboard" });
  }
  res.setHeader("Cache-Control", "no-store");
  try {
    return res.json({ ok: true, data: await obtenerDashboardInicial(permisos) });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error instanceof Error ? error.message : "Error cargando dashboard" });
  }
}
