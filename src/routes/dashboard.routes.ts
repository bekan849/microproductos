import { Router } from "express";
import { getDashboardInicial } from "../controllers/dashboard.controller";
import { requireAuth } from "../middlewares/authorization.middleware";

export const dashboardRouter = Router();
dashboardRouter.get("/inicial", requireAuth, getDashboardInicial);
