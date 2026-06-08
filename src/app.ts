import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";

/* 🔐 AUTH GLOBAL */
import { decodeToken } from "./middlewares/authorization.middleware";

/* 📦 ROUTERS */
import { healthRouter } from "./routes/health.routes";
import { productoRouter } from "./routes/producto.routes";
import { ventaRouter } from "./routes/venta.routes";
import { compraRouter } from "./routes/compra.routes";
import { marcaRouter } from "./routes/marca.routes";
import { categoriaRouter } from "./routes/categoria.routes";
import { proveedorRouter } from "./routes/proveedor.routes";
import { reporteRouter } from "./routes/reporte.routes";

/* 🧱 MIDDLEWARES */
import { notFound } from "./middlewares/notFound.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";

export const app = express();

/* =========================
   🔐 SEGURIDAD / INFRA
========================= */
app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  "https://sis-stockf.onrender.com",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("No permitido por CORS"));
    },
    credentials: true,
  })
);

app.use(morgan("dev"));

/* =========================
   📥 PARSERS
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   ❤️ HEALTH
========================= */
app.use("/api/health", healthRouter);

/* =========================
   🔐 AUTH GLOBAL (OPCIONAL)
   👉 SOLO decodifica token si existe
========================= */
app.use(decodeToken);

/* =========================
   📦 MÓDULOS
========================= */
app.use("/api/productos", productoRouter);
app.use("/api/ventas", ventaRouter);
app.use("/api/compras", compraRouter);
app.use("/api/marcas", marcaRouter);
app.use("/api/categorias", categoriaRouter);
app.use("/api/proveedores", proveedorRouter);
app.use("/api/reportes", reporteRouter);

/* =========================
   ❌ 404
========================= */
app.use(notFound);

/* =========================
   💥 ERROR HANDLER GLOBAL
========================= */
app.use(errorMiddleware);