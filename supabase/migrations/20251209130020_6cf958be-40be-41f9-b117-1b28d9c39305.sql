-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own estados" ON public.estados;

-- Create new UPDATE policy that allows users to update their own estados
-- The WITH CHECK only verifies ownership, not the activo status
CREATE POLICY "Users can update their own estados" 
ON public.estados 
FOR UPDATE 
USING (get_profile_id_from_auth() = user_id)
WITH CHECK (get_profile_id_from_auth() = user_id);

-- Also update the SELECT policy to allow users to see their own estados even if inactive (for management purposes)
DROP POLICY IF EXISTS "Estados visibility policy" ON public.estados;

CREATE POLICY "Estados visibility policy" 
ON public.estados 
FOR SELECT 
USING (
  -- Users can always see their own estados (for management)
  (user_id = get_profile_id_from_auth())
  OR
  -- Others can see active, non-expired estados based on visibility rules
  (
    (activo = true) 
    AND (expires_at > now()) 
    AND (
      (visibilidad = 'todos' AND auth.uid() IS NOT NULL)
      OR (visibilidad = 'contactos' AND EXISTS (
        SELECT 1 FROM relaciones 
        WHERE relaciones.user_id = estados.user_id 
        AND relaciones.seguidor_id = get_profile_id_from_auth() 
        AND relaciones.estado = 'aceptado'::estado_relacion
      ))
    )
  )
);