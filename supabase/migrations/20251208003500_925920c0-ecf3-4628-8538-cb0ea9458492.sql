-- Crear trigger para sincronizar status y activo en reportes
CREATE TRIGGER trigger_sync_reporte_status_activo
BEFORE UPDATE ON public.reportes
FOR EACH ROW
EXECUTE FUNCTION public.sync_reporte_status_activo();