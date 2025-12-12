import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserDataReady } from '@/hooks/entidades';

type NotificationEventType = 'insert' | 'update' | 'delete' | 'bulk-delete' | 'bulk-update';

interface NotificationEvent {
  type: NotificationEventType;
  ids?: string[];
  count?: number;
}

// Global event emitter for notification sync
const notificationEventListeners = new Set<(event: NotificationEvent) => void>();

export const emitNotificationEvent = (event: NotificationEvent) => {
  notificationEventListeners.forEach(listener => listener(event));
};

/**
 * Hook central para sincronizar notificaciones entre componentes.
 * Maneja suscripción realtime y emite eventos para mantener todo sincronizado.
 */
export function useNotificationSync() {
  const { profile, settings } = useUserDataReady();
  const profileId = profile?.id ?? null;
  const notificationsEnabled = settings?.enabled !== false;
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Invalidar todas las queries de notificaciones
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['notifications-stats'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['notification-count'], refetchType: 'all' });
  }, [queryClient]);

  // Suscribirse a eventos de sincronización
  useEffect(() => {
    const handleEvent = (event: NotificationEvent) => {
      // Invalidar queries cuando hay eventos
      invalidateAll();
    };

    notificationEventListeners.add(handleEvent);
    return () => {
      notificationEventListeners.delete(handleEvent);
    };
  }, [invalidateAll]);

  // Suscripción realtime única
  useEffect(() => {
    if (!profileId || !notificationsEnabled) return;

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelId = `notifications-sync-${profileId}`;
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
        (payload) => {
          // Emitir evento para sincronizar todos los componentes
          if (payload.eventType === 'INSERT') {
            emitNotificationEvent({ type: 'insert' });
          } else if (payload.eventType === 'UPDATE') {
            emitNotificationEvent({ type: 'update', ids: [payload.new?.id] });
          } else if (payload.eventType === 'DELETE') {
            emitNotificationEvent({ type: 'delete', ids: [payload.old?.id] });
          }
          
          // Invalidar todas las queries
          invalidateAll();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profileId, notificationsEnabled, invalidateAll]);

  return {
    invalidateAll,
    emitEvent: emitNotificationEvent,
  };
}
