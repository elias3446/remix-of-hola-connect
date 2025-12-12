-- Habilitar REPLICA IDENTITY FULL para reporte_confirmaciones (para realtime)
ALTER TABLE reporte_confirmaciones REPLICA IDENTITY FULL;

-- Agregar a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE reporte_confirmaciones;