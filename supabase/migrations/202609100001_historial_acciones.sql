BEGIN;
CREATE TABLE IF NOT EXISTS public.historial_acciones (
  id uuid PRIMARY KEY,
  fecha timestamptz NOT NULL DEFAULT clock_timestamp(),
  servicio text NOT NULL CHECK (servicio IN ('usuarios', 'productos')),
  actor_id text,
  actor_email text,
  accion text NOT NULL,
  recurso text NOT NULL,
  registro_id text,
  resultado text NOT NULL CHECK (resultado IN ('exito', 'error')),
  estado_http integer NOT NULL CHECK (estado_http BETWEEN 100 AND 599),
  antes jsonb,
  despues jsonb,
  detalles jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS historial_servicio_fecha_idx ON public.historial_acciones(servicio, fecha DESC, id DESC);
CREATE INDEX IF NOT EXISTS historial_actor_fecha_idx ON public.historial_acciones(actor_id, fecha DESC);
CREATE INDEX IF NOT EXISTS historial_accion_fecha_idx ON public.historial_acciones(servicio, accion, fecha DESC);
ALTER TABLE public.historial_acciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.historial_acciones FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.historial_acciones TO service_role;

-- No UPDATE/DELETE/TRUNCATE from the application's service role, even with RLS bypass.
CREATE OR REPLACE FUNCTION public.proteger_historial_acciones()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'El historial de acciones no se puede modificar ni borrar';
END;
$$;
REVOKE ALL ON FUNCTION public.proteger_historial_acciones() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS historial_solo_lectura ON public.historial_acciones;
CREATE TRIGGER historial_solo_lectura BEFORE UPDATE OR DELETE OR TRUNCATE
ON public.historial_acciones FOR EACH STATEMENT EXECUTE FUNCTION public.proteger_historial_acciones();
NOTIFY pgrst, 'reload schema';
COMMIT;
