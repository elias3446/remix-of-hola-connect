import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserDataReady } from '@/hooks/entidades';
import { useEffect } from 'react';

/**
 * Hook ligero para obtener el conteo de notificaciones no leídas en tiempo real.
 * Usa React Query para sincronizar automáticamente con otras instancias.
 */
export function useNotificationCount() {
  const { profile, settings } = useUserDataReady();
  const profileId = profile?.id ?? null;
  const notificationsEnabled = settings?.enabled !== false;
  const queryClient = useQueryClient();

  // Query para el conteo
  const { data: unreadCount = 0, isLoading, refetch } = useQuery({
    queryKey: ['notification-count', profileId],
    queryFn: async () => {
      if (!profileId || !notificationsEnabled) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('read', false);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profileId && notificationsEnabled,
    staleTime: 0, // Always refetch for realtime sync
    refetchOnWindowFocus: true,
  });

  // Suscripción realtime para actualizar el conteo
  useEffect(() => {
    if (!profileId || !notificationsEnabled) return;

    const channelId = `notification-count-sync-${profileId}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        () => {
          // Invalidar todas las queries relacionadas con notificaciones
          queryClient.invalidateQueries({ queryKey: ['notification-count'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['notifications-stats'], refetchType: 'all' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, notificationsEnabled, queryClient]);

  return { unreadCount, isLoading, refetch, notificationsEnabled };
}
