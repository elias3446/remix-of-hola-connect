/**
 * Context global para gestionar la presencia online/offline de usuarios
 * 
 * Funcionalidad:
 * - Independiente de mensajes y conversaciones
 * - Se activa automáticamente cuando el usuario inicia sesión
 * - Se desactiva automáticamente cuando el usuario cierra sesión
 * - Utiliza Supabase Realtime Presence para sincronización en tiempo real
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  user_id: string;
  profile_id: string;
  online_at: string;
}

interface UserPresenceContextType {
  /** Usuarios actualmente online */
  onlineUsers: Map<string, PresenceState>;
  /** Verifica si un usuario específico está online por profile_id */
  isUserOnline: (profileId: string) => boolean;
  /** Número total de usuarios online */
  onlineCount: number;
  /** Estado de conexión del canal de presencia */
  isConnected: boolean;
}

const UserPresenceContext = createContext<UserPresenceContextType | null>(null);

interface UserPresenceProviderProps {
  children: ReactNode;
}

export function UserPresenceProvider({ children }: UserPresenceProviderProps) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceState>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const currentUserRef = useRef<{ authId: string; profileId: string } | null>(null);

  // Inicializar presencia cuando hay sesión activa
  useEffect(() => {
    let isMounted = true;

    const initializePresence = async (authUserId: string) => {
      // Obtener profile_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authUserId)
        .single();

      if (!profile || !isMounted) return;

      const profileId = profile.id;
      currentUserRef.current = { authId: authUserId, profileId };

      // Evitar crear múltiples canales
      if (channelRef.current && isSubscribedRef.current) {
        return;
      }

      // Crear canal de presencia global
      const channel = supabase.channel('global_user_presence', {
        config: {
          presence: {
            key: profileId,
          },
        },
      });

      channelRef.current = channel;

      // Manejar sincronización de presencia
      channel.on('presence', { event: 'sync' }, () => {
        if (!isMounted) return;
        const state = channel.presenceState<PresenceState>();
        const newOnlineUsers = new Map<string, PresenceState>();
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            if (presence.profile_id) {
              newOnlineUsers.set(presence.profile_id, presence);
            }
          });
        });
        
        setOnlineUsers(newOnlineUsers);
      });

      // Manejar cuando un usuario se une
      channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        if (!isMounted) return;
        setOnlineUsers((prev) => {
          const updated = new Map(prev);
          newPresences.forEach((presence) => {
            const p = presence as unknown as PresenceState;
            if (p.profile_id) {
              updated.set(p.profile_id, p);
            }
          });
          return updated;
        });
      });

      // Manejar cuando un usuario se va
      channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (!isMounted) return;
        setOnlineUsers((prev) => {
          const updated = new Map(prev);
          leftPresences.forEach((presence) => {
            const p = presence as unknown as PresenceState;
            if (p.profile_id) {
              updated.delete(p.profile_id);
            }
          });
          return updated;
        });
      });

      // Suscribirse y enviar presencia
      channel.subscribe(async (status) => {
        if (!isMounted) return;
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          isSubscribedRef.current = true;
          
          // Enviar nuestra presencia
          await channel.track({
            user_id: authUserId,
            profile_id: profileId,
            online_at: new Date().toISOString(),
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          isSubscribedRef.current = false;
        }
      });
    };

    const cleanupPresence = () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
        setIsConnected(false);
        setOnlineUsers(new Map());
        currentUserRef.current = null;
      }
    };

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Usar setTimeout para evitar deadlocks
        setTimeout(() => {
          initializePresence(session.user.id);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        cleanupPresence();
      }
    });

    // Verificar sesión existente al montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && isMounted) {
        initializePresence(session.user.id);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      cleanupPresence();
    };
  }, []);

  // Verificar si un usuario está online
  const isUserOnline = useCallback((profileId: string): boolean => {
    return onlineUsers.has(profileId);
  }, [onlineUsers]);

  const value: UserPresenceContextType = {
    onlineUsers,
    isUserOnline,
    onlineCount: onlineUsers.size,
    isConnected,
  };

  return (
    <UserPresenceContext.Provider value={value}>
      {children}
    </UserPresenceContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de presencia de usuarios
 */
export function useUserPresenceContext(): UserPresenceContextType {
  const context = useContext(UserPresenceContext);
  if (!context) {
    throw new Error('useUserPresenceContext must be used within a UserPresenceProvider');
  }
  return context;
}

/**
 * Hook de compatibilidad que mantiene la misma interfaz que el hook anterior
 */
export function useUserPresence(): UserPresenceContextType {
  const context = useContext(UserPresenceContext);
  
  // Si no hay contexto, retornar valores por defecto (para compatibilidad)
  if (!context) {
    return {
      onlineUsers: new Map(),
      isUserOnline: () => false,
      onlineCount: 0,
      isConnected: false,
    };
  }
  
  return context;
}
