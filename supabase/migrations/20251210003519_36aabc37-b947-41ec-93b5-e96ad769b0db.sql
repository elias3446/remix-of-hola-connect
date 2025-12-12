-- Función para cambiar el email del propio usuario (sin requerir permiso de admin)
CREATE OR REPLACE FUNCTION public.complete_own_email_change(
  p_new_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_old_user_id UUID;
  v_old_email TEXT;
  v_new_username TEXT;
  v_ip_address INET;
  v_user_agent TEXT;
BEGIN
  -- Obtener ID del perfil del usuario actual
  v_profile_id := get_profile_id_from_auth();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo identificar tu perfil';
  END IF;

  -- Obtener información del cliente
  BEGIN
    v_ip_address := inet_client_addr();
  EXCEPTION
    WHEN OTHERS THEN
      v_ip_address := NULL;
  END;
  
  v_user_agent := get_user_agent();

  -- Obtener datos actuales del perfil
  SELECT user_id, email INTO v_old_user_id, v_old_email
  FROM profiles
  WHERE id = v_profile_id;

  IF v_old_user_id IS NULL THEN
    RAISE EXCEPTION 'El perfil no existe o ya está desvinculado';
  END IF;

  -- Verificar que el nuevo email no esté en uso
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_new_email) THEN
    RAISE EXCEPTION 'El email % ya está en uso', p_new_email;
  END IF;

  -- Generar nuevo username
  v_new_username := generate_unique_username(p_new_email);

  -- PASO 1: Desvincular el perfil del usuario viejo
  UPDATE profiles
  SET 
    user_id = NULL,
    email = p_new_email,
    username = v_new_username,
    confirmed = false,
    updated_at = now()
  WHERE id = v_profile_id;

  -- PASO 2: Eliminar el usuario viejo de auth.users
  DELETE FROM auth.users WHERE id = v_old_user_id;

  -- Registrar auditoría del cambio de email
  INSERT INTO user_audit (
    user_id,
    performed_by,
    action,
    tabla_afectada,
    registro_id,
    valores_anteriores,
    valores_nuevos,
    campos_modificados,
    ip_address,
    user_agent,
    metadata,
    details
  ) VALUES (
    v_profile_id,
    v_profile_id,
    'UPDATE',
    'profiles',
    v_profile_id,
    jsonb_build_object('email', v_old_email),
    jsonb_build_object('email', p_new_email, 'username', v_new_username),
    ARRAY['email', 'username'],
    v_ip_address,
    v_user_agent,
    jsonb_build_object(
      'profile_id', v_profile_id,
      'self_change', true,
      'old_user_id', v_old_user_id
    ),
    'Cambio de email propio'
  );

  -- Retornar información del cambio
  RETURN jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'old_email', v_old_email,
    'new_email', p_new_email,
    'new_username', v_new_username,
    'message', 'Email preparado para cambio.'
  );
END;
$$;