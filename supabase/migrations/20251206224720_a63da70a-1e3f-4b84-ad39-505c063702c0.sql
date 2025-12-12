
-- Función que sincroniza el estado activo con el status del reporte
CREATE OR REPLACE FUNCTION public.sync_reporte_status_activo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Caso 1: Si el status cambia a 'resuelto', desactivar automáticamente
  IF NEW.status = 'resuelto' AND OLD.status != 'resuelto' THEN
    NEW.activo := false;
  END IF;
  
  -- Caso 2: Si se reactiva (activo cambia de false a true), volver a pendiente
  IF NEW.activo = true AND OLD.activo = false AND NEW.status = 'resuelto' THEN
    NEW.status := 'pendiente';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear el trigger BEFORE UPDATE para que pueda modificar NEW
CREATE TRIGGER sync_reporte_status_activo_trigger
  BEFORE UPDATE ON public.reportes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reporte_status_activo();

-- Comentario descriptivo
COMMENT ON FUNCTION public.sync_reporte_status_activo() IS 
'Sincroniza automáticamente el campo activo con el status del reporte:
- Cuando status = resuelto → activo = false
- Cuando activo cambia de false a true (y estaba resuelto) → status = pendiente';
