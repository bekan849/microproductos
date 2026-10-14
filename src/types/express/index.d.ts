import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        idempresa?: string;
        tipo?: 'empresa' | 'seleccion_empresa';
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

export {};
