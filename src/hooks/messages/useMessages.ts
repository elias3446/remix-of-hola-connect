/**
 * Hook para gestionar mensajes de una conversación
 * 
 * Funcionalidad:
 * - Obtener mensajes de una conversación
 * - Enviar mensajes (texto e imágenes)
 * - Editar mensajes
 * - Eliminar mensajes (para mí / para todos)
 * - Reaccionar a mensajes
 * - Marcar como leído/entregado
 * - Sincronización en tiempo real
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { 
  MensajeExtendido, 
  SendMessageOptions, 
  EditMessageOptions,
  MessageStatus 
} from './types';
import type { Json } from '@/integrations/supabase/types';

interface UseMessagesOptions {
  conversationId: string | null;
  enabled?: boolean;
}

interface UseMessagesReturn {
  /** Lista de mensajes */
  messages: MensajeExtendido[];
  /** Estado de carga */
  isLoading: boolean;
  /** Error si existe */
  error: Error | null;
  /** Enviar mensaje */
  sendMessage: (options: Omit<SendMessageOptions, 'conversacion_id'>) => Promise<boolean>;
  /** Editar mensaje */
  editMessage: (options: EditMessageOptions) => Promise<boolean>;
  /** Eliminar mensaje para mí */
  deleteForMe: (messageId: string) => Promise<boolean>;
  /** Eliminar mensaje para todos */
  deleteForEveryone: (messageId: string) => Promise<boolean>;
  /** Agregar reacción */
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  /** Quitar reacción */
  removeReaction: (messageId: string) => Promise<boolean>;
  /** Marcar mensajes como leídos */
  markAsRead: () => Promise<void>;
  /** Limpiar todos los mensajes (ocultar para el usuario) */
  clearMessages: () => Promise<boolean>;
  /** Estado de envío */
  isSending: boolean;
  /** Refrescar mensajes */
  refetch: () => void;
}

