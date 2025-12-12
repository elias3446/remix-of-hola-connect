import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReporteHistorialItem {
  id: string;
  reporte_id: string;
  assigned_to: string | null;
  assigned_from: string | null;
  assigned_by: string | null;
  comentario: string | null;
  fecha_asignacion: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  assigned_to_profile?: { id: string; name: string | null } | null;
  assigned_from_profile?: { id: string; name: string | null } | null;
  assigned_by_profile?: { id: string; name: string | null } | null;
}

export function useReporteHistorial(reporteId: string) {
  return useQuery({
    queryKey: ['reporte-historial', reporteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reporte_historial')
        .select(`
          id,
          reporte_id,
          assigned_to,
          assigned_from,
          assigned_by,
          comentario,
          fecha_asignacion,
          created_at,
          updated_at,
          assigned_to_profile:profiles!reporte_historial_assigned_to_fkey(id, name),
          assigned_from_profile:profiles!reporte_historial_assigned_from_fkey(id, name),
          assigned_by_profile:profiles!reporte_historial_assigned_by_fkey(id, name)
        `)
        .eq('reporte_id', reporteId)
        .order('fecha_asignacion', { ascending: false });

      if (error) throw error;
      return (data || []) as ReporteHistorialItem[];
    },
    enabled: !!reporteId,
  });
}
