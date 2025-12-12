import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserDataReady } from '@/hooks/entidades';

/**
 * Hook ligero para obtener el conteo de notificaciones no leídas en tiempo real.
 * Diseñado para usarse en componentes como Sidebar y Header que siempre están montados.
 * Respeta la configuración de notificaciones del usuario.
 */
export function useNotificationCount() {
  const { profile, settings } = useUserDataReady();
  const profileId = profile?.id ?? null;
  const notificationsEnabled = settings?.enabled !== false;
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Función para obtener el conteo actual
  const fetchCount = useCallback(async () => {
    if (!profileId || !notificationsEnabled) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('read', false);

      if (error) throw error;
      setUnreadCount(count ?? 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profileId, notificationsEnabled]);

  // Fetch inicial y suscripción en tiempo real
  useEffect(() => {
    if (!profileId || !notificationsEnabled) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    // Fetch inicial
    fetchCount();

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Crear nuevo canal con ID único
    const channelId = `notification-count-${profileId}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          // Nueva notificación, incrementar si no está leída
          if (payload.new && payload.new.read === false) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          // Si cambió de no leída a leída, decrementar
          if (payload.old?.read === false && payload.new?.read === true) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
          // Si cambió de leída a no leída, incrementar
          if (payload.old?.read === true && payload.new?.read === false) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        () => {
          // En DELETE, refetch para obtener conteo correcto
          fetchCount();
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
  }, [profileId, fetchCount, notificationsEnabled]);

  return { unreadCount, isLoading, refetch: fetchCount, notificationsEnabled };
}
