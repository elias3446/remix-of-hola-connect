-- Corregir toggle_category_status: solo cambiar activo, no deleted_at
CREATE OR REPLACE FUNCTION public.toggle_category_status(p_category_id uuid, p_new_status boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated_category categories%ROWTYPE;
  v_children_affected INTEGER;
BEGIN
  -- 1. Actualizar solo el estado activo de la categoría
  UPDATE categories
  SET 
    activo = p_new_status,
    updated_at = NOW()
  WHERE id = p_category_id
  RETURNING * INTO v_updated_category;

  IF v_updated_category IS NULL THEN
    RAISE EXCEPTION 'Categoría no encontrada: %', p_category_id;
  END IF;

  -- 2. Actualizar solo el estado activo de los hijos
  UPDATE tipo_categories
  SET 
    activo = p_new_status,
    updated_at = NOW()
  WHERE category_id = p_category_id;

  GET DIAGNOSTICS v_children_affected = ROW_COUNT;

  RETURN json_build_object(
    'success', TRUE,
    'category_id', p_category_id,
    'new_status', p_new_status,
    'children_affected', v_children_affected
  );
END;
$function$;

-- Corregir toggle_tipo_reporte_status: solo cambiar activo, no deleted_at
CREATE OR REPLACE FUNCTION public.toggle_tipo_reporte_status(p_tipo_reporte_id uuid, p_new_status boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_category_id UUID;
  v_updated_tipo tipo_categories%ROWTYPE;
  v_rows_affected INTEGER;
BEGIN
  -- 1. Obtener el category_id del tipo de reporte
  SELECT category_id INTO v_category_id
  FROM tipo_categories
  WHERE id = p_tipo_reporte_id;

  -- 2. Actualizar solo el estado activo del tipo de reporte
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

  -- 3. Actualizar solo el estado activo de la categoría padre
  UPDATE categories
  SET 
    activo = p_new_status,
    updated_at = NOW()
  WHERE id = v_category_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- 4. Si estamos DESACTIVANDO, también desactivar todos los hermanos
  IF p_new_status = FALSE THEN
    UPDATE tipo_categories
    SET 
      activo = FALSE,
      updated_at = NOW()
    WHERE category_id = v_category_id
      AND id != p_tipo_reporte_id
      AND activo = TRUE;
  END IF;

  -- 5. Si estamos ACTIVANDO, también activar todos los hermanos
  IF p_new_status = TRUE THEN
    UPDATE tipo_categories
    SET 
      activo = TRUE,
      updated_at = NOW()
    WHERE category_id = v_category_id
      AND id != p_tipo_reporte_id
      AND activo = FALSE;
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'tipo_reporte_id', p_tipo_reporte_id,
    'new_status', p_new_status,
    'category_id', v_category_id,
    'category_updated', v_rows_affected > 0
  );
END;
$function$;