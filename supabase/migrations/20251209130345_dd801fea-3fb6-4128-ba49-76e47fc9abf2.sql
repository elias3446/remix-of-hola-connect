-- Function to update messages when an estado is deleted or deactivated
CREATE OR REPLACE FUNCTION public.handle_estado_deleted()
RETURNS TRIGGER AS $$
BEGIN
  -- When estado is soft-deleted (activo = false) or hard deleted
  -- Update all messages that contain this estado
  UPDATE public.mensajes
  SET shared_post = jsonb_set(
    COALESCE(shared_post, '{}'::jsonb),
    '{deleted}',
    'true'::jsonb
  )
  WHERE shared_post->>'estadoId' = OLD.id::text;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for soft delete (when activo changes to false)
CREATE OR REPLACE TRIGGER on_estado_soft_delete
  AFTER UPDATE OF activo ON public.estados
  FOR EACH ROW
  WHEN (OLD.activo = true AND NEW.activo = false)
  EXECUTE FUNCTION public.handle_estado_deleted();

-- Trigger for hard delete
CREATE OR REPLACE TRIGGER on_estado_hard_delete
  BEFORE DELETE ON public.estados
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_estado_deleted();