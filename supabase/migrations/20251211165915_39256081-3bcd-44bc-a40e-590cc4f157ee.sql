-- Habilitar REPLICA IDENTITY FULL (esto es seguro ejecutar aunque ya esté configurado)
ALTER TABLE public.comentarios REPLICA IDENTITY FULL;
ALTER TABLE public.publicacion_vistas REPLICA IDENTITY FULL;
ALTER TABLE public.publicacion_compartidos REPLICA IDENTITY FULL;
ALTER TABLE public.publicaciones REPLICA IDENTITY FULL;

-- Agregar solo las tablas que faltan (usar DO block para manejar errores)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comentarios;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.publicacion_vistas;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.publicacion_compartidos;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.publicaciones;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;