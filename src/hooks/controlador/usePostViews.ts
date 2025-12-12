/**
 * Hook para manejar vistas de publicaciones con cache local y realtime
 * Una vista se registra cuando: reaccionar, comentar, responder, compartir, guardar, o ver detalle
 */
import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Cache de vistas en memoria con listeners para actualizaciones reactivas
interface ViewCacheEntry {
  count: number;
  timestamp: number;
  hasViewed: boolean;
}

const viewsCache = new Map<string, ViewCacheEntry>();
const cacheListeners = new Map<string, Set<(entry: ViewCacheEntry) => void>>();
const CACHE_TTL = 60000; // 60 segundos

// Registro de vistas pendientes para actualización batch
const pendingViews = new Set<string>();
let batchTimeout: NodeJS.Timeout | null = null;

// Función para notificar a todos los listeners de un cambio
function notifyListeners(publicacionId: string, entry: ViewCacheEntry) {
  const listeners = cacheListeners.get(publicacionId);
  if (listeners) {
    listeners.forEach(listener => listener(entry));
  }
}

// Función para obtener del cache
function getFromCache(publicacionId: string): ViewCacheEntry | null {
  const cached = viewsCache.get(publicacionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached;
  }
  return null;
}

// Función para actualizar cache y notificar
function updateCache(publicacionId: string, count: number, hasViewed: boolean) {
  const entry: ViewCacheEntry = {
    count,
    timestamp: Date.now(),
    hasViewed,
  };
  viewsCache.set(publicacionId, entry);
  notifyListeners(publicacionId, entry);
}

// Incrementar contador en cache de forma optimista
function incrementCacheCount(publicacionId: string, userId: string) {
  const cached = viewsCache.get(publicacionId);
  if (cached) {
    // Solo incrementar si el usuario no había visto
    if (!cached.hasViewed) {
      const newEntry: ViewCacheEntry = {
        count: cached.count + 1,
        timestamp: Date.now(),
        hasViewed: true,
      };
      viewsCache.set(publicacionId, newEntry);
      notifyListeners(publicacionId, newEntry);
    }
  } else {
    // Si no hay cache, crear uno con la vista del usuario
    const newEntry: ViewCacheEntry = {
      count: 1,
      timestamp: Date.now(),
      hasViewed: true,
    };
    viewsCache.set(publicacionId, newEntry);
    notifyListeners(publicacionId, newEntry);
  }
}

// Suscribir listener al cache
function subscribeToCache(publicacionId: string, listener: (entry: ViewCacheEntry) => void) {
  if (!cacheListeners.has(publicacionId)) {
    cacheListeners.set(publicacionId, new Set());
  }
  cacheListeners.get(publicacionId)!.add(listener);
  
  return () => {
    const listeners = cacheListeners.get(publicacionId);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        cacheListeners.delete(publicacionId);
      }
    }
  };
}

// Procesar vistas pendientes en batch
async function processPendingViews(userId: string) {
  if (pendingViews.size === 0) return;
  
  const viewsToProcess = Array.from(pendingViews);
  pendingViews.clear();
  
  try {
    for (const publicacionId of viewsToProcess) {
      // Verificar si ya existe la vista
      const { data: existing } = await supabase
        .from('publicacion_vistas')
        .select('id')
        .eq('publicacion_id', publicacionId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!existing) {
        await supabase
          .from('publicacion_vistas')
          .insert({
            publicacion_id: publicacionId,
            user_id: userId,
          });
      }
    }
  } catch (error) {
    console.error('Error procesando vistas pendientes:', error);
  }
}

// Programar batch de vistas
function scheduleBatchProcess(userId: string) {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
  }
  batchTimeout = setTimeout(() => processPendingViews(userId), 1000);
}

/**
 * Hook para registrar y contar vistas de una publicación
 */
