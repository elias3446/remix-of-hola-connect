-- Actualizar la función para incluir el campo imagenes
CREATE OR REPLACE FUNCTION public.get_reportes_similares_cercanos(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radio_metros INTEGER DEFAULT 100,
  p_horas_atras INTEGER DEFAULT 24,
  p_categoria_id UUID DEFAULT NULL,
  p_tipo_reporte_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  descripcion TEXT,
  status TEXT,
  priority TEXT,
  location JSONB,
  created_at TIMESTAMPTZ,
  distancia_metros DOUBLE PRECISION,
  confirmaciones_count BIGINT,
  user_name TEXT,
  user_avatar TEXT,
  imagenes TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.nombre,
    r.descripcion,
    r.status::TEXT,
    r.priority::TEXT,
    r.location::JSONB,
    r.created_at,
    ST_Distance(
      r.geolocation::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) as distancia_metros,
    (SELECT COUNT(*) FROM public.reporte_confirmaciones rc WHERE rc.reporte_id = r.id) as confirmaciones_count,
    p.name as user_name,
    p.avatar as user_avatar,
    r.imagenes
  FROM public.reportes r
  LEFT JOIN public.profiles p ON r.user_id = p.id
  WHERE 
    r.deleted_at IS NULL
    AND r.status IN ('pendiente', 'en_progreso')
    AND r.visibility = 'publico'
    AND ST_DWithin(
      r.geolocation::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radio_metros
    )
    AND (p_tipo_reporte_id IS NULL OR r.tipo_reporte_id = p_tipo_reporte_id)
    AND (p_categoria_id IS NULL OR r.categoria_id = p_categoria_id)
  ORDER BY distancia_metros ASC
  LIMIT 10;
END;
$$;