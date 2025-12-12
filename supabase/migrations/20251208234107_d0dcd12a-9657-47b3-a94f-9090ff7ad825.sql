-- Eliminar la función existente
DROP FUNCTION IF EXISTS is_conversation_admin(uuid, uuid);

-- Crear función para verificar si un usuario es administrador de una conversación
CREATE OR REPLACE FUNCTION is_conversation_admin(conv_id uuid, profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM participantes_conversacion
    WHERE conversacion_id = conv_id
      AND user_id = profile_id
      AND role = 'administrador'
      AND hidden_at IS NULL
  );
$$;

-- Agregar política para que administradores puedan actualizar roles de otros participantes
CREATE POLICY "Admins can update participant roles"
ON participantes_conversacion
FOR UPDATE
USING (
  is_conversation_admin(conversacion_id, get_profile_id_from_auth())
)
WITH CHECK (
  is_conversation_admin(conversacion_id, get_profile_id_from_auth())
);