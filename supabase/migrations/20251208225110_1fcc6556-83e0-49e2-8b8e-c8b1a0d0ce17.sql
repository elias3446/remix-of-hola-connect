-- Eliminar la política actual de lectura
DROP POLICY IF EXISTS "Participantes pueden ver mensajes incluidos de grupos abandonad" ON public.mensajes;

-- Crear nueva política que permite ver mensajes eliminados (para que el realtime funcione)
-- Los mensajes con deleted_at se mostrarán como "Este mensaje fue eliminado" en la UI
CREATE POLICY "Participantes pueden ver mensajes de su conversación"
ON public.mensajes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM participantes_conversacion
    WHERE participantes_conversacion.conversacion_id = mensajes.conversacion_id
    AND participantes_conversacion.user_id = get_profile_id_from_auth()
  )
  AND NOT (hidden_by_users @> jsonb_build_array(get_profile_id_from_auth()))
);