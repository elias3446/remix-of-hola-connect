-- Corregir toggle_tipo_reporte_status: lógica correcta de cascada
CREATE OR REPLACE FUNCTION public.toggle_tipo_reporte_status(p_tipo_reporte_id uuid, p_new_status boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_category_id UUID;
  v_updated_tipo tipo_categories%ROWTYPE;
  v_active_siblings_count INTEGER;
  v_parent_was_updated BOOLEAN := FALSE;
BEGIN
  -- 1. Obtener el category_id del tipo de reporte
  SELECT category_id INTO v_category_id
  FROM tipo_categories
  WHERE id = p_tipo_reporte_id;

  -- 2. Actualizar SOLO el tipo de reporte específico
  UPDATE tipo_categories
  SET 
    activo = p_new_status,
    updated_at = NOW()
  WHERE id = p_tipo_reporte_id
  RETURNING * INTO v_updated_tipo;

  IF v_updated_tipo IS NULL THEN
    RAISE EXCEPTION 'Tipo de reporte no encontrado: %', p_tipo_reporte_id;
  END IF;

  -- Si no tiene categoría padre, retornar
  IF v_category_id IS NULL THEN
    RETURN json_build_object(
      'success', TRUE,
      'tipo_reporte_id', p_tipo_reporte_id,
      'new_status', p_new_status,
      'category_updated', FALSE
    );
  END IF;

  -- 3. Lógica de cascada hacia el padre
  IF p_new_status = TRUE THEN
    -- Si ACTIVAMOS un hijo, activar el padre si estaba inactivo
    UPDATE categories
    SET 
      activo = TRUE,
      updated_at = NOW()
    WHERE id = v_category_id
      AND activo = FALSE;
    
    IF FOUND THEN
      v_parent_was_updated := TRUE;
    END IF;
  ELSE
    -- Si DESACTIVAMOS un hijo, verificar si quedan hermanos activos
    SELECT COUNT(*) INTO v_active_siblings_count
    FROM tipo_categories
    WHERE category_id = v_category_id
      AND activo = TRUE
      AND deleted_at IS NULL;
    
    -- Si NO quedan hijos activos, desactivar el padre
    IF v_active_siblings_count = 0 THEN
      UPDATE categories
      SET 
        activo = FALSE,
        updated_at = NOW()
      WHERE id = v_category_id
        AND activo = TRUE;
      
      IF FOUND THEN
        v_parent_was_updated := TRUE;
      END IF;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'tipo_reporte_id', p_tipo_reporte_id,
    'new_status', p_new_status,
    'category_id', v_category_id,
    'category_updated', v_parent_was_updated,
    'remaining_active_siblings', COALESCE(v_active_siblings_count, 0)
  );
END;
$function$;