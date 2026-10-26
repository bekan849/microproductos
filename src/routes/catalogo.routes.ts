import { Router } from "express";
import { requirePermission } from "../middlewares/authorization.middleware";
import { auditMiddleware } from "../middlewares/audit.middleware";
import { getCatalogos, getCatalogo, saveCatalogo, deleteCatalogo } from "../controllers/catalogo.controller";
export const catalogoRouter = Router();
catalogoRouter.use(requirePermission("productos.ver"));
catalogoRouter.get("/", getCatalogos);
catalogoRouter.get("/:id", getCatalogo);
catalogoRouter.post("/", requirePermission("productos.editar"), auditMiddleware("productos"), saveCatalogo);
catalogoRouter.put("/:id", requirePermission("productos.editar"), auditMiddleware("productos"), saveCatalogo);
catalogoRouter.delete("/:id", requirePermission("productos.editar"), auditMiddleware("productos"), deleteCatalogo);

