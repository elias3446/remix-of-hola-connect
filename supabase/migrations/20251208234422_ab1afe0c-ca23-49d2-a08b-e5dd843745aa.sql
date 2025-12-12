-- Actualizar función leave_group_for_user para transferir admin automáticamente
CREATE OR REPLACE FUNCTION leave_group_for_user(_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _profile_id uuid := get_profile_id_from_auth();
  _is_admin boolean;
  _admin_count int;
  _next_member uuid;
  _updated int;
begin
  if _profile_id is null then
    raise exception 'not authenticated';
  end if;

  -- Verificar si el usuario que sale es administrador
  select role = 'administrador' into _is_admin
  from participantes_conversacion
  where conversacion_id = _conversation_id
    and user_id = _profile_id
    and hidden_at is null;

  if _is_admin then
    -- Contar cuántos administradores hay (incluyendo al que sale)
    select count(*) into _admin_count
    from participantes_conversacion
    where conversacion_id = _conversation_id
      and role = 'administrador'
      and hidden_at is null;

    -- Si es el único admin, transferir a otro miembro
    if _admin_count = 1 then
      -- Buscar al siguiente miembro más antiguo que no sea el que sale
      select user_id into _next_member
      from participantes_conversacion
      where conversacion_id = _conversation_id
        and user_id != _profile_id
        and hidden_at is null
      order by created_at asc
      limit 1;

      -- Si hay otro miembro, hacerlo administrador
      if _next_member is not null then
        update participantes_conversacion
        set role = 'administrador'
        where conversacion_id = _conversation_id
          and user_id = _next_member;

        -- Registrar la transferencia de admin
        begin
          insert into group_history (conversacion_id, action_type, performed_by, affected_user_id)
          values (_conversation_id, 'admin_transferred', _profile_id, _next_member);
        exception when others then
          null;
        end;
      end if;
    end if;
  end if;

  -- Marcar como hidden (el usuario sale del grupo)
  update participantes_conversacion
  set hidden_at = now()
  where conversacion_id = _conversation_id
    and user_id = _profile_id
    and hidden_at is null;

  get diagnostics _updated = row_count;

  if _updated = 0 then
    return false; -- user was not an active participant
  end if;

  -- Registrar en historial
  begin
    insert into group_history (conversacion_id, action_type, performed_by, affected_user_id)
    values (_conversation_id, 'member_left', _profile_id, _profile_id);
  exception when others then
    null;
  end;

  return true;
end;
$$;