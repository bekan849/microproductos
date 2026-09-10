import { randomUUID } from "crypto";
import type { RequestHandler } from "express";
import { appendAudit, auditSnapshot, auditTables, auditValues } from "../services/audit.service";

// Install AFTER authentication/authorization and BEFORE each mutation controller.
export function auditMiddleware(service: "usuarios" | "productos"): RequestHandler {
  return async (req, res, next) => {
    const segments = req.originalUrl.split("?")[0].split("/").filter(Boolean);
    const module = segments[1] ?? "";
    const detail = segments.includes("detalles");
    const resource = detail ? (module === "compras" ? "detalle_compra" : "detalle_venta") : module;
    const params = req.params as Record<string, string>;
    let recordId: string | null = params.iddetalle ?? params.id ?? params.idusuariorol ?? null;
    if (detail && !params.iddetalle) recordId = null;
    const action = module === "auth" ? (segments[2] === "login" ? "iniciar_sesion" : "cerrar_sesion")
      : segments.includes("password") ? "cambiar_password" : segments.includes("estado") ? "cambiar_estado"
      : segments.includes("registrar-completa") ? "registrar_completa"
      : req.method === "POST" ? "crear" : req.method === "DELETE" ? "eliminar" : "editar";
    const before = req.method === "POST" || module === "auth" ? { values: null, available: true }
      : await auditSnapshot(resource, recordId, req.body);
    const original = res.json.bind(res);
    let sent = false;
    res.json = ((body: any) => {
      if (sent) return res;
      sent = true;
      const status = res.statusCode;
      const success = status >= 200 && status < 300 && body?.ok !== false;
      const actor = res.locals.auditActor ?? (req as any).user;
      // A failed login has no verified actor. Do not store the submitted credentials/email.
      const run = async () => {
        const data = body?.data;
        const primary = auditTables[resource]?.[1];
        if (!recordId && primary && data) recordId = data[primary] ?? data.venta?.[primary] ?? data.compra?.[primary] ?? null;
        const after = success && module !== "auth" && action !== "eliminar"
          ? await auditSnapshot(resource, recordId, req.body) : { values: null, available: true };
        const saved = await appendAudit({
          id: randomUUID(), servicio: service, actor_id: actor?.idusuario ?? null,
          actor_email: typeof actor?.email === "string" ? actor.email.slice(0, 250) : null,
          accion: action, recurso: resource, registro_id: recordId,
          resultado: success ? "exito" : "error", estado_http: status,
          antes: before.values, despues: success ? after.values ?? (module === "auth" ? null : auditValues(data)) : null,
          detalles: { captura_antes: before.available, captura_despues: after.available,
            ...(detail ? { registro_padre: params.id } : {}),
            ...(action === "registrar_completa" && success ? { operacion: auditValues(req.body) } : {}) },
        });
        if (!saved) res.setHeader("X-Audit-Status", "unavailable");
      };
      void run().catch(() => { res.setHeader("X-Audit-Status", "unavailable"); })
        .finally(() => { original(body); });
      return res;
    }) as typeof res.json;
    next();
  };
}
