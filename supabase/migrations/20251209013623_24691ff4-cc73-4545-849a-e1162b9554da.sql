-- Eliminar política actual restrictiva
DROP POLICY IF EXISTS "Estados visibility policy" ON public.estados;

-- Crear política corregida
-- Si visibilidad = 'todos', cualquier usuario autenticado puede ver
-- Si visibilidad = 'contactos', solo contactos con relación aceptada
-- El propietario siempre puede ver sus propios estados
CREATE POLICY "Estados visibility policy" 
ON public.estados 
FOR SELECT 
USING (
  activo = true 
  AND expires_at > now() 
  AND (
    -- El propietario siempre puede ver sus estados
    user_id = get_profile_id_from_auth()
    OR 
    -- Visibilidad pública: cualquier usuario autenticado puede ver
    (visibilidad = 'todos' AND auth.uid() IS NOT NULL)
    OR 
    -- Visibilidad contactos: solo si hay relación aceptada
    (visibilidad = 'contactos' AND EXISTS (
      SELECT 1 FROM relaciones
      WHERE relaciones.user_id = estados.user_id 
        AND relaciones.seguidor_id = get_profile_id_from_auth() 
        AND relaciones.estado = 'aceptado'
    ))
  )
);