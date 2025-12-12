/**
 * Hook para gestionar conversaciones
 * 
 * Funcionalidad:
 * - Obtener lista de conversaciones del usuario
 * - Crear nuevas conversaciones (individuales y grupales)
 * - Ocultar/eliminar conversaciones
 * - Silenciar conversaciones
 * - Sincronización en tiempo real
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { 
  ConversacionExtendida, 
  ConversationFilter, 
  CreateGroupOptions 
} from './types';

interface UseConversationsOptions {
  filter?: ConversationFilter;
  enabled?: boolean;
}

interface UseConversationsReturn {
  /** Lista de conversaciones */
  conversations: ConversacionExtendida[];
  /** Estado de carga */
  isLoading: boolean;
  /** Error si existe */
  error: Error | null;
  /** Refrescar conversaciones */
  refetch: () => void;
  /** Crear conversación individual */
  createConversation: (participantId: string) => Promise<string | null>;
  /** Crear grupo */
  createGroup: (options: CreateGroupOptions) => Promise<string | null>;
  /** Ocultar conversación (no aparece en "todos" hasta nuevo mensaje) */
  hideConversation: (conversationId: string) => Promise<boolean>;
  /** Salir de un grupo */
  leaveGroup: (conversationId: string) => Promise<boolean>;
  /** Silenciar/desilenciar conversación */
  toggleMute: (conversationId: string, muted: boolean) => Promise<boolean>;
  /** Estado de mutación */
  isCreating: boolean;
}

