-- Función para toggle de categoría con cascada a hijos
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
  -- 1. Actualizar la categoría
  UPDATE categories
  SET 
    activo = p_new_status,
    updated_at = NOW(),
    deleted_at = CASE WHEN p_new_status = FALSE THEN NOW() ELSE NULL END
  WHERE id = p_category_id
  RETURNING * INTO v_updated_category;

  IF v_updated_category IS NULL THEN
    RAISE EXCEPTION 'Categoría no encontrada: %', p_category_id;
  END IF;

  -- 2. Actualizar todos los tipos de reporte hijos con el mismo estado
  UPDATE tipo_categories
  SET 
    activo = p_new_status,
    updated_at = NOW(),
    deleted_at = CASE WHEN p_new_status = FALSE THEN NOW() ELSE NULL END
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