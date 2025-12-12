import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOptimizedEntityListHook } from './useOptimizedEntityList';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type User = Database['public']['Tables']['profiles']['Row'];
export type UserInsert = Database['public']['Tables']['profiles']['Insert'];
export type UserUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * Hook base optimizado para la lista de usuarios (profiles)
 */
const useBaseOptimizedUsers = createOptimizedEntityListHook<User>({
  tableName: 'profiles',
  queryKey: 'users',
  selectColumns: '*',
  defaultFilters: {},
  orderBy: { column: 'created_at', ascending: false },
  enableRealtime: true,
});

/**
 * Hook optimizado para la lista de usuarios con eliminación especializada
 * Usa la función admin_soft_delete_profile para manejar toda la limpieza
 */
export function useOptimizedUsers(additionalFilters?: Record<string, unknown>) {
  const baseHook = useBaseOptimizedUsers(additionalFilters);
  const queryClient = useQueryClient();

  // Mutación especializada para eliminar usuarios usando la función de base de datos
  const removeMutation = useMutation({
    mutationFn: async (profileId: string): Promise<void> => {
      const { error } = await supabase.rpc('admin_soft_delete_profile', {
        p_profile_id: profileId,
      });

      if (error) {
        console.error('[useOptimizedUsers] Error deleting user:', error);
        throw error;
      }
    },
    onMutate: async (profileId) => {
      // Cancelar queries pendientes
      await queryClient.cancelQueries({ queryKey: ['users'] });
      
      // Guardar datos anteriores para rollback
      const previousData = queryClient.getQueryData<User[]>(['users', {}]);
      
      // Actualización optimista: remover de la lista
      queryClient.setQueryData<User[]>(['users', {}], (old = []) =>
        old.filter((user) => user.id !== profileId)
      );

      return { previousData };
    },
    onError: (_err, _profileId, context) => {
      // Rollback en caso de error
      if (context?.previousData) {
        queryClient.setQueryData(['users', {}], context.previousData);
      }
    },
    onSuccess: () => {
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Sobrescribir el método remove con la versión especializada
  const remove = useCallback(
    async (id: string) => removeMutation.mutateAsync(id),
    [removeMutation]
  );

  return {
    ...baseHook,
    remove, // Sobrescribir con la versión que usa admin_soft_delete_profile
  };
}
