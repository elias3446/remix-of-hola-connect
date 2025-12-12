-- Eliminar la función duplicada con orden diferente de parámetros
DROP FUNCTION IF EXISTS public.get_reportes_similares_cercanos(
  p_lat double precision, 
  p_lng double precision, 
  p_tipo_reporte_id uuid, 
  p_categoria_id uuid, 
  p_radio_metros integer, 
  p_horas_atras integer
);