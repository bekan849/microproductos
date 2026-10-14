import { AsyncLocalStorage } from 'node:async_hooks';

export type EmpresaContext = {
  idempresa: string;
  idusuario: string;
  permisos: string[];
};
export const empresaContext = new AsyncLocalStorage<EmpresaContext>();
export function requireEmpresaContext(): EmpresaContext {
  const context = empresaContext.getStore();
  if (!context) throw new Error('Selecciona una empresa para continuar');
  return context;
}
