BEGIN;

-- Una invocación RPC es una transacción. No capturar errores ni realizar
-- compensaciones parciales: PostgreSQL debe revertir todas las escrituras.
CREATE OR REPLACE FUNCTION public.registrar_venta_completa_atomica(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_item jsonb;
  v_items jsonb;
  v_input public.detalle_venta%ROWTYPE;
  v_producto public.productos%ROWTYPE;
  v_venta public.venta%ROWTYPE;
  v_detalle public.detalle_venta%ROWTYPE;
  v_lote public.detalle_compra%ROWTYPE;
  v_restante numeric;
  v_consumir numeric;
  v_disponible numeric;
  v_precio numeric;
  v_cantidad numeric;
  v_total numeric := 0;
  v_ids text[] := ARRAY[]::text[];
BEGIN
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Venta inválida'; END IF;
  v_items := p_payload->'items';
  IF jsonb_typeof(v_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'La venta debe tener al menos un item'; END IF;
  IF jsonb_array_length(v_items) = 0 THEN RAISE EXCEPTION 'La venta debe tener al menos un item'; END IF;

  -- Validar números ANTES de convertir al tipo de columna (un integer redondearía).
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' OR NULLIF(trim(v_item->>'idproducto'), '') IS NULL THEN
      RAISE EXCEPTION 'idproducto es obligatorio';
    END IF;
    IF jsonb_typeof(v_item->'cantidad') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'cantidad inválida'; END IF;
    v_cantidad := (v_item->>'cantidad')::numeric;
    IF v_cantidad <= 0 OR v_cantidad <> trunc(v_cantidad) OR v_cantidad > 9007199254740991 THEN
      RAISE EXCEPTION 'cantidad debe ser un entero positivo';
    END IF;
    IF jsonb_typeof(v_item->'precioventa') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'precioventa inválido'; END IF;
    IF (v_item->>'precioventa')::numeric < 0 THEN RAISE EXCEPTION 'precioventa inválido'; END IF;
    v_input := jsonb_populate_record(NULL::public.detalle_venta, v_item);
    IF v_input.idproducto::text = ANY(v_ids) THEN RAISE EXCEPTION 'No se permiten productos repetidos'; END IF;
    v_ids := array_append(v_ids, v_input.idproducto::text);
  END LOOP;

  -- Orden estable: dos ventas con los mismos productos adquieren los bloqueos
  -- en el mismo orden, aunque los artículos lleguen ordenados de forma diferente.
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) ORDER BY lower(value->>'idproducto') LOOP
    v_input := jsonb_populate_record(NULL::public.detalle_venta, v_item);
    SELECT * INTO v_producto FROM public.productos WHERE idproducto = v_input.idproducto FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado'; END IF;
    IF v_producto.estado IS DISTINCT FROM 'ACTIVO' THEN RAISE EXCEPTION 'Solo se pueden vender productos activos'; END IF;
    IF v_producto.stock IS NULL OR v_producto.stock < v_input.cantidad THEN RAISE EXCEPTION 'Stock insuficiente del producto %', v_producto.idproducto; END IF;
  END LOOP;

  v_venta := jsonb_populate_record(NULL::public.venta, p_payload - 'items');
  INSERT INTO public.venta (fechaventa, idusuario, estado, total)
  VALUES (COALESCE(v_venta.fechaventa, now()), v_venta.idusuario, 'PENDIENTE', 0)
  RETURNING * INTO v_venta;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) ORDER BY lower(value->>'idproducto') LOOP
    v_input := jsonb_populate_record(NULL::public.detalle_venta, v_item);
    v_restante := v_input.cantidad;
    v_precio := v_input.precioventa;
    v_disponible := 0;

    -- Nunca consumir lotes pendientes o cancelados. Se bloquean también sus
    -- compras para que el estado no cambie mientras se procesa esta operación.
    FOR v_lote IN
      SELECT dc.* FROM public.detalle_compra dc JOIN public.compra c ON c.idcompra = dc.idcompra
      WHERE dc.idproducto = v_input.idproducto AND dc.stockrestante > 0 AND c.estado = 'COMPLETADA'
      ORDER BY dc.creado_en, dc.iddetallecompra FOR UPDATE OF dc, c
    LOOP
      v_disponible := v_disponible + v_lote.stockrestante;
    END LOOP;
    IF v_disponible < v_restante THEN RAISE EXCEPTION 'Stock insuficiente en los lotes del producto %', v_input.idproducto; END IF;

    INSERT INTO public.detalle_venta (idventa, idproducto, cantidad, precioventa)
    VALUES (v_venta.idventa, v_input.idproducto, v_input.cantidad, v_precio)
    RETURNING * INTO v_detalle;

    FOR v_lote IN
      SELECT dc.* FROM public.detalle_compra dc JOIN public.compra c ON c.idcompra = dc.idcompra
      WHERE dc.idproducto = v_input.idproducto AND dc.stockrestante > 0 AND c.estado = 'COMPLETADA'
      ORDER BY dc.creado_en, dc.iddetallecompra
    LOOP
      EXIT WHEN v_restante <= 0;
      v_consumir := least(v_restante, v_lote.stockrestante);
      IF v_lote.preciocosto IS NULL OR v_precio < v_lote.preciocosto THEN
        RAISE EXCEPTION 'El precio de venta no puede ser menor al precio de compra';
      END IF;
      UPDATE public.detalle_compra SET stockrestante = stockrestante - v_consumir WHERE iddetallecompra = v_lote.iddetallecompra;
      INSERT INTO public.detalle_venta_lote (iddetalleventa, iddetallecompra, idproducto, cantidad, preciocosto, subtotalcosto)
      VALUES (v_detalle.iddetalleventa, v_lote.iddetallecompra, v_input.idproducto, v_consumir, v_lote.preciocosto, v_consumir * v_lote.preciocosto);
      v_restante := v_restante - v_consumir;
    END LOOP;
    IF v_restante <> 0 THEN RAISE EXCEPTION 'No se pudo consumir completamente el stock'; END IF;
    UPDATE public.productos SET stock = stock - v_input.cantidad,
      estado = (jsonb_populate_record(NULL::public.productos, jsonb_build_object(
        'estado', CASE WHEN stock - v_input.cantidad > 0 THEN 'ACTIVO' ELSE 'INACTIVO' END))).estado
    WHERE idproducto = v_input.idproducto;
    v_total := v_total + COALESCE(v_detalle.subtotal, v_input.cantidad * v_precio);
  END LOOP;
  UPDATE public.venta SET total = v_total, estado = 'COMPLETADA' WHERE idventa = v_venta.idventa RETURNING * INTO v_venta;
  RETURN jsonb_build_object('idventa', v_venta.idventa, 'fechaventa', v_venta.fechaventa,
    'estado', v_venta.estado, 'total', v_venta.total, 'creado_en', v_venta.creado_en, 'idusuario', v_venta.idusuario);
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_venta_completa_atomica(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_venta_completa_atomica(jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
