import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalLocation } from '@/contexts/LocationContext';
import type { Database } from '@/integrations/supabase/types';

export type Reporte = Database['public']['Tables']['reportes']['Row'];
export type ReporteInsert = Database['public']['Tables']['reportes']['Insert'];
export type ReporteUpdate = Database['public']['Tables']['reportes']['Update'];

// Tipo extendido con datos de la función
export interface ReporteWithDistance extends Reporte {
  distancia_metros: number | null;
  confirmaciones_count: number;
  categories: {
    id: string;
    nombre: string;
    descripcion: string | null;
    color: string | null;
    icono: string | null;
  } | null;
  tipo_categories: {
    id: string;
    nombre: string;
    descripcion: string | null;
    color: string | null;
    icono: string | null;
  } | null;
  profiles: {
    id: string;
    name: string | null;
    avatar: string | null;
  } | null;
  assigned_profiles: {
    id: string;
    name: string | null;
    avatar: string | null;
  } | null;
  [key: string]: unknown; // Index signature para compatibilidad con DataTable
}

/**
 * Hook optimizado para la lista de reportes con distancia calculada desde el servidor
 */
export function useOptimizedReportes() {
  const queryClient = useQueryClient();
  const { location } = useGlobalLocation();

  // Memorizar coordenadas para evitar re-renders innecesarios
  const coords = useMemo(() => ({
    lat: location?.latitude ?? 0,
    lng: location?.longitude ?? 0,
  }), [location?.latitude, location?.longitude]);

  const hasLocation = !!location;

  const { data = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['reportes-with-distance', coords.lat, coords.lng],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_reportes_with_distance', {
        user_lat: coords.lat,
        user_lng: coords.lng,
      });

      if (error) throw error;
      return (data as ReporteWithDistance[]) || [];
    },
    staleTime: 1000 * 30, // 30 segundos
    enabled: true, // Siempre habilitado, usa 0,0 si no hay ubicación
    placeholderData: (previousData) => previousData, // Mantener datos previos durante refetch
  });

  // Suscripción realtime para reportes
  useEffect(() => {
    const channel = supabase
      .channel('reportes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reportes',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reportes-with-distance'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reporte_confirmaciones',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reportes-with-distance'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Mutación para crear
  const createMutation = useMutation({
    mutationFn: async (newReporte: ReporteInsert) => {
      const { data, error } = await supabase
        .from('reportes')
        .insert(newReporte)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes-with-distance'] });
    },
  });

  // Mutación para actualizar
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ReporteUpdate }) => {
      const { data, error } = await supabase
        .from('reportes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes-with-distance'] });
    },
  });

  // Mutación para eliminar (soft delete)
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reportes')
        .update({ 
          deleted_at: new Date().toISOString(), 
          activo: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes-with-distance'] });
    },
  });

  // Toggle status
  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await updateMutation.mutateAsync({
      id,
      updates: { activo: !currentStatus },
    });
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    toggleStatus,
    hasLocation,
  };
}
