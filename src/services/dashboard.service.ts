import { supabaseAdmin } from "../lib/supabase";
import { obtenerResumenReporte, obtenerGananciasAgrupadas } from "./reporte.service";
import { listarProductosVendidosHoy } from "./venta.service";

export async function obtenerDashboardInicial(permisos: string[]) {
  const reportes = permisos.includes("reportes.ver");
  const ventas = permisos.includes("ventas.ver");
  const { data, error } = await supabaseAdmin.rpc("dashboard_inicial", {
    p_reportes: reportes, p_ventas: ventas,
  });
  if (!error) return data;
  if (error.code !== "PGRST202") throw new Error(error.message);

  // Compatibilidad durante el despliegue: respeta los mismos permisos.
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
  const [resumenDia, resumenMes, gananciasMensuales, productosVendidosHoy] = await Promise.all([
    reportes ? obtenerResumenReporte({ desde: hoy, hasta: hoy }) : undefined,
    reportes ? obtenerResumenReporte({ desde: hoy.slice(0,7) + "-01", hasta: hoy }) : undefined,
    reportes ? obtenerGananciasAgrupadas("mes", { desde: hoy.slice(0,4) + "-01-01", hasta: hoy }) : undefined,
    ventas ? listarProductosVendidosHoy() : undefined,
  ]);
  return { fecha: hoy, resumenDia, resumenMes, gananciasMensuales, productosVendidosHoy };
}
