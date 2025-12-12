-- Agregar columna estado_id a publicaciones para vincular cuando se comparte un estado
ALTER TABLE public.publicaciones 
ADD COLUMN estado_id UUID REFERENCES public.estados(id) ON DELETE SET NULL;

-- Crear índice para mejorar performance
CREATE INDEX idx_publicaciones_estado_id ON public.publicaciones(estado_id) WHERE estado_id IS NOT NULL;

-- Comentario descriptivo
COMMENT ON COLUMN public.publicaciones.estado_id IS 'ID del estado que se comparte en esta publicación (cuando se comparte un estado en el feed)';