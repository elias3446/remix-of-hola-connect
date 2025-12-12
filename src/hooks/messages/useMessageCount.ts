/**
 * Hook para contar mensajes no leídos
 * 
 * Funcionalidad:
 * - Cuenta total de mensajes no leídos
 * - Excluye mensajes de usuarios silenciados
 * - Actualización en tiempo real
 * - Usado en el sidebar para mostrar badge
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useRef } from 'react';
import { useMutedUsers } from './useMutedUsers';

interface UseMessageCountReturn {
  /** Total de mensajes no leídos */
  unreadCount: number;
  /** Estado de carga */
  isLoading: boolean;
  /** Refrescar conteo */
  refetch: () => void;
}

export function useMessageCount(): UseMessageCountReturn {
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const { mutedUserIds } = useMutedUsers();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Obtener profile_id actual
  useEffect(() => {
    const getProfileId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCurrentProfileId(profile.id);
      }
    };

    getProfileId();
  }, []);

  // Query para contar mensajes no leídos
  const { data: unreadCount = 0, isLoading, refetch } = useQuery({
    queryKey: ['unread-message-count', currentProfileId, mutedUserIds],
    queryFn: async (): Promise<number> => {
      if (!currentProfileId) return 0;

      // Obtener conversaciones del usuario
      const { data: participations } = await supabase
        .from('participantes_conversacion')
        .select('conversacion_id, muted')
        .eq('user_id', currentProfileId)
        .is('hidden_at', null);

      if (!participations || participations.length === 0) return 0;

      // Filtrar conversaciones silenciadas
      const activeConversationIds = participations
        .filter(p => !p.muted)
        .map(p => p.conversacion_id);

      if (activeConversationIds.length === 0) return 0;

      // Contar mensajes no leídos
      let totalUnread = 0;

      for (const convId of activeConversationIds) {
        // Obtener mensajes no leídos de esta conversación
        const { data: unreadMessages } = await supabase
          .from('mensajes')
          .select('id, user_id')
          .eq('conversacion_id', convId)
          .neq('user_id', currentProfileId)
          .is('deleted_at', null);

        if (!unreadMessages) continue;

        // Filtrar por usuarios no silenciados
        const messagesFromNonMuted = unreadMessages.filter(
          msg => !mutedUserIds.includes(msg.user_id || '')
        );

        // Verificar cuáles no han sido leídos
        for (const msg of messagesFromNonMuted) {
          const { data: receipt } = await supabase
            .from('message_receipts')
            .select('read_at')
            .eq('message_id', msg.id)
            .eq('user_id', currentProfileId)
            .single();

          if (!receipt?.read_at) {
            totalUnread++;
          }
        }
      }

      return totalUnread;
    },
    enabled: !!currentProfileId,
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  // Suscripción en tiempo real
  useEffect(() => {
    if (!currentProfileId) return;

    const channel = supabase
      .channel('message-count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_receipts',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentProfileId, refetch]);

  return {
    unreadCount,
    isLoading,
    refetch,
  };
}
