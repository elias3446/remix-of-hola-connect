-- Fix hide_message_for_user to preserve updated_at and avoid "editado" indicator
CREATE OR REPLACE FUNCTION public.hide_message_for_user(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_hidden_by jsonb;
  v_original_updated_at timestamp with time zone;
BEGIN
  -- Get current user's profile id
  v_user_id := get_profile_id_from_auth();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get current hidden_by_users array and original updated_at
  SELECT COALESCE(hidden_by_users, '[]'::jsonb), updated_at
  INTO v_hidden_by, v_original_updated_at
  FROM mensajes
  WHERE id = p_message_id;

  -- Check if user already hidden this message
  IF v_hidden_by ? v_user_id::text THEN
    RETURN; -- Already hidden, nothing to do
  END IF;

  -- Temporarily disable the update trigger
  ALTER TABLE mensajes DISABLE TRIGGER set_updated_at_mensajes;
  ALTER TABLE mensajes DISABLE TRIGGER update_mensajes_updated_at;

  -- Add user to hidden_by_users and preserve original updated_at
  UPDATE mensajes
  SET hidden_by_users = v_hidden_by || jsonb_build_array(v_user_id),
      updated_at = v_original_updated_at
  WHERE id = p_message_id;

  -- Re-enable the triggers
  ALTER TABLE mensajes ENABLE TRIGGER set_updated_at_mensajes;
  ALTER TABLE mensajes ENABLE TRIGGER update_mensajes_updated_at;
  
END;
$function$;