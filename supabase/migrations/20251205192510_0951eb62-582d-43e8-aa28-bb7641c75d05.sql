-- Función para verificar si un usuario está bloqueado en user_blocks
CREATE OR REPLACE FUNCTION public.check_user_block(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  block_record record;
BEGIN
  SELECT reason, is_permanent, blocked_at
  INTO block_record
  FROM user_blocks
  WHERE email = lower(trim(p_email));
  
  IF FOUND THEN
    RETURN json_build_object(
      'is_blocked', true,
      'reason', COALESCE(block_record.reason, 'Cuenta bloqueada'),
      'is_permanent', COALESCE(block_record.is_permanent, false),
      'blocked_at', block_record.blocked_at
    );
  END IF;
  
  RETURN json_build_object('is_blocked', false);
END;
$$;