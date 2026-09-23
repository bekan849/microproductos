import { randomUUID } from "crypto";
import type { RequestHandler } from "express";
import { appendAudit, auditSnapshot, auditTables, auditValues, auditName, auditResponsibleNames } from "../services/audit.service";

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
    let actorName = auditName((req as any).user);
    if (service === "usuarios" && (req as any).user?.idusuario) {
      try { actorName = (await auditResponsibleNames([(req as any).user.idusuario]))[0]?.nombre ?? actorName; }
      catch { /* Keep a verified token name if the current profile is unavailable. */ }
    }
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
        const rawData = body?.data;
        const data = Array.isArray(rawData) && rawData.length === 1 ? rawData[0] : rawData;
        const primary = auditTables[resource]?.[1];
        if (!recordId && primary && data) recordId = data[primary] ?? data.venta?.[primary] ?? data.compra?.[primary] ?? null;
        const after = success && module !== "auth" && action !== "cambiar_password"
          ? await auditSnapshot(resource, recordId, req.body) : { values: null, available: true };
        // A DELETE can mean either a soft deletion (row still exists) or a physical deletion.
        // Never use a DELETE response as an after-image: many controllers return the removed row.
        const afterValues = after.available ? after.values : success && action !== "eliminar" && module !== "auth" ? auditValues(data) : null;
        const comparison = module === "auth" || action === "cambiar_password" ? "no_aplica"
          : !success ? "error" : "registro";
        const saved = await appendAudit({
          id: randomUUID(), servicio: service, actor_id: actor?.idusuario ?? null,
          actor_email: typeof actor?.email === "string" ? actor.email.slice(0, 250) : null,
          accion: action, recurso: resource, registro_id: recordId,
          resultado: success ? "exito" : "error", estado_http: status,
          antes: comparison === "no_aplica" ? null : before.values, despues: success ? afterValues : null,
          detalles: { version_captura: 2, comparacion: comparison,
            actor_nombre: auditName(res.locals.auditActor) ?? actorName,
            captura_antes: before.available, captura_despues: after.available,
            registro_creado: req.method === "POST" && success,
            registro_eliminado: action === "eliminar" && success && after.available && after.values === null,
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
