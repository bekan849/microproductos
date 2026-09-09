BEGIN;
CREATE INDEX IF NOT EXISTS venta_estado_fecha_idx ON public.venta (estado, fechaventa);
CREATE INDEX IF NOT EXISTS compra_estado_fecha_idx ON public.compra (estado, fechaingreso);
CREATE INDEX IF NOT EXISTS detalle_venta_venta_idx ON public.detalle_venta (idventa);
CREATE INDEX IF NOT EXISTS detalle_venta_lote_detalle_idx ON public.detalle_venta_lote (iddetalleventa);
CREATE INDEX IF NOT EXISTS detalle_compra_peps_idx ON public.detalle_compra (idproducto, creado_en, iddetallecompra) WHERE stockrestante > 0;
CREATE INDEX IF NOT EXISTS detalle_compra_compra_idx ON public.detalle_compra (idcompra);

CREATE OR REPLACE FUNCTION public.dashboard_inicial(p_reportes boolean, p_ventas boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_hoy date := (now() AT TIME ZONE 'America/La_Paz')::date;
  v_dia timestamptz;
  v_mes timestamptz;
  v_anio timestamptz;
  v_fin timestamptz;
  v_datos jsonb := '{}'::jsonb;
  v_resumen jsonb;
  v_series jsonb;
  v_recientes jsonb;
BEGIN
  v_dia := v_hoy::timestamp AT TIME ZONE 'America/La_Paz';
  v_mes := date_trunc('month', v_hoy::timestamp) AT TIME ZONE 'America/La_Paz';
  v_anio := date_trunc('year', v_hoy::timestamp) AT TIME ZONE 'America/La_Paz';
  v_fin := (v_hoy + 1)::timestamp AT TIME ZONE 'America/La_Paz';
  IF p_reportes THEN
    WITH ventas AS MATERIALIZED (
      SELECT v.idventa, v.fechaventa, v.total, COALESCE(sum(l.subtotalcosto),0) AS costo
      FROM public.venta v LEFT JOIN public.detalle_venta d ON d.idventa = v.idventa
      LEFT JOIN public.detalle_venta_lote l ON l.iddetalleventa = d.iddetalleventa
      WHERE v.estado = 'COMPLETADA' AND v.fechaventa >= v_anio AND v.fechaventa < v_fin
      GROUP BY v.idventa, v.fechaventa, v.total
    ), compras AS MATERIALIZED (
      SELECT fechaingreso, total FROM public.compra
      WHERE estado = 'COMPLETADA' AND fechaingreso >= v_anio AND fechaingreso < v_fin
    ), periodos AS (
      SELECT 'resumenDia' AS nombre, v_dia AS inicio UNION ALL SELECT 'resumenMes', v_mes
    )
    SELECT jsonb_object_agg(p.nombre, jsonb_build_object(
      'desde', (p.inicio AT TIME ZONE 'America/La_Paz')::date, 'hasta', v_hoy,
      'ventasTotales', COALESCE(v.total,0), 'comprasTotales', COALESCE(c.total,0),
      'costoRealVentas', COALESCE(v.costo,0), 'gananciaReal', COALESCE(v.total,0)-COALESCE(v.costo,0),
      'cantidadVentas', v.cantidad, 'cantidadCompras', c.cantidad))
    INTO v_resumen FROM periodos p
    CROSS JOIN LATERAL (SELECT sum(total) AS total, sum(costo) AS costo, count(*) AS cantidad FROM ventas WHERE fechaventa >= p.inicio) v
    CROSS JOIN LATERAL (SELECT sum(total) AS total, count(*) AS cantidad FROM compras WHERE fechaingreso >= p.inicio) c;

    WITH ventas AS (
      SELECT to_char(v.fechaventa AT TIME ZONE 'America/La_Paz','YYYY-MM') AS periodo,
        v.idventa, v.total, COALESCE(sum(l.subtotalcosto),0) AS costo
      FROM public.venta v LEFT JOIN public.detalle_venta d ON d.idventa = v.idventa
      LEFT JOIN public.detalle_venta_lote l ON l.iddetalleventa = d.iddetalleventa
      WHERE v.estado = 'COMPLETADA' AND v.fechaventa >= v_anio AND v.fechaventa < v_fin
      GROUP BY v.idventa, v.fechaventa, v.total
    ), movimientos AS (
      SELECT periodo, total AS ventas, costo, 0::numeric AS compras, 1 AS nv, 0 AS nc FROM ventas
      UNION ALL
      SELECT to_char(fechaingreso AT TIME ZONE 'America/La_Paz','YYYY-MM'), 0, 0, total, 0, 1
      FROM public.compra WHERE estado = 'COMPLETADA' AND fechaingreso >= v_anio AND fechaingreso < v_fin
    ), agrupados AS (
      SELECT periodo, sum(ventas) AS ventas, sum(compras) AS compras,
        sum(costo) AS "costoRealVentas", sum(ventas)-sum(costo) AS "gananciaReal",
        sum(nv) AS "cantidadVentas", sum(nc) AS "cantidadCompras"
      FROM movimientos GROUP BY periodo
    ) SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.periodo),'[]'::jsonb) INTO v_series FROM agrupados a;
    v_datos := v_resumen || jsonb_build_object('gananciasMensuales',v_series);
  END IF;
  IF p_ventas THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r."creadoEn" DESC, r.id),'[]'::jsonb) INTO v_recientes FROM (
      SELECT d.iddetalleventa AS id, d.idventa, upper(left(d.idventa::text,8)) AS "ventaCodigo",
        d.cantidad, d.precioventa AS "precioUnitario", d.subtotal,
        COALESCE(p.nombre,'Producto sin nombre') AS producto, p.codigoprod AS codigo,
        COALESCE(m.nombre,'Sin marca') AS marca, p.urlimagen AS imagen, d.creado_en AS "creadoEn"
      FROM public.detalle_venta d JOIN public.venta v ON v.idventa = d.idventa
      LEFT JOIN public.productos p ON p.idproducto = d.idproducto LEFT JOIN public.marcas m ON m.idmarca = p.idmarca
      WHERE v.estado = 'COMPLETADA' AND v.fechaventa >= v_dia AND v.fechaventa < v_fin
      ORDER BY d.creado_en DESC, d.iddetalleventa LIMIT 20
    ) r;
    v_datos := v_datos || jsonb_build_object('productosVendidosHoy',v_recientes);
  END IF;
  RETURN jsonb_build_object('fecha',v_hoy) || v_datos;
END;
$$;
REVOKE ALL ON FUNCTION public.dashboard_inicial(boolean,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_inicial(boolean,boolean) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
