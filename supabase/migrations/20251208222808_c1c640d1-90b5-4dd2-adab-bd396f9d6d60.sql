-- Fix hide_message_for_user to allow hiding own messages too
CREATE OR REPLACE FUNCTION public.hide_message_for_user(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_hidden_by jsonb;
BEGIN
  -- Get current user's profile id
  v_user_id := get_profile_id_from_auth();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get current hidden_by_users array
  SELECT COALESCE(hidden_by_users, '[]'::jsonb)
  INTO v_hidden_by
  FROM mensajes
  WHERE id = p_message_id;

  -- Add user to hidden_by_users array (allow hiding any message, including own)
  UPDATE mensajes
  SET hidden_by_users = v_hidden_by || jsonb_build_array(v_user_id)
  WHERE id = p_message_id
  AND NOT (v_hidden_by ? v_user_id::text); -- Only if not already hidden
  
END;
$function$;