import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

/* =========================
   🔐 TIPADO DEL TOKEN
========================= */
type TokenPayload = {
  idusuario: string;
  email?: string;
  roles?: string[];
  permisos?: string[];
  iat?: number;
  exp?: number;
};

/* =========================
   🔐 EXTENDER REQUEST (CLAVE 🔥)
========================= */
declare global {
  namespace Express {
    interface Request {
      user?: {
        idusuario: string;
        email?: string;
        roles: string[];
        permisos: string[];
      };
    }
  }
}

/* =========================
   RESPUESTAS BASE
========================= */
function unauthorized(res: Response, message = "No autenticado") {
  return res.status(401).json({
    ok: false,
    message,
  });
}

function forbidden(res: Response, message = "No autorizado") {
  return res.status(403).json({
    ok: false,
    message,
  });
}

/* =========================
   🔐 DECODE TOKEN (GLOBAL)
========================= */
export const decodeToken: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = req.headers.authorization;

    // 🔥 IMPORTANTE: no bloquear si no hay token
    if (!auth) {
      return next();
    }

    const [scheme, token] = auth.split(" ");

    if (scheme !== "Bearer" || !token) {
      return unauthorized(res, "Formato de token inválido");
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as TokenPayload;

    req.user = {
      idusuario: decoded.idusuario,
      email: decoded.email,
      roles: decoded.roles ?? [],
      permisos: decoded.permisos ?? [],
    };

    // 🔥 DEBUG (puedes quitar luego)
    console.log("USER:", req.user);

    return next();
  } catch (err) {
    return unauthorized(res, "Token inválido o expirado");
  }
};

/* =========================
   🔐 REQUIRE PERMISSION
========================= */
export function requirePermission(permission: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const permisos = req.user?.permisos ?? [];

    if (!permisos.includes(permission)) {
      return forbidden(res, `No tienes permiso: ${permission}`);
    }

    return next();
  };
}

/* =========================
   🔐 REQUIRE ROLE
========================= */
export function requireRole(role: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const roles = req.user?.roles ?? [];

    if (!roles.includes(role)) {
      return forbidden(res, `Requiere rol: ${role}`);
    }

    return next();
  };
}