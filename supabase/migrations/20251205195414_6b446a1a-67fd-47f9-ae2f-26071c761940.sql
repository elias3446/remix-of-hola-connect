-- Función para verificar si el usuario debe cambiar su contraseña
CREATE OR REPLACE FUNCTION public.check_must_change_password(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  profile_record RECORD;
BEGIN
  SELECT must_change_password, temp_password_used
  INTO profile_record
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'must_change', false,
      'reason', null
    );
  END IF;
  
  -- Si debe cambiar la contraseña
  IF profile_record.must_change_password = true THEN
    RETURN json_build_object(
      'must_change', true,
      'reason', 'mandatory_change'
    );
  END IF;
  
  -- Si usó contraseña temporal
  IF profile_record.temp_password_used = true THEN
    RETURN json_build_object(
      'must_change', true,
      'reason', 'temp_password'
    );
  END IF;
  
  RETURN json_build_object(
    'must_change', false,
    'reason', null
  );
END;
$$;