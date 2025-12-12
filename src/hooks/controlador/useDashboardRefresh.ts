import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook para refrescar todos los datos del dashboard de manera centralizada
 * Invalida todas las queries relacionadas con reportes, usuarios, categorías, tipos y roles
 */
export function useDashboardRefresh() {
  const queryClient = useQueryClient();

  const refreshAll = useCallback(() => {
    // Invalidar todas las queries relacionadas con el dashboard
    queryClient.invalidateQueries({ queryKey: ['reportes'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['tipo-reportes'] });
    queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    queryClient.invalidateQueries({ queryKey: ['user-roles-list'] });
    queryClient.invalidateQueries({ queryKey: ['publicaciones'] });
    queryClient.invalidateQueries({ queryKey: ['conversaciones'] });
  }, [queryClient]);

  return { refreshAll };
}