export function useConversations(options: UseConversationsOptions = {}): UseConversationsReturn {
  const { filter = 'all', enabled = true } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

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

  // Suscripción en tiempo real a conversaciones y mensajes con debounce
  useEffect(() => {
    if (!enabled || !currentProfileId) return;

    let debounceTimer: NodeJS.Timeout | null = null;
    
    const debouncedRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // Usar refetchQueries para forzar refetch inmediato en lugar de solo invalidar
        queryClient.refetchQueries({ queryKey: ['conversations'] });
      }, 150); // 150ms debounce más rápido
    };

    const channel = supabase
      .channel(`conversations-realtime-${currentProfileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversaciones',
        },
        (payload) => {
          console.log('Realtime conversaciones:', payload);
          debouncedRefetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
        },
        (payload) => {
          console.log('Realtime nuevo mensaje:', payload);
          debouncedRefetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participantes_conversacion',
        },
        (payload) => {
          console.log('Realtime participantes:', payload);
          debouncedRefetch();
        }
      )
      .subscribe((status) => {
        console.log('Conversations realtime subscription:', status);
      });

    channelRef.current = channel;

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled, currentProfileId, queryClient]);

  // Query para obtener conversaciones usando RPC optimizada
  const { data: conversations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['conversations', filter],
    queryFn: async (): Promise<ConversacionExtendida[]> => {
      // Obtener el user_id de auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Llamar a la función RPC optimizada
      const { data, error: rpcError } = await supabase.rpc('get_user_conversations', {
        p_user_id: user.id,
        p_filter: filter === 'groups' ? 'groups' : filter === 'individual' ? 'individual' : 'all',
      });

      if (rpcError) {
        console.error('Error fetching conversations:', rpcError);
        throw rpcError;
      }

      if (!data) return [];

      // Transformar datos al formato esperado
      return data.map((conv: {
        id: string;
        nombre: string | null;
        es_grupo: boolean;
        created_at: string;
        updated_at: string;
        created_by: string | null;
        participantes: unknown;
        ultimo_mensaje: unknown;
        unread_count: number;
        is_muted: boolean;
        other_participant: unknown;
      }) => ({
        id: conv.id,
        nombre: conv.nombre,
        es_grupo: conv.es_grupo,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        created_by: conv.created_by,
        participantes: conv.participantes as ConversacionExtendida['participantes'],
        ultimo_mensaje: conv.ultimo_mensaje as ConversacionExtendida['ultimo_mensaje'],
        unread_count: conv.unread_count || 0,
        is_muted: conv.is_muted || false,
        other_participant: conv.other_participant as ConversacionExtendida['other_participant'],
      })) as ConversacionExtendida[];
    },
    enabled: enabled && !!currentProfileId,
    staleTime: 30000, // 30 segundos de cache
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  });

  // Mutación para crear conversación individual
  const createConversationMutation = useMutation({
    mutationFn: async (participantId: string): Promise<string | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      // Verificar si ya existe una conversación con este usuario
      const { data: existingConv } = await supabase
        .from('participantes_conversacion')
        .select('conversacion_id')
        .eq('user_id', profile.id);

      if (existingConv) {
        for (const pc of existingConv) {
          const { data: otherParticipant } = await supabase
            .from('participantes_conversacion')
            .select('conversacion_id')
            .eq('conversacion_id', pc.conversacion_id)
            .eq('user_id', participantId)
            .single();

          if (otherParticipant) {
            // Verificar que no sea un grupo
            const { data: conv } = await supabase
              .from('conversaciones')
              .select('es_grupo')
              .eq('id', pc.conversacion_id)
              .single();

            if (conv && !conv.es_grupo) {
              // Reactivar la conversación si estaba oculta
              await supabase
                .from('participantes_conversacion')
                .update({ hidden_from_todos: false, hidden_at: null })
                .eq('conversacion_id', pc.conversacion_id)
                .eq('user_id', profile.id);

              return pc.conversacion_id;
            }
          }
        }
      }

      // Crear nueva conversación
      const { data: newConv, error: convError } = await supabase
        .from('conversaciones')
        .insert({
          es_grupo: false,
          created_by: profile.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Agregar participantes
      const { error: partError } = await supabase
        .from('participantes_conversacion')
        .insert([
          { conversacion_id: newConv.id, user_id: profile.id, role: 'miembro' },
          { conversacion_id: newConv.id, user_id: participantId, role: 'miembro' },
        ]);

      if (partError) throw partError;

      return newConv.id;
    },
    onSuccess: (conversationId) => {
      // Refetch inmediato para mostrar la nueva conversación
      queryClient.refetchQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      console.error('Error creando conversación:', error);
      toast.error('Error al crear la conversación');
    },
  });

  // Mutación para crear grupo
  const createGroupMutation = useMutation({
    mutationFn: async (options: CreateGroupOptions): Promise<string | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      // Crear grupo
      const { data: newGroup, error: groupError } = await supabase
        .from('conversaciones')
        .insert({
          nombre: options.nombre,
          es_grupo: true,
          created_by: profile.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Agregar creador como administrador
      const participantesData = [
        { conversacion_id: newGroup.id, user_id: profile.id, role: 'administrador' as const },
        ...options.participantes.map(pid => ({
          conversacion_id: newGroup.id,
          user_id: pid,
          role: 'miembro' as const,
        })),
      ];

      const { error: partError } = await supabase
        .from('participantes_conversacion')
        .insert(participantesData);

      if (partError) throw partError;

      // Registrar en historial
      await supabase.from('group_history').insert({
        conversacion_id: newGroup.id,
        action_type: 'group_created',
        performed_by: profile.id,
        new_value: options.nombre,
      });

      return newGroup.id;
    },
    onSuccess: () => {
      // Refetch inmediato para mostrar el nuevo grupo
      queryClient.refetchQueries({ queryKey: ['conversations'] });
      toast.success('Grupo creado exitosamente');
    },
    onError: (error) => {
      console.error('Error creando grupo:', error);
      toast.error('Error al crear el grupo');
    },
  });

  // Función para ocultar conversación
  const hideConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    // Actualización optimista: remover inmediatamente de la lista
    queryClient.setQueriesData<ConversacionExtendida[]>(
      { queryKey: ['conversations'] },
      (old) => old?.filter(c => c.id !== conversationId) ?? []
    );

    try {
      const { error } = await supabase.rpc('hide_conversation_for_user', {
        _conversation_id: conversationId,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversación ocultada');
      return true;
    } catch (error) {
      console.error('Error ocultando conversación:', error);
      toast.error('Error al ocultar la conversación');
      // Revertir en caso de error
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      return false;
    }
  }, [queryClient]);

  // Función para salir de grupo
  const leaveGroup = useCallback(async (conversationId: string): Promise<boolean> => {
    // Actualización optimista: remover inmediatamente de la lista
    queryClient.setQueriesData<ConversacionExtendida[]>(
      { queryKey: ['conversations'] },
      (old) => old?.filter(c => c.id !== conversationId) ?? []
    );

    try {
      const { data, error } = await supabase.rpc('leave_group_for_user', {
        _conversation_id: conversationId,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Has salido del grupo');
      return data || false;
    } catch (error) {
      console.error('Error saliendo del grupo:', error);
      toast.error('Error al salir del grupo');
      // Revertir en caso de error
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      return false;
    }
  }, [queryClient]);

  // Función para silenciar/desilenciar
  const toggleMute = useCallback(async (conversationId: string, muted: boolean): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return false;

      const { error } = await supabase
        .from('participantes_conversacion')
        .update({ muted })
        .eq('conversacion_id', conversationId)
        .eq('user_id', profile.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(muted ? 'Conversación silenciada' : 'Notificaciones activadas');
      return true;
    } catch (error) {
      console.error('Error cambiando estado de silencio:', error);
      toast.error('Error al cambiar notificaciones');
      return false;
    }
  }, [queryClient]);

  return {
    conversations,
    isLoading,
    error: error as Error | null,
    refetch,
    createConversation: createConversationMutation.mutateAsync,
    createGroup: createGroupMutation.mutateAsync,
    hideConversation,
    leaveGroup,
    toggleMute,
    isCreating: createConversationMutation.isPending || createGroupMutation.isPending,
  };
}
