import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createOptimizedEntityListHook } from './useOptimizedEntityList';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export type TipoReporte = Database['public']['Tables']['tipo_categories']['Row'];
export type TipoReporteInsert = Database['public']['Tables']['tipo_categories']['Insert'];
export type TipoReporteUpdate = Database['public']['Tables']['tipo_categories']['Update'];

const useBaseTipoReportesHook = createOptimizedEntityListHook<TipoReporte>({
  tableName: 'tipo_categories',
  queryKey: 'tipoReportes',
  selectColumns: '*',
  defaultFilters: {},
  orderBy: { column: 'created_at', ascending: false },
  enableRealtime: true,
  hasSoftDelete: true,
});

/**
 * Hook optimizado para la lista de tipos de reportes
 * Implementa: carga con caché, actualizaciones optimistas, sincronización real-time
 * Usa RPC toggle_tipo_reporte_status para cascada bidireccional con categorías
 */
export const useOptimizedTipoReportes = (additionalFilters?: Record<string, unknown>) => {
  const queryClient = useQueryClient();
  const baseHook = useBaseTipoReportesHook(additionalFilters);
  const categoryChannelRef = useRef<RealtimeChannel | null>(null);

  // Toggle status usando RPC para cascada automática (padre + hermanos)
  const toggleStatus = useCallback(async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Llamar a la función RPC que maneja la cascada
    const { data, error } = await supabase.rpc('toggle_tipo_reporte_status', {
      p_tipo_reporte_id: id,
      p_new_status: newStatus,
    });

    if (error) {
      console.error('[useOptimizedTipoReportes] Error en toggle_tipo_reporte_status:', error);
      throw error;
    }

    console.log('[useOptimizedTipoReportes] Cascada completada:', data);

    // Invalidar ambas queries para reflejar los cambios
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tipoReportes'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
    ]);

    return data;
  }, [queryClient]);

  // Escuchar cambios en la tabla categories para invalidar tipo_reportes
  useEffect(() => {
    if (categoryChannelRef.current) {
      supabase.removeChannel(categoryChannelRef.current);
    }

    const channel = supabase
      .channel('categories-for-tipo-reportes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'categories',
        },
        (payload) => {
          const wasDeleted = payload.new.deleted_at !== null;
          const statusChanged = payload.old.activo !== payload.new.activo;
          
          if (wasDeleted || statusChanged) {
            queryClient.invalidateQueries({ queryKey: ['tipoReportes'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'categories',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tipoReportes'] });
        }
      )
      .subscribe();

    categoryChannelRef.current = channel;

    return () => {
      if (categoryChannelRef.current) {
        supabase.removeChannel(categoryChannelRef.current);
        categoryChannelRef.current = null;
      }
    };
  }, [queryClient]);

  return {
    ...baseHook,
    toggleStatus,
  };
};
