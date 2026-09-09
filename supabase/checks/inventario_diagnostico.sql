-- Diagnóstico de SOLO LECTURA. No restaura unidades automáticamente.
-- Comparar con documentos y existencias físicas antes de cualquier corrección.
WITH lotes AS (
  SELECT dc.idproducto, sum(dc.stockrestante) AS stock_lotes
  FROM public.detalle_compra dc JOIN public.compra c ON c.idcompra = dc.idcompra
  WHERE c.estado = 'COMPLETADA' GROUP BY dc.idproducto
)
SELECT p.idproducto, p.codigoprod, p.nombre, p.stock,
  COALESCE(l.stock_lotes,0) AS stock_lotes_completados,
  p.stock - COALESCE(l.stock_lotes,0) AS diferencia
FROM public.productos p LEFT JOIN lotes l ON l.idproducto = p.idproducto
WHERE p.stock IS DISTINCT FROM COALESCE(l.stock_lotes,0)
ORDER BY p.nombre;

WITH consumos AS (
  SELECT l.iddetallecompra, sum(l.cantidad) AS consumido
  FROM public.detalle_venta_lote l
  JOIN public.detalle_venta d ON d.iddetalleventa = l.iddetalleventa
  JOIN public.venta v ON v.idventa = d.idventa
  WHERE v.estado = 'COMPLETADA' GROUP BY l.iddetallecompra
)
SELECT dc.iddetallecompra, dc.idproducto, c.estado AS estado_compra,
  dc.cantidad, dc.stockrestante, COALESCE(x.consumido,0) AS consumo_registrado,
  CASE WHEN c.estado = 'COMPLETADA' THEN dc.cantidad - COALESCE(x.consumido,0) ELSE 0 END AS restante_segun_documentos
FROM public.detalle_compra dc JOIN public.compra c ON c.idcompra = dc.idcompra
LEFT JOIN consumos x ON x.iddetallecompra = dc.iddetallecompra
WHERE dc.stockrestante IS DISTINCT FROM
  CASE WHEN c.estado = 'COMPLETADA' THEN dc.cantidad - COALESCE(x.consumido,0) ELSE 0 END
ORDER BY dc.creado_en;
