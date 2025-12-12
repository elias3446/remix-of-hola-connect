import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { setCachedUserId } from './useOptimizedEntity';

// Keys para localStorage
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
 * Verifica si el caché es válido (no expirado)
 */
function isCacheValid(): boolean {
  const timestamp = getFromStorage<number>(STORAGE_KEYS.timestamp);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_MAX_AGE_MS;
}

/**
 * Hook para inicializar los datos del usuario en caché después del login
 * Pre-carga: profile, settings y user_roles
 * 
 * PERSISTENCIA:
 * 1. Al cargar datos, se guardan en localStorage
 * 2. Al iniciar la app, se restauran datos desde localStorage (instantáneo)
 * 3. Luego se revalidan los datos desde Supabase en background
 * 4. Al cerrar sesión, se limpia localStorage
 * 
 * Relaciones:
 * - profiles.user_id -> auth.users.id
 * - settings.user_id -> profiles.id
 * - user_roles.user_id -> profiles.id
 */
export function useInitializeUserData() {
  const queryClient = useQueryClient();

  /**
   * Restaura datos del usuario desde localStorage (instantáneo)
   * Retorna true si había datos válidos en caché
   */
  const restoreFromCache = useCallback((authUserId: string): boolean => {
    const cachedUserId = getFromStorage<string>(STORAGE_KEYS.userId);
    
    // Verificar que el caché pertenece al mismo usuario y es válido
    if (cachedUserId !== authUserId || !isCacheValid()) {
      return false;
    }

    const profile = getFromStorage(STORAGE_KEYS.profile);
    const settings = getFromStorage(STORAGE_KEYS.settings);
    const userRoles = getFromStorage(STORAGE_KEYS.userRoles);

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

    if (process.env.NODE_ENV === 'development') {
      console.log('User data restored from cache');
    }

    return true;
  }, [queryClient]);

  /**
   * Persiste los datos en localStorage
   */
  const persistToStorage = useCallback((
    authUserId: string,
    profile: unknown,
    settings: unknown,
    userRoles: unknown
  ) => {
    saveToStorage(STORAGE_KEYS.userId, authUserId);
    saveToStorage(STORAGE_KEYS.profile, profile);
    saveToStorage(STORAGE_KEYS.settings, settings);
    saveToStorage(STORAGE_KEYS.userRoles, userRoles);
    saveToStorage(STORAGE_KEYS.timestamp, Date.now());
  }, []);

  /**
   * Actualiza un dato específico en el cache y localStorage
   * Mantiene consistencia entre ambos
   */
  const updateCacheAndStorage = useCallback((
    authUserId: string,
    key: 'profile' | 'settings' | 'userRoles',
    data: unknown
  ) => {
    // Actualizar React Query cache
    queryClient.setQueryData([key, authUserId], data);
    
    // Actualizar localStorage
    const storageKey = STORAGE_KEYS[key];
    saveToStorage(storageKey, data);
    saveToStorage(STORAGE_KEYS.timestamp, Date.now());

    if (process.env.NODE_ENV === 'development') {
      console.log(`Cache and storage updated for: ${key}`);
    }
  }, [queryClient]);

  /**
   * Sincroniza todo el cache actual a localStorage
   */
  const syncCacheToStorage = useCallback((authUserId: string) => {
    const profile = queryClient.getQueryData(['profile', authUserId]);
    const settings = queryClient.getQueryData(['settings', authUserId]);
    const userRoles = queryClient.getQueryData(['userRoles', authUserId]);

    if (profile) {
      persistToStorage(authUserId, profile, settings, userRoles);
    }
  }, [queryClient, persistToStorage]);

  /**
   * Inicializa datos del usuario desde Supabase
   * Si skipIfCached es true y hay caché válido, solo revalida en background
   */
  const initializeUserData = useCallback(async (
    authUserId: string,
    options?: { skipIfCached?: boolean }
  ) => {
    // Intentar restaurar desde caché primero
    const hasValidCache = restoreFromCache(authUserId);
    
    if (hasValidCache && options?.skipIfCached) {
      // Revalidar en background sin bloquear
      setTimeout(() => {
        initializeUserData(authUserId, { skipIfCached: false });
      }, 100);
      
      return {
        profile: queryClient.getQueryData(['profile', authUserId]),
        settings: queryClient.getQueryData(['settings', authUserId]),
        userRoles: queryClient.getQueryData(['userRoles', authUserId]),
        fromCache: true,
      };
    }

    // Cachear el userId a nivel de módulo
    setCachedUserId(authUserId);

    // Primero obtener el profile usando auth user_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileResult = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (profileResult.error || !profileResult.data) {
      console.error('Error loading profile:', profileResult.error);
      return {
        profile: null,
        settings: null,
        userRoles: null,
        fromCache: false,
      };
    }

    const profile = profileResult.data;
    const profileId = profile.id;

    // Poblar el caché con el profile
    queryClient.setQueryData(['profile', authUserId], profile);

    // Ahora cargar settings y user_roles usando profile.id
    const [settingsResult, rolesResult] = await Promise.allSettled([
      // Cargar settings usando profile.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('settings')
        .select('*')
        .eq('user_id', profileId)
        .maybeSingle(),
      
      // Cargar user_roles usando profile.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('user_roles')
        .select('*')
        .eq('user_id', profileId)
        .maybeSingle(),
    ]);

    const settings = settingsResult.status === 'fulfilled' ? settingsResult.value.data : null;
    const userRoles = rolesResult.status === 'fulfilled' ? rolesResult.value.data : null;

    // Poblar el caché de React Query con los datos obtenidos
    if (settings) {
      queryClient.setQueryData(['settings', authUserId], settings);
    }

    if (userRoles) {
      queryClient.setQueryData(['userRoles', authUserId], userRoles);
    }

    // Persistir en localStorage para restauración futura
    persistToStorage(authUserId, profile, settings, userRoles);

    if (process.env.NODE_ENV === 'development') {
      console.log('User data loaded and persisted');
    }

    return {
      profile,
      settings,
      userRoles,
      fromCache: false,
    };
  }, [queryClient, restoreFromCache, persistToStorage]);

  /**
   * Limpia todos los datos del usuario (caché y localStorage)
   */
  const clearUserData = useCallback(() => {
    // Limpiar caché de React Query
    queryClient.removeQueries({ queryKey: ['profile'] });
    queryClient.removeQueries({ queryKey: ['settings'] });
    queryClient.removeQueries({ queryKey: ['userRoles'] });
    setCachedUserId(null);

    // Limpiar localStorage
    try {
      localStorage.removeItem(STORAGE_KEYS.profile);
      localStorage.removeItem(STORAGE_KEYS.settings);
      localStorage.removeItem(STORAGE_KEYS.userRoles);
      localStorage.removeItem(STORAGE_KEYS.userId);
      localStorage.removeItem(STORAGE_KEYS.timestamp);
    } catch (error) {
      console.warn('Error clearing localStorage:', error);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('User data cleared');
    }
  }, [queryClient]);

  /**
   * Verifica si hay datos en caché válidos para un usuario
   */
  const hasCachedData = useCallback((authUserId: string): boolean => {
    const cachedUserId = getFromStorage<string>(STORAGE_KEYS.userId);
    return cachedUserId === authUserId && isCacheValid();
  }, []);

  return { 
    initializeUserData, 
    clearUserData,
    restoreFromCache,
    hasCachedData,
    updateCacheAndStorage,
    syncCacheToStorage,
  };
}
