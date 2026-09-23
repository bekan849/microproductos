import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

/* =========================
   🔐 TIPADO DEL TOKEN
========================= */
type TokenPayload = {
  nombre?: string;
  apellido?: string;
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
        nombre?: string;
        apellido?: string;
        idusuario: string;
        email?: string;
        roles?: string[];
        permisos?: string[];
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

    if (typeof decoded.idusuario !== "string" || !decoded.idusuario) return unauthorized(res);
    if (decoded.roles && (!Array.isArray(decoded.roles) || decoded.roles.some(r => typeof r !== "string"))) return unauthorized(res);
    if (decoded.permisos && (!Array.isArray(decoded.permisos) || decoded.permisos.some(p => typeof p !== "string"))) return unauthorized(res);
    req.user = {
      nombre: typeof decoded.nombre === "string" ? decoded.nombre : undefined,
      apellido: typeof decoded.apellido === "string" ? decoded.apellido : undefined,
      idusuario: decoded.idusuario,
      email: decoded.email,
      roles: decoded.roles ?? [],
      permisos: decoded.permisos ?? [],
    };


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
    if (!req.user?.idusuario) return unauthorized(res);
    const permisos = req.user.permisos ?? [];

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
    if (!req.user?.idusuario) return unauthorized(res);
    const roles = req.user.roles ?? [];

    if (!roles.includes(role)) {
      return forbidden(res, `Requiere rol: ${role}`);
    }

    return next();
  };
}
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user?.idusuario) return unauthorized(res);
  return next();
};