export function useMessages(options: UseMessagesOptions): UseMessagesReturn {
  const { conversationId, enabled = true } = options;
  const queryClient = useQueryClient();
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
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

  // Query para obtener mensajes
  const { data: messages = [], isLoading, error, refetch } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<MensajeExtendido[]> => {
      if (!conversationId || !currentProfileId) return [];

      // Obtener mensajes
      const { data: messagesData, error: msgError } = await supabase
        .from('mensajes')
        .select(`
          *,
          sender:profiles!mensajes_user_id_fkey(id, name, avatar, username),
          reactions:mensaje_reacciones(*)
        `)
        .eq('conversacion_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;
      if (!messagesData) return [];

      // Filtrar mensajes ocultos para el usuario
      const visibleMessages = messagesData.filter(msg => {
        const hiddenBy = msg.hidden_by_users as string[] | null;
        return !hiddenBy?.includes(currentProfileId);
      });

      // Obtener estado de cada mensaje enviado por el usuario
      const messagesWithStatus = await Promise.all(
        visibleMessages.map(async (msg) => {
          let status: MessageStatus = 'sent';
          
          if (msg.user_id === currentProfileId) {
            // Obtener estado del mensaje usando la función RPC
            const { data: msgStatus } = await supabase.rpc('get_message_status', {
              p_message_id: msg.id,
            });
            status = (msgStatus as MessageStatus) || 'sent';
          }

          return {
            ...msg,
            sender: msg.sender,
            reactions: msg.reactions,
            status,
            isEdited: msg.updated_at !== msg.created_at && !msg.deleted_at,
            isDeleted: !!msg.deleted_at,
          } as MensajeExtendido;
        })
      );

      return messagesWithStatus;
    },
    enabled: enabled && !!conversationId && !!currentProfileId,
  });

  // Suscripción en tiempo real a nuevos mensajes y receipts
  useEffect(() => {
    if (!conversationId || !enabled) return;

    // Crear canal para mensajes en tiempo real
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `conversacion_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Realtime INSERT:', payload);
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mensajes',
          filter: `conversacion_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Realtime UPDATE:', payload);
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'mensajes',
          filter: `conversacion_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Realtime DELETE:', payload);
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensaje_reacciones',
        },
        () => {
          // Refrescar cuando hay cambios en reacciones
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_receipts',
        },
        (payload) => {
          // Refrescar cuando hay cambios en receipts (estados de mensaje)
          console.log('Realtime RECEIPT change:', payload);
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, enabled, queryClient]);

  // Mutación para enviar mensaje
  const sendMessageMutation = useMutation({
    mutationFn: async (messageOptions: Omit<SendMessageOptions, 'conversacion_id'>): Promise<boolean> => {
      if (!conversationId || !currentProfileId) return false;

      const { error } = await supabase.from('mensajes').insert([{
        conversacion_id: conversationId,
        user_id: currentProfileId,
        contenido: messageOptions.contenido,
        imagenes: messageOptions.imagenes || null,
        shared_post: (messageOptions.shared_post as Json) || null,
      }]);

      if (error) throw error;

      // Actualizar timestamp de la conversación
      await supabase
        .from('conversaciones')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // NO marcar como entregado aquí - eso lo hace el receptor cuando está en línea

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      console.error('Error enviando mensaje:', error);
      toast.error('Error al enviar el mensaje');
    },
  });

  // Mutación para editar mensaje
  const editMessageMutation = useMutation({
    mutationFn: async (editOptions: EditMessageOptions): Promise<boolean> => {
      if (!currentProfileId) return false;

      const { error } = await supabase
        .from('mensajes')
        .update({
          contenido: editOptions.contenido,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editOptions.mensaje_id)
        .eq('user_id', currentProfileId); // Solo el autor puede editar

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      toast.success('Mensaje editado');
    },
    onError: (error) => {
      console.error('Error editando mensaje:', error);
      toast.error('Error al editar el mensaje');
    },
  });

  // Función para eliminar mensaje para mí
  const deleteForMe = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('hide_message_for_user', {
        p_message_id: messageId,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      toast.success('Mensaje eliminado');
      return true;
    } catch (error) {
      console.error('Error eliminando mensaje:', error);
      toast.error('Error al eliminar el mensaje');
      return false;
    }
  }, [conversationId, queryClient]);

  // Función para eliminar mensaje para todos
  const deleteForEveryone = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('delete_message_for_everyone', {
        p_message_id: messageId,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      toast.success('Mensaje eliminado para todos');
      return true;
    } catch (error) {
      console.error('Error eliminando mensaje:', error);
      toast.error('Error al eliminar el mensaje');
      return false;
    }
  }, [conversationId, queryClient]);

  // Función para agregar reacción
  const addReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    try {
      if (!currentProfileId) return false;

      // Primero eliminar reacción existente del usuario
      await supabase
        .from('mensaje_reacciones')
        .delete()
        .eq('mensaje_id', messageId)
        .eq('user_id', currentProfileId);

      // Agregar nueva reacción
      const { error } = await supabase.from('mensaje_reacciones').insert({
        mensaje_id: messageId,
        user_id: currentProfileId,
        emoji,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      return true;
    } catch (error) {
      console.error('Error agregando reacción:', error);
      return false;
    }
  }, [conversationId, currentProfileId, queryClient]);

  // Función para quitar reacción
  const removeReaction = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      if (!currentProfileId) return false;

      const { error } = await supabase
        .from('mensaje_reacciones')
        .delete()
        .eq('mensaje_id', messageId)
        .eq('user_id', currentProfileId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      return true;
    } catch (error) {
      console.error('Error quitando reacción:', error);
      return false;
    }
  }, [conversationId, currentProfileId, queryClient]);

  // Función para marcar mensajes como leídos
  const markAsRead = useCallback(async (): Promise<void> => {
    if (!conversationId || !currentProfileId) return;

    try {
      // Reactivar la conversación si estaba oculta (hidden_from_todos)
      await supabase
        .from('participantes_conversacion')
        .update({ hidden_from_todos: false })
        .eq('conversacion_id', conversationId)
        .eq('user_id', currentProfileId);

      await supabase.rpc('mark_messages_read', {
        p_conversation_id: conversationId,
      });

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (error) {
      console.error('Error marcando como leído:', error);
    }
  }, [conversationId, currentProfileId, queryClient]);

  // Función para limpiar mensajes
  const clearMessages = useCallback(async (): Promise<boolean> => {
    if (!conversationId) return false;

    try {
      const { error } = await supabase.rpc('clear_messages_for_user', {
        _conversation_id: conversationId,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      toast.success('Mensajes limpiados');
      return true;
    } catch (error) {
      console.error('Error limpiando mensajes:', error);
      toast.error('Error al limpiar los mensajes');
      return false;
    }
  }, [conversationId, queryClient]);

  return {
    messages,
    isLoading,
    error: error as Error | null,
    sendMessage: sendMessageMutation.mutateAsync,
    editMessage: editMessageMutation.mutateAsync,
    deleteForMe,
    deleteForEveryone,
    addReaction,
    removeReaction,
    markAsRead,
    clearMessages,
    isSending: sendMessageMutation.isPending,
    refetch,
  };
}
