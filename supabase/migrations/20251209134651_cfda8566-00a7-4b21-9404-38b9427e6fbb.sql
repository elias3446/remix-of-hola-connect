-- Agregar campo publicacion_id a la tabla estados para referenciar publicaciones compartidas
ALTER TABLE public.estados 
ADD COLUMN publicacion_id UUID REFERENCES public.publicaciones(id) ON DELETE SET NULL;

-- Agregar índice para búsquedas por publicacion_id
CREATE INDEX IF NOT EXISTS idx_estados_publicacion_id ON public.estados(publicacion_id) WHERE publicacion_id IS NOT NULL;

-- Comentario para documentación
COMMENT ON COLUMN public.estados.publicacion_id IS 'Referencia a la publicación original cuando el estado proviene de una publicación compartida';