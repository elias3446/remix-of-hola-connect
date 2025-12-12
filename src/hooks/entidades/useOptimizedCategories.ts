import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createOptimizedEntityListHook } from './useOptimizedEntityList';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Category = Database['public']['Tables']['categories']['Row'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

const useBaseCategoriesHook = createOptimizedEntityListHook<Category>({
  tableName: 'categories',
  queryKey: 'categories',
  selectColumns: '*',
  defaultFilters: {},
  orderBy: { column: 'created_at', ascending: false },
  enableRealtime: true,
  hasSoftDelete: true,
});

/**
 * Hook optimizado para la lista de categorías
 * Implementa: carga con caché, actualizaciones optimistas, sincronización real-time
 * Usa RPC toggle_category_status para cascada bidireccional con tipos de reporte
 */
export const useOptimizedCategories = (additionalFilters?: Record<string, unknown>) => {
  const queryClient = useQueryClient();
  const baseHook = useBaseCategoriesHook(additionalFilters);

  // Wrapper para remove que también invalida tipo_reportes
  const remove = useCallback(async (id: string) => {
    await baseHook.remove(id);
    await queryClient.invalidateQueries({ queryKey: ['tipoReportes'] });
  }, [baseHook, queryClient]);

  // Toggle status usando RPC para cascada automática a hijos
  const toggleStatus = useCallback(async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Llamar a la función RPC que maneja la cascada
    const { data, error } = await supabase.rpc('toggle_category_status', {
      p_category_id: id,
      p_new_status: newStatus,
    });

    if (error) {
      console.error('[useOptimizedCategories] Error en toggle_category_status:', error);
      throw error;
    }

    console.log('[useOptimizedCategories] Cascada completada:', data);

    // Invalidar ambas queries para reflejar los cambios
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['tipoReportes'] }),
    ]);

    return data;
  }, [queryClient]);

  return {
    ...baseHook,
    remove,
    toggleStatus,
  };
};
