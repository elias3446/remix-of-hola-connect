-- Función RPC optimizada para obtener conversaciones con último mensaje y conteo de no leídos
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id UUID, p_filter TEXT DEFAULT 'all')
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  es_grupo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  participantes JSONB,
  ultimo_mensaje JSONB,
  unread_count BIGINT,
  is_muted BOOLEAN,
  other_participant JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Obtener profile_id del usuario
  SELECT p.id INTO v_profile_id
  FROM profiles p
  WHERE p.user_id = p_user_id;

  IF v_profile_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH user_conversations AS (
    -- Obtener conversaciones donde el usuario participa
    SELECT 
      c.id,
      c.nombre,
      c.es_grupo,
      c.created_at,
      c.updated_at,
      c.created_by,
      pc.muted,
      pc.hidden_at,
      pc.hidden_from_todos
    FROM conversaciones c
    INNER JOIN participantes_conversacion pc ON pc.conversacion_id = c.id
    WHERE pc.user_id = v_profile_id
      AND (NOT c.es_grupo OR pc.hidden_at IS NULL) -- Excluir grupos donde salió
  ),
  conversation_participants AS (
    -- Obtener participantes de cada conversación (excluyendo los que salieron)
    SELECT 
      pc.conversacion_id,
      jsonb_agg(
        jsonb_build_object(
          'user_id', pc.user_id,
          'role', pc.role,
          'muted', pc.muted,
          'hidden_at', pc.hidden_at,
          'profile', jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'avatar', p.avatar,
            'username', p.username,
            'estado', p.estado
          )
        )
      ) as participantes
    FROM participantes_conversacion pc
    INNER JOIN profiles p ON p.id = pc.user_id
    WHERE pc.hidden_at IS NULL
    GROUP BY pc.conversacion_id
  ),
  last_messages AS (
    -- Obtener último mensaje de cada conversación
    SELECT DISTINCT ON (m.conversacion_id)
      m.conversacion_id,
      jsonb_build_object(
        'id', m.id,
        'contenido', m.contenido,
        'created_at', m.created_at,
        'user_id', m.user_id,
        'imagenes', m.imagenes,
        'shared_post', m.shared_post,
        'sender', jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'avatar', p.avatar,
          'username', p.username
        )
      ) as ultimo_mensaje
    FROM mensajes m
    LEFT JOIN profiles p ON p.id = m.user_id
    WHERE m.deleted_at IS NULL
    ORDER BY m.conversacion_id, m.created_at DESC
  ),
  unread_counts AS (
    -- Contar mensajes no leídos por conversación
    SELECT 
      m.conversacion_id,
      COUNT(*)::BIGINT as unread_count
    FROM mensajes m
    LEFT JOIN message_receipts mr ON mr.message_id = m.id AND mr.user_id = v_profile_id
    WHERE m.user_id != v_profile_id
      AND m.deleted_at IS NULL
      AND mr.read_at IS NULL
    GROUP BY m.conversacion_id
  )
  SELECT 
    uc.id,
    uc.nombre,
    uc.es_grupo,
    uc.created_at,
    uc.updated_at,
    uc.created_by,
    COALESCE(cp.participantes, '[]'::jsonb) as participantes,
    lm.ultimo_mensaje,
    COALESCE(urc.unread_count, 0) as unread_count,
    uc.muted as is_muted,
    -- Para chats individuales, obtener el otro participante
    CASE 
      WHEN NOT uc.es_grupo THEN (
        SELECT jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'avatar', p.avatar,
          'username', p.username
        )
        FROM participantes_conversacion pc2
        INNER JOIN profiles p ON p.id = pc2.user_id
        WHERE pc2.conversacion_id = uc.id 
          AND pc2.user_id != v_profile_id
          AND pc2.hidden_at IS NULL
        LIMIT 1
      )
      ELSE NULL
    END as other_participant
  FROM user_conversations uc
  LEFT JOIN conversation_participants cp ON cp.conversacion_id = uc.id
  LEFT JOIN last_messages lm ON lm.conversacion_id = uc.id
  LEFT JOIN unread_counts urc ON urc.conversacion_id = uc.id
  WHERE 
    -- Aplicar filtros
    CASE 
      WHEN p_filter = 'groups' THEN uc.es_grupo = true
      WHEN p_filter = 'individual' THEN uc.es_grupo = false
      WHEN p_filter = 'unread' THEN COALESCE(urc.unread_count, 0) > 0
      WHEN p_filter = 'all' THEN 
        -- Excluir ocultas excepto si tienen mensajes no leídos
        (NOT uc.hidden_from_todos OR COALESCE(urc.unread_count, 0) > 0)
      ELSE true
    END
  ORDER BY uc.updated_at DESC;
END;
$$;