import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface SimilarReport {
  id: string;
  nombre: string;
  descripcion: string;
  status: string;
  priority: string;
  distancia_metros: number;
  confirmaciones_count: number;
  created_at: string;
  user_name: string;
  user_avatar: string;
  location: Json;
  imagenes: string[] | null;
}

export interface UseSimilarReportsOptions {
  radioMetros?: number;
  horasAtras?: number;
}

export interface UseSimilarReportsResult {
  similarReports: SimilarReport[];
  isLoading: boolean;
  error: string | null;
  fetchSimilarReports: (
    lat: number,
    lng: number,
    categoriaId?: string,
    tipoReporteId?: string
  ) => Promise<SimilarReport[]>;
  confirmReport: (reporteId: string, userId: string) => Promise<boolean>;
  clearReports: () => void;
}

/**
 * Hook para obtener reportes similares cercanos usando la función de Supabase
 */
export function useSimilarReports(
  options: UseSimilarReportsOptions = {}
): UseSimilarReportsResult {
  const { radioMetros = 100, horasAtras = 24 } = options;
  
  const [similarReports, setSimilarReports] = useState<SimilarReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSimilarReports = useCallback(
    async (
      lat: number,
      lng: number,
      categoriaId?: string,
      tipoReporteId?: string
    ): Promise<SimilarReport[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'get_reportes_similares_cercanos',
          {
            p_lat: lat,
            p_lng: lng,
            p_radio_metros: radioMetros,
            p_horas_atras: horasAtras,
            p_categoria_id: categoriaId || undefined,
            p_tipo_reporte_id: tipoReporteId || undefined,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        const reports: SimilarReport[] = (data || []).map((r: SimilarReport) => ({
          id: r.id,
          nombre: r.nombre,
          descripcion: r.descripcion,
          status: r.status,
          priority: r.priority,
          distancia_metros: r.distancia_metros,
          confirmaciones_count: r.confirmaciones_count,
          created_at: r.created_at,
          user_name: r.user_name,
          user_avatar: r.user_avatar,
          location: r.location,
          imagenes: r.imagenes,
        }));

        setSimilarReports(reports);
        return reports;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al buscar reportes similares';
        setError(message);
        console.error('Error fetching similar reports:', err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [radioMetros, horasAtras]
  );

  const confirmReport = useCallback(
    async (reporteId: string, userId: string): Promise<boolean> => {
      try {
        const { error: insertError } = await supabase
          .from('reporte_confirmaciones')
          .insert({
            reporte_id: reporteId,
            user_id: userId,
          });

        if (insertError) {
          // Si ya existe la confirmación, no es un error
          if (insertError.code === '23505') {
            return true;
          }
          throw new Error(insertError.message);
        }

        return true;
      } catch (err) {
        console.error('Error confirming report:', err);
        return false;
      }
    },
    []
  );

  const clearReports = useCallback(() => {
    setSimilarReports([]);
    setError(null);
  }, []);

  return {
    similarReports,
    isLoading,
    error,
    fetchSimilarReports,
    confirmReport,
    clearReports,
  };
}