export function usePostViews(publicacionId: string | undefined, userId?: string | null) {
  const [viewCount, setViewCount] = useState(0);
  const [hasViewed, setHasViewed] = useState(false);
  const hasRegisteredRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Suscribirse a cambios del cache
  useEffect(() => {
    if (!publicacionId) return;

    // Listener para actualizaciones del cache
    const unsubscribe = subscribeToCache(publicacionId, (entry) => {
      setViewCount(entry.count);
      setHasViewed(entry.hasViewed);
    });

    // Cargar datos iniciales del cache o fetch
    const cached = getFromCache(publicacionId);
    if (cached) {
      setViewCount(cached.count);
      setHasViewed(cached.hasViewed);
    } else if (!isFetchingRef.current) {
      isFetchingRef.current = true;

      // Fetch en background
      (async () => {
        try {
          const { count } = await supabase
            .from('publicacion_vistas')
            .select('id', { count: 'exact', head: true })
            .eq('publicacion_id', publicacionId);
          
          let userHasViewed = false;
          if (userId) {
            const { data: viewData } = await supabase
              .from('publicacion_vistas')
              .select('id')
              .eq('publicacion_id', publicacionId)
              .eq('user_id', userId)
              .maybeSingle();
            
            userHasViewed = !!viewData;
          }

          const totalCount = count || 0;
          updateCache(publicacionId, totalCount, userHasViewed);
        } catch (error) {
          console.error('Error cargando vistas:', error);
        } finally {
          isFetchingRef.current = false;
        }
      })();
    }

    return unsubscribe;
  }, [publicacionId, userId]);

  // Registrar vista
  const registerView = useCallback(() => {
    if (!publicacionId || !userId || hasRegisteredRef.current || hasViewed) return;
    
    hasRegisteredRef.current = true;
    
    // Actualización optimista inmediata del cache
    incrementCacheCount(publicacionId, userId);
    
    // Agregar a pendientes para batch
    pendingViews.add(publicacionId);
    scheduleBatchProcess(userId);
  }, [publicacionId, userId, hasViewed]);

  return {
    viewCount,
    hasViewed,
    registerView,
  };
}

/**
 * Hook para registrar vista desde acciones específicas
 * Usado en: like, comment, share, save, detail view
 */
export function useRegisterPostView(userId?: string | null) {
  const registeredPosts = useRef(new Set<string>());

  const registerView = useCallback((publicacionId: string) => {
    if (!userId || !publicacionId) return;
    if (registeredPosts.current.has(publicacionId)) return;
    
    registeredPosts.current.add(publicacionId);
    
    // Actualizar cache local de forma optimista
    incrementCacheCount(publicacionId, userId);
    
    // Agregar a pendientes
    pendingViews.add(publicacionId);
    scheduleBatchProcess(userId);
  }, [userId]);

  return { registerView };
}

/**
 * Limpiar cache de vistas
 */
export function clearPostViewsCache() {
  viewsCache.clear();
}

/**
 * Pre-cargar vistas para múltiples publicaciones
 */
export async function prefetchPostViews(publicacionIds: string[], userId?: string | null) {
  if (publicacionIds.length === 0) return;
  
  try {
    // Obtener conteos de vistas
    const { data: viewsData } = await supabase
      .from('publicacion_vistas')
      .select('publicacion_id')
      .in('publicacion_id', publicacionIds);
    
    // Contar por publicación
    const countMap = new Map<string, number>();
    viewsData?.forEach(v => {
      countMap.set(v.publicacion_id, (countMap.get(v.publicacion_id) || 0) + 1);
    });
    
    // Si hay usuario, verificar sus vistas
    let userViewsSet = new Set<string>();
    if (userId) {
      const { data: userViews } = await supabase
        .from('publicacion_vistas')
        .select('publicacion_id')
        .eq('user_id', userId)
        .in('publicacion_id', publicacionIds);
      
      userViews?.forEach(v => userViewsSet.add(v.publicacion_id));
    }
    
    // Actualizar cache
    publicacionIds.forEach(id => {
      updateCache(id, countMap.get(id) || 0, userViewsSet.has(id));
    });
  } catch (error) {
    console.error('Error prefetching views:', error);
  }
}
