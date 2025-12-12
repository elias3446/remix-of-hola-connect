-- Corregir la función:
-- activo = true → status = 'pendiente'
-- activo = false → status = 'resuelto'
CREATE OR REPLACE FUNCTION public.sync_reporte_status_activo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Si se desactiva (activo cambia de true a false), cambiar status a resuelto
  IF NEW.activo = false AND OLD.activo = true THEN
    NEW.status := 'resuelto';
  END IF;
  
  -- Si se activa (activo cambia de false a true), cambiar status a pendiente
  IF NEW.activo = true AND OLD.activo = false THEN
    NEW.status := 'pendiente';
  END IF;
  
  RETURN NEW;
END;
$function$;