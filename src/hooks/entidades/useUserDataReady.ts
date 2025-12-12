import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { setCachedUserId } from './useOptimizedEntity';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Settings = Database['public']['Tables']['settings']['Row'];
type UserRoles = Database['public']['Tables']['user_roles']['Row'];

// Keys para localStorage (compartidas con useInitializeUserData)
const STORAGE_KEYS = {
  profile: 'user_cache:profile',
  settings: 'user_cache:settings',
  userRoles: 'user_cache:userRoles',
  userId: 'user_cache:userId',
  timestamp: 'user_cache:timestamp',
} as const;

// Tiempo máximo de validez del caché (24 horas)
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Obtiene datos de localStorage de forma segura
 */
function getFromStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.warn('Error reading from localStorage:', error);
    return null;
  }
}

/**
 * Guarda datos en localStorage de forma segura
 */
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Error saving to localStorage:', error);
  }
}

/**
 * Verifica si el caché es válido (no expirado y pertenece al usuario)
 */
function isCacheValidForUser(userId: string): boolean {
  const cachedUserId = getFromStorage<string>(STORAGE_KEYS.userId);
  const timestamp = getFromStorage<number>(STORAGE_KEYS.timestamp);
  
  if (cachedUserId !== userId || !timestamp) return false;
  return Date.now() - timestamp < CACHE_MAX_AGE_MS;
}

/**
 * Persiste los datos en localStorage
 */
function persistUserData(
  userId: string,
  profile: Profile | null,
  settings: Settings | null,
  userRoles: UserRoles | null
) {
  saveToStorage(STORAGE_KEYS.userId, userId);
  saveToStorage(STORAGE_KEYS.profile, profile);
  saveToStorage(STORAGE_KEYS.settings, settings);
  saveToStorage(STORAGE_KEYS.userRoles, userRoles);
  saveToStorage(STORAGE_KEYS.timestamp, Date.now());
}

/**
 * Limpia los datos del localStorage
 */
function clearStoredData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.profile);
    localStorage.removeItem(STORAGE_KEYS.settings);
    localStorage.removeItem(STORAGE_KEYS.userRoles);
    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.timestamp);
  } catch (error) {
    console.warn('Error clearing localStorage:', error);
  }
}

interface UserDataState {
  isReady: boolean;
  isLoading: boolean;
  userId: string | null;
  profile: Profile | null;
  settings: Settings | null;
  userRoles: UserRoles | null;
}

/**
 * Hook para cargar y verificar si los datos del usuario están listos en el caché de React Query
 * 
 * PERSISTENCIA:
 * 1. Al cargar la app, primero intenta restaurar desde localStorage (instantáneo)
 * 2. Luego revalida los datos desde Supabase en background
 * 3. Al actualizar datos, los persiste en localStorage
 * 4. Al cerrar sesión, limpia localStorage
 * 
 * RELACIONES:
 * - profiles.user_id -> auth.users.id
 * - settings.user_id -> profiles.id
 * - user_roles.user_id -> profiles.id
 */
export function useUserDataReady(): UserDataState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<UserDataState>({
    isReady: false,
    isLoading: true,
    userId: null,
    profile: null,
    settings: null,
    userRoles: null,
  });

  /**
   * Restaura datos desde localStorage (instantáneo)
   */
  const restoreFromStorage = useCallback((authUserId: string): boolean => {
    if (!isCacheValidForUser(authUserId)) {
      return false;
    }

    const profile = getFromStorage<Profile>(STORAGE_KEYS.profile);
    const settings = getFromStorage<Settings>(STORAGE_KEYS.settings);
    const userRoles = getFromStorage<UserRoles>(STORAGE_KEYS.userRoles);

    if (!profile) {
      return false;
    }

    // Restaurar en React Query cache
    setCachedUserId(authUserId);
    queryClient.setQueryData(['profile', authUserId], profile);
    
    if (settings) {
      queryClient.setQueryData(['settings', authUserId], settings);
    }
    
    if (userRoles) {
      queryClient.setQueryData(['userRoles', authUserId], userRoles);
    }

    setState({
      isReady: true,
      isLoading: false,
      userId: authUserId,
      profile,
      settings,
      userRoles,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[useUserDataReady] Data restored from localStorage');
    }

    return true;
  }, [queryClient]);

  /**
   * Carga conversaciones en segundo plano
   */
  const loadConversationsBackground = useCallback(async (authUserId: string) => {
    try {
      // Cargar conversaciones
      const { data: conversations } = await supabase.rpc('get_user_conversations', {
        p_user_id: authUserId,
        p_filter: 'all',
      });

      if (conversations) {
        queryClient.setQueryData(['conversations', 'all'], conversations);
      }

      // Cargar estados activos
      const { data: estados } = await supabase
        .from('estados')
        .select('*')
        .eq('activo', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (estados) {
        queryClient.setQueryData(['estados'], estados);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[useUserDataReady] Background data loaded (conversations, estados)');
      }
    } catch (error) {
      console.error('[useUserDataReady] Error loading background data:', error);
    }
  }, [queryClient]);

  /**
   * Carga datos desde Supabase y los persiste
   * Respeta las relaciones: profiles.user_id -> auth, settings/roles.user_id -> profiles.id
   */
  const loadFromDatabase = useCallback(async (authUserId: string, isBackground = false) => {
    if (!isBackground) {
      setState(prev => ({ ...prev, isLoading: true, userId: authUserId }));
    }

    // Cachear el userId a nivel de módulo
    setCachedUserId(authUserId);

    try {
      // 1. Primero obtener el profile usando auth user_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileResult = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', authUserId)
        .maybeSingle();

      if (profileResult.error || !profileResult.data) {
        console.error('[useUserDataReady] Error loading profile:', profileResult.error);
        setState(prev => ({
          ...prev,
          isReady: true,
          isLoading: false,
        }));
        return;
      }

      const profile = profileResult.data as Profile;
      const profileId = profile.id;

      // 2. Cargar settings y user_roles usando profile.id
      const [settingsResult, rolesResult] = await Promise.allSettled([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('settings')
          .select('*')
          .eq('user_id', profileId)
          .maybeSingle(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('user_roles')
          .select('*')
          .eq('user_id', profileId)
          .maybeSingle(),
      ]);

      // Extraer datos
      const settings = settingsResult.status === 'fulfilled' ? settingsResult.value.data : null;
      const userRoles = rolesResult.status === 'fulfilled' ? rolesResult.value.data : null;

      // Guardar en caché de React Query (usando authUserId como key)
      queryClient.setQueryData(['profile', authUserId], profile);
      
      if (settings !== null) {
        queryClient.setQueryData(['settings', authUserId], settings);
      }
      if (userRoles !== null) {
        queryClient.setQueryData(['userRoles', authUserId], userRoles);
      }

      // Persistir en localStorage
      persistUserData(authUserId, profile, settings, userRoles);

      setState({
        isReady: true,
        isLoading: false,
        userId: authUserId,
        profile,
        settings,
        userRoles,
      });

      // Cargar conversaciones en segundo plano (no bloquea la UI)
      loadConversationsBackground(authUserId);

      if (process.env.NODE_ENV === 'development') {
        console.log('[useUserDataReady] Data loaded from database and persisted');
      }
    } catch (error) {
      console.error('[useUserDataReady] Error loading user data:', error);
      setState(prev => ({
        ...prev,
        isReady: true,
        isLoading: false,
      }));
    }
  }, [queryClient]);


  /**
   * Inicializa datos: primero desde localStorage, luego revalida en background
   */
  const loadUserData = useCallback(async (authUserId: string) => {
    // 1. Verificar si los datos ya están en React Query cache
    const cachedProfile = queryClient.getQueryData<Profile>(['profile', authUserId]);
    const cachedUserRoles = queryClient.getQueryData<UserRoles>(['userRoles', authUserId]);
    const cachedSettings = queryClient.getQueryData<Settings>(['settings', authUserId]);

    if (cachedProfile !== undefined && cachedUserRoles !== undefined) {
      setState({
        isReady: true,
        isLoading: false,
        userId: authUserId,
        profile: cachedProfile,
        settings: cachedSettings ?? null,
        userRoles: cachedUserRoles,
      });
      return;
    }

    // 2. Intentar restaurar desde localStorage (instantáneo)
    const restoredFromStorage = restoreFromStorage(authUserId);

    // 3. Revalidar desde la base de datos
    if (restoredFromStorage) {
      // Si restauramos desde storage, revalidar en background
      setTimeout(() => loadFromDatabase(authUserId, true), 100);
    } else {
      // Si no hay storage, cargar directamente
      await loadFromDatabase(authUserId, false);
    }
  }, [queryClient, restoreFromStorage, loadFromDatabase]);

  useEffect(() => {
    let mounted = true;

    const initializeData = async () => {
      // Obtener sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (session?.user?.id) {
        await loadUserData(session.user.id);
      } else {
        setState({
          isReady: false,
          isLoading: false,
          userId: null,
          profile: null,
          settings: null,
          userRoles: null,
        });
      }
    };

    initializeData();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          // Limpiar estado, caché y localStorage
          setCachedUserId(null);
          clearStoredData();
          setState({
            isReady: false,
            isLoading: false,
            userId: null,
            profile: null,
            settings: null,
            userRoles: null,
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[useUserDataReady] Session ended, data cleared');
          }
        } else if (session?.user?.id && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          // Cargar datos del usuario usando setTimeout para evitar deadlock
          setTimeout(() => {
            if (mounted) {
              loadUserData(session.user.id);
            }
          }, 0);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  // Suscribirse a cambios en el caché de React Query para actualizar el estado local
  useEffect(() => {
    if (!state.userId) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryKey[0] === 'profile' && event.query.queryKey[1] === state.userId) {
        const updatedProfile = queryClient.getQueryData<Profile>(['profile', state.userId]);
        if (updatedProfile && JSON.stringify(updatedProfile) !== JSON.stringify(state.profile)) {
          setState(prev => ({
            ...prev,
            profile: updatedProfile,
          }));
          // También actualizar localStorage
          saveToStorage(STORAGE_KEYS.profile, updatedProfile);
          saveToStorage(STORAGE_KEYS.timestamp, Date.now());
        }
      }
    });

    return () => unsubscribe();
  }, [queryClient, state.userId, state.profile]);

  // Suscripción en tiempo real a cambios de user_roles
  useEffect(() => {
    if (!state.profile?.id) return;

    const profileId = state.profile.id;

    const channel = supabase
      .channel(`user_roles_realtime_${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${profileId}`,
        },
        async (payload) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[useUserDataReady] Real-time user_roles change:', payload.eventType);
          }

          // Recargar roles desde la base de datos
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: updatedRoles, error } = await (supabase as any)
            .from('user_roles')
            .select('*')
            .eq('user_id', profileId)
            .maybeSingle();

          if (error) {
            console.error('[useUserDataReady] Error fetching updated roles:', error);
            return;
          }

          const newRoles = updatedRoles as UserRoles | null;

          // Actualizar estado local
          setState(prev => ({
            ...prev,
            userRoles: newRoles,
          }));

          // Actualizar React Query cache
          if (state.userId) {
            queryClient.setQueryData(['userRoles', state.userId], newRoles);
          }

          // Actualizar localStorage
          saveToStorage(STORAGE_KEYS.userRoles, newRoles);
          saveToStorage(STORAGE_KEYS.timestamp, Date.now());

          // Invalidar queries relacionadas para refrescar menús y permisos
          queryClient.invalidateQueries({ queryKey: ['userRolesList'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.profile?.id, state.userId, queryClient]);

  return state;
}
