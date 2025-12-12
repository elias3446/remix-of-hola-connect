-- Crear función que reactiva la conversación para todos los participantes cuando llega un nuevo mensaje
CREATE OR REPLACE FUNCTION public.reactivate_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Reactivar la conversación para todos los participantes (excepto el que envía)
  UPDATE public.participantes_conversacion
  SET hidden_from_todos = false
  WHERE conversacion_id = NEW.conversacion_id
    AND user_id != NEW.user_id
    AND hidden_from_todos = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear trigger que se ejecuta después de insertar un mensaje
DROP TRIGGER IF EXISTS reactivate_conversation_trigger ON public.mensajes;
CREATE TRIGGER reactivate_conversation_trigger
  AFTER INSERT ON public.mensajes
  FOR EACH ROW
  EXECUTE FUNCTION public.reactivate_conversation_on_new_message();