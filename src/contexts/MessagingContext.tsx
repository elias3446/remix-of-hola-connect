/**
 * Context global para gestionar el sistema de mensajería
 * 
 * Funcionalidad:
 * - Carga conversaciones y estados en segundo plano al iniciar sesión
 * - Gestiona los estados de mensajes (sent, delivered, read)
 * - Sincroniza receipts en tiempo real
 * - Marca mensajes como entregados cuando el usuario está en línea
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserPresence } from './UserPresenceContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface MessagingContextType {
  /** ID del perfil actual */
  currentProfileId: string | null;
  /** Si los datos iniciales ya se cargaron */
  isInitialized: boolean;
  /** Marcar mensajes como entregados (cuando el usuario está en línea) */
  markAsDelivered: (conversationId: string) => Promise<void>;
  /** Marcar mensajes como leídos (cuando abre la conversación) */
  markAsRead: (conversationId: string) => Promise<void>;
  /** ID de la conversación actualmente abierta */
  activeConversationId: string | null;
  /** Establecer la conversación activa */
  setActiveConversation: (conversationId: string | null) => void;
}

const MessagingContext = createContext<MessagingContextType | null>(null);

interface MessagingProviderProps {
  children: ReactNode;
}

export function MessagingProvider({ children }: MessagingProviderProps) {
  const queryClient = useQueryClient();
  const { isConnected: isPresenceConnected } = useUserPresence();
  
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const receiptsChannelRef = useRef<RealtimeChannel | null>(null);
  const conversationIdsRef = useRef<Set<string>>(new Set());

  // Inicializar el contexto cuando hay sesión
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !isMounted) return;

      // Obtener profile_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile || !isMounted) return;

      setCurrentProfileId(profile.id);

      // Cargar conversaciones en segundo plano
      await loadConversationsBackground(session.user.id, profile.id);

      if (isMounted) {
        setIsInitialized(true);
      }
    };

    const cleanup = () => {
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
      if (receiptsChannelRef.current) {
        supabase.removeChannel(receiptsChannelRef.current);
        receiptsChannelRef.current = null;
      }
      setCurrentProfileId(null);
      setIsInitialized(false);
      setActiveConversationId(null);
      conversationIdsRef.current.clear();
    };

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(() => initialize(), 100);
      } else if (event === 'SIGNED_OUT') {
        cleanup();
      }
    });

    // Verificar sesión existente
    initialize();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      cleanup();
    };
  }, []);

  // Cargar conversaciones en segundo plano
  const loadConversationsBackground = async (authUserId: string, profileId: string) => {
    try {
      // Cargar conversaciones
      const { data: conversations } = await supabase.rpc('get_user_conversations', {
        p_user_id: authUserId,
        p_filter: 'all',
      });

      if (conversations) {
        // Guardar IDs de conversaciones para suscripciones
        conversationIdsRef.current = new Set(conversations.map((c: { id: string }) => c.id));
        
        // Pre-popular el cache de React Query
        queryClient.setQueryData(['conversations', 'all'], conversations);
        
        // Configurar suscripciones realtime
        setupRealtimeSubscriptions(profileId);
      }

      // Cargar estados también
      const { data: estados } = await supabase
        .from('estados')
        .select('*')
        .eq('activo', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (estados) {
        queryClient.setQueryData(['estados'], estados);
      }

      console.log('[MessagingContext] Background data loaded');
    } catch (error) {
      console.error('[MessagingContext] Error loading background data:', error);
    }
  };

  // Configurar suscripciones realtime
  const setupRealtimeSubscriptions = (profileId: string) => {
    // Canal para nuevos mensajes (marcar como entregado automáticamente)
    const messagesChannel = supabase
      .channel(`messaging_messages_${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
        },
        async (payload) => {
          const newMessage = payload.new as { 
            id: string; 
            conversacion_id: string; 
            user_id: string;
          };
          
          // Si el mensaje no es del usuario actual, marcar como entregado
          if (newMessage.user_id !== profileId && conversationIdsRef.current.has(newMessage.conversacion_id)) {
            console.log('[MessagingContext] New message received, marking as delivered');
            
            // Insertar receipt de entrega
            await supabase.from('message_receipts').upsert({
              message_id: newMessage.id,
              user_id: profileId,
              delivered_at: new Date().toISOString(),
            }, {
              onConflict: 'message_id,user_id',
            });

            // Si la conversación está activa, marcar como leído también
            if (activeConversationId === newMessage.conversacion_id) {
              await supabase.from('message_receipts').upsert({
                message_id: newMessage.id,
                user_id: profileId,
                delivered_at: new Date().toISOString(),
                read_at: new Date().toISOString(),
              }, {
                onConflict: 'message_id,user_id',
              });
            }

            // Invalidar queries
            queryClient.invalidateQueries({ queryKey: ['messages', newMessage.conversacion_id] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
        }
      )
      .subscribe();

    messagesChannelRef.current = messagesChannel;

    // Canal para cambios en receipts (actualizar estados de mensajes)
    const receiptsChannel = supabase
      .channel(`messaging_receipts_${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_receipts',
        },
        (payload) => {
          console.log('[MessagingContext] Receipt updated:', payload);
          // Invalidar mensajes para que se actualicen los estados
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        }
      )
      .subscribe();

    receiptsChannelRef.current = receiptsChannel;
  };

  // Marcar mensajes como entregados
  const markAsDelivered = useCallback(async (conversationId: string) => {
    if (!currentProfileId) return;

    try {
      await supabase.rpc('mark_messages_delivered', {
        p_conversation_id: conversationId,
      });
    } catch (error) {
      console.error('[MessagingContext] Error marking as delivered:', error);
    }
  }, [currentProfileId]);

  // Marcar mensajes como leídos
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!currentProfileId) return;

    try {
      await supabase.rpc('mark_messages_read', {
        p_conversation_id: conversationId,
      });
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (error) {
      console.error('[MessagingContext] Error marking as read:', error);
    }
  }, [currentProfileId, queryClient]);

  // Establecer conversación activa
  const setActiveConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);
    
    // Si se abre una conversación, marcar mensajes como leídos
    if (conversationId && currentProfileId) {
      markAsRead(conversationId);
    }
  }, [currentProfileId, markAsRead]);

  const value: MessagingContextType = {
    currentProfileId,
    isInitialized,
    markAsDelivered,
    markAsRead,
    activeConversationId,
    setActiveConversation,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de mensajería
 */
export function useMessaging(): MessagingContextType {
  const context = useContext(MessagingContext);
  if (!context) {
    return {
      currentProfileId: null,
      isInitialized: false,
      markAsDelivered: async () => {},
      markAsRead: async () => {},
      activeConversationId: null,
      setActiveConversation: () => {},
    };
  }
  return context;
}
