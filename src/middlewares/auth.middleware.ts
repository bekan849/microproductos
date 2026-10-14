import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { empresaContext } from '../lib/empresa-context';
import { obtenerAccesosEmpresa } from '../services/empresa.service';

export const decodeIdentity: RequestHandler = (req,res,next) => {
  try {
    const [scheme,token,...extra] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token || extra.length) throw new Error();
    const decoded = jwt.verify(token,env.JWT_SECRET,{ algorithms:['HS256'] });
    if (typeof decoded === 'string' || decoded.version !== 2 || typeof decoded.idusuario !== 'string' ||
        !['empresa','seleccion_empresa'].includes(decoded.tipo) ||
        (decoded.tipo === 'empresa' && typeof decoded.idempresa !== 'string')) throw new Error();
    req.user = { idusuario:decoded.idusuario,idempresa:decoded.idempresa,tipo:decoded.tipo,
      email:decoded.email,nombre:decoded.nombre,apellido:decoded.apellido,roles:[],permisos:[] };
    next();
  } catch { res.status(401).json({ok:false,message:'Inicia sesión nuevamente'}); }
};

export const decodeToken: RequestHandler = (req,res,next) => {
  decodeIdentity(req,res,async () => {
    if (req.user?.tipo !== 'empresa' || !req.user.idempresa) {
      res.status(403).json({ok:false,message:'Selecciona una empresa para continuar'}); return;
    }
    try {
      const access = await obtenerAccesosEmpresa(req.user.idusuario,req.user.idempresa);
      req.user.roles=access.roles.map(r=>r.nombre);
      req.user.permisos=access.permisos.map(p=>p.codigo);
      empresaContext.run({idempresa:req.user.idempresa,idusuario:req.user.idusuario,permisos:req.user.permisos},next);
    } catch { res.status(403).json({ok:false,message:'No tienes acceso vigente a esta empresa'}); }
  });
};
