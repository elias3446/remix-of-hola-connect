/**
 * Hook para obtener estadísticas del usuario
 * Posts, Seguidores, Siguiendo
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

interface UseUserStatsOptions {
  userId?: string | null;
  enabled?: boolean;
}

export function useUserStats(options: UseUserStatsOptions = {}) {
  const { userId, enabled = true } = options;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async (): Promise<UserStats> => {
      if (!userId) {
        return { postsCount: 0, followersCount: 0, followingCount: 0 };
      }

      // Obtener conteos en paralelo
      const [postsRes, followersRes, followingRes] = await Promise.all([
        // Contar publicaciones del usuario
        supabase
          .from('publicaciones')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('activo', true)
          .is('deleted_at', null),
        // Contar seguidores (personas que siguen al usuario)
        supabase
          .from('relaciones')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('tipo', 'seguidor')
          .eq('estado', 'aceptado'),
        // Contar siguiendo (personas que el usuario sigue)
        supabase
          .from('relaciones')
          .select('id', { count: 'exact', head: true })
          .eq('seguidor_id', userId)
          .eq('tipo', 'seguidor')
          .eq('estado', 'aceptado'),
      ]);

      return {
        postsCount: postsRes.count || 0,
        followersCount: followersRes.count || 0,
        followingCount: followingRes.count || 0,
      };
    },
    enabled: enabled && !!userId,
    staleTime: 60000, // 1 minuto
  });

  return {
    stats: data || { postsCount: 0, followersCount: 0, followingCount: 0 },
    isLoading,
    refetch,
  };
}
