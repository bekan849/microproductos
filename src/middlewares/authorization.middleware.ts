import type { RequestHandler } from 'express';
export { decodeToken } from './auth.middleware';
export const requireAuth: RequestHandler = (req,res,next) => {
  if (!req.user?.idusuario || !req.user.idempresa) { res.status(401).json({ok:false,message:'Selecciona una empresa'}); return; }
  next();
};
export function requirePermission(permission: string): RequestHandler {
  return (req,res,next) => {
    if (!req.user?.permisos?.includes(permission)) { res.status(403).json({ok:false,message:'No tienes permiso: '+permission}); return; }
    next();
  };
}
export function requireRole(role: string): RequestHandler {
  return (req,res,next) => {
    if (!req.user?.roles?.includes(role)) { res.status(403).json({ok:false,message:'Requiere rol: '+role}); return; }
    next();
  };
}
