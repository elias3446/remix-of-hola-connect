/**
 * Hook para suscribirse a cambios en tiempo real de las relaciones de amistad
 * Actualiza automáticamente el cache cuando hay cambios en la base de datos
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeRelationsOptions {
  currentUserId?: string | null;
  enabled?: boolean;
}

export function useRealtimeRelations(options: UseRealtimeRelationsOptions = {}) {
  const { currentUserId, enabled = true } = options;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !currentUserId) return;

    // Canal para escuchar cambios en la tabla relaciones
    const channel = supabase
      .channel(`relations-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relaciones',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('Realtime relation change (user_id):', payload.eventType);
          // Invalidar queries relevantes
          queryClient.invalidateQueries({ queryKey: ['user-relations', currentUserId] });
          queryClient.invalidateQueries({ queryKey: ['receivedFriendRequests', currentUserId] });
          queryClient.invalidateQueries({ queryKey: ['userFriends', currentUserId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relaciones',
          filter: `seguidor_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('Realtime relation change (seguidor_id):', payload.eventType);
          // Invalidar queries relevantes
          queryClient.invalidateQueries({ queryKey: ['user-relations', currentUserId] });
          queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests', currentUserId] });
          queryClient.invalidateQueries({ queryKey: ['userFriends', currentUserId] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to realtime relations for user:', currentUserId);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, enabled, queryClient]);
}
