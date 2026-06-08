import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        idusuario: string;
        email?: string;
        roles?: string[];
        permisos?: string[];
      };
    }
  }
}

export {};