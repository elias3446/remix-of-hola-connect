-- Actualizar función para incluir activo = false
CREATE OR REPLACE FUNCTION public.soft_delete_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo ejecutar si deleted_at cambió de NULL a NOT NULL
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    
    -- Soft delete de tipo_categories relacionados (ahora también pone activo = false)
    UPDATE public.tipo_categories
    SET 
      deleted_at = now(),
      activo = false,
      updated_at = now()
    WHERE category_id = NEW.id AND deleted_at IS NULL;
    
    -- Actualizar reportes para poner categoria_id y tipo_reporte_id a NULL
    UPDATE public.reportes
    SET 
      categoria_id = NULL,
      tipo_reporte_id = NULL
    WHERE categoria_id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$function$;