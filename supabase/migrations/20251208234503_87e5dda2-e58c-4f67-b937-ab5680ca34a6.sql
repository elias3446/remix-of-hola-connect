-- Asignar administrador al miembro restante del grupo sin admin
UPDATE participantes_conversacion
SET role = 'administrador'
WHERE conversacion_id = '05348a8f-9e65-46f4-8a53-3601989c8a21'
AND user_id = '5f63f5d8-148e-466c-b78e-f74bd338d97e'
AND hidden_at IS NULL;