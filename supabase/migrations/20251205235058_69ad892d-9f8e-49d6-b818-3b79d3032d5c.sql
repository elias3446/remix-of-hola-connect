-- Habilitar REPLICA IDENTITY FULL para la tabla reportes
ALTER TABLE public.reportes REPLICA IDENTITY FULL;

-- Asegurar que la tabla esté en la publicación de realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'reportes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reportes;
  END IF;
END $$;