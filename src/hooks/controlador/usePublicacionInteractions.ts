/**
 * Hook para manejar interacciones de publicaciones con cache local y realtime
 * Maneja: likes, comentarios, compartidos, guardados
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============= TIPOS =============
interface InteractionCacheEntry {
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  hasLiked: boolean;
  hasSaved: boolean;
  timestamp: number;
}

type InteractionListener = (entry: InteractionCacheEntry) => void;

// ============= CACHE GLOBAL =============
const interactionsCache = new Map<string, InteractionCacheEntry>();
const cacheListeners = new Map<string, Set<InteractionListener>>();
const CACHE_TTL = 60000; // 60 segundos

// Canal de realtime compartido
let realtimeChannel: RealtimeChannel | null = null;
let channelSubscribers = 0;

// ============= FUNCIONES DE CACHE =============
function notifyListeners(publicacionId: string, entry: InteractionCacheEntry) {
  const listeners = cacheListeners.get(publicacionId);
  if (listeners) {
    listeners.forEach(listener => listener(entry));
  }
}

function getFromCache(publicacionId: string): InteractionCacheEntry | null {
  const cached = interactionsCache.get(publicacionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached;
  }
  return null;
}

function updateCache(publicacionId: string, updates: Partial<InteractionCacheEntry>) {
  const existing = interactionsCache.get(publicacionId) || {
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    hasLiked: false,
    hasSaved: false,
    timestamp: Date.now(),
  };
  
  const newEntry: InteractionCacheEntry = {
    ...existing,
    ...updates,
    timestamp: Date.now(),
  };
  
  interactionsCache.set(publicacionId, newEntry);
  notifyListeners(publicacionId, newEntry);
}

function subscribeToCache(publicacionId: string, listener: InteractionListener) {
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

// ============= REALTIME =============
function setupRealtimeChannel() {
  if (realtimeChannel) {
    channelSubscribers++;
    return;
  }
  
  channelSubscribers = 1;
  
  realtimeChannel = supabase
    .channel('publicaciones-interactions-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'interacciones' },
      (payload) => {
        const publicacionId = (payload.new as any)?.publicacion_id || (payload.old as any)?.publicacion_id;
        if (publicacionId) {
          // Invalidar cache para refetch
          const cached = interactionsCache.get(publicacionId);
          if (cached) {
            // Forzar refetch manteniendo timestamp viejo
            cached.timestamp = 0;
          }
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comentarios' },
      (payload) => {
        const publicacionId = (payload.new as any)?.publicacion_id || (payload.old as any)?.publicacion_id;
        if (publicacionId) {
          const cached = interactionsCache.get(publicacionId);
          if (cached) {
            cached.timestamp = 0;
          }
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'publicacion_compartidos' },
      (payload) => {
        const publicacionId = (payload.new as any)?.publicacion_id || (payload.old as any)?.publicacion_id;
        if (publicacionId) {
          const cached = interactionsCache.get(publicacionId);
          if (cached) {
            cached.timestamp = 0;
          }
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'publicacion_guardadas' },
      (payload) => {
        const publicacionId = (payload.new as any)?.publicacion_id || (payload.old as any)?.publicacion_id;
        if (publicacionId) {
          const cached = interactionsCache.get(publicacionId);
          if (cached) {
            cached.timestamp = 0;
          }
        }
      }
    )
    .subscribe();
}

function cleanupRealtimeChannel() {
  channelSubscribers--;
  if (channelSubscribers <= 0 && realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
    channelSubscribers = 0;
  }
}

// ============= HOOK PRINCIPAL =============
export function usePublicacionInteractions(
  publicacionId: string | undefined,
  userId?: string | null,
  initialData?: {
    likesCount?: number;
    commentsCount?: number;
    sharesCount?: number;
    hasLiked?: boolean;
    hasSaved?: boolean;
  }
) {
  const [state, setState] = useState<InteractionCacheEntry>({
    likesCount: initialData?.likesCount ?? 0,
    commentsCount: initialData?.commentsCount ?? 0,
    sharesCount: initialData?.sharesCount ?? 0,
    hasLiked: initialData?.hasLiked ?? false,
    hasSaved: initialData?.hasSaved ?? false,
    timestamp: Date.now(),
  });
  
  const isFetchingRef = useRef(false);
  const isLikingRef = useRef(false);
  const isSavingRef = useRef(false);

  // Inicializar cache con datos iniciales si se proporcionan
  useEffect(() => {
    if (!publicacionId) return;
    
    if (initialData && !interactionsCache.has(publicacionId)) {
      updateCache(publicacionId, {
        likesCount: initialData.likesCount ?? 0,
        commentsCount: initialData.commentsCount ?? 0,
        sharesCount: initialData.sharesCount ?? 0,
        hasLiked: initialData.hasLiked ?? false,
        hasSaved: initialData.hasSaved ?? false,
      });
    }
  }, [publicacionId, initialData]);

  // Suscribirse al cache y realtime
  useEffect(() => {
    if (!publicacionId) return;

    setupRealtimeChannel();

    const unsubscribe = subscribeToCache(publicacionId, (entry) => {
      setState(entry);
    });

    // Cargar datos del cache o fetch
    const cached = getFromCache(publicacionId);
    if (cached) {
      setState(cached);
    } else if (!isFetchingRef.current) {
      isFetchingRef.current = true;
      fetchInteractions(publicacionId, userId).finally(() => {
        isFetchingRef.current = false;
      });
    }

    return () => {
      unsubscribe();
      cleanupRealtimeChannel();
    };
  }, [publicacionId, userId]);

  // Fetch interacciones desde BD
  const fetchInteractions = async (pubId: string, uid?: string | null) => {
    try {
      const [likesRes, commentsRes, sharesRes] = await Promise.all([
        supabase
          .from('interacciones')
          .select('id', { count: 'exact', head: true })
          .eq('publicacion_id', pubId)
          .eq('tipo_interaccion', 'me_gusta'),
        supabase
          .from('comentarios')
          .select('id', { count: 'exact', head: true })
          .eq('publicacion_id', pubId)
          .eq('activo', true),
        supabase
          .from('publicacion_compartidos')
          .select('id', { count: 'exact', head: true })
          .eq('publicacion_id', pubId),
      ]);

      let hasLiked = false;
      let hasSaved = false;

      if (uid) {
        const [likeRes, savedRes] = await Promise.all([
          supabase
            .from('interacciones')
            .select('id')
            .eq('publicacion_id', pubId)
            .eq('user_id', uid)
            .eq('tipo_interaccion', 'me_gusta')
            .maybeSingle(),
          supabase
            .from('publicacion_guardadas')
            .select('id')
            .eq('publicacion_id', pubId)
            .eq('user_id', uid)
            .maybeSingle(),
        ]);
        hasLiked = !!likeRes.data;
        hasSaved = !!savedRes.data;
      }

      updateCache(pubId, {
        likesCount: likesRes.count || 0,
        commentsCount: commentsRes.count || 0,
        sharesCount: sharesRes.count || 0,
        hasLiked,
        hasSaved,
      });
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  };

  // Toggle Like optimista
  const toggleLike = useCallback(async () => {
    if (!publicacionId || !userId || isLikingRef.current) return;
    
    isLikingRef.current = true;
    const currentState = interactionsCache.get(publicacionId) || state;
    const wasLiked = currentState.hasLiked;

    // Actualización optimista
    updateCache(publicacionId, {
      hasLiked: !wasLiked,
      likesCount: wasLiked 
        ? Math.max(0, currentState.likesCount - 1)
        : currentState.likesCount + 1,
    });

    try {
      if (wasLiked) {
        await supabase
          .from('interacciones')
          .delete()
          .eq('publicacion_id', publicacionId)
          .eq('user_id', userId)
          .eq('tipo_interaccion', 'me_gusta');
      } else {
        await supabase
          .from('interacciones')
          .insert({
            publicacion_id: publicacionId,
            user_id: userId,
            tipo_interaccion: 'me_gusta',
          });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revertir en caso de error
      updateCache(publicacionId, {
        hasLiked: wasLiked,
        likesCount: currentState.likesCount,
      });
    } finally {
      isLikingRef.current = false;
    }
  }, [publicacionId, userId, state]);

  // Toggle Guardar optimista
  const toggleSave = useCallback(async () => {
    if (!publicacionId || !userId || isSavingRef.current) return;
    
    isSavingRef.current = true;
    const currentState = interactionsCache.get(publicacionId) || state;
    const wasSaved = currentState.hasSaved;

    // Actualización optimista
    updateCache(publicacionId, {
      hasSaved: !wasSaved,
    });

    try {
      if (wasSaved) {
        await supabase
          .from('publicacion_guardadas')
          .delete()
          .eq('publicacion_id', publicacionId)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('publicacion_guardadas')
          .insert({
            publicacion_id: publicacionId,
            user_id: userId,
          });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      // Revertir en caso de error
      updateCache(publicacionId, {
        hasSaved: wasSaved,
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [publicacionId, userId, state]);

  // Incrementar contador de comentarios (llamar después de crear comentario)
  const incrementComments = useCallback(() => {
    if (!publicacionId) return;
    const currentState = interactionsCache.get(publicacionId) || state;
    updateCache(publicacionId, {
      commentsCount: currentState.commentsCount + 1,
    });
  }, [publicacionId, state]);

  // Decrementar contador de comentarios (llamar después de eliminar comentario)
  const decrementComments = useCallback(() => {
    if (!publicacionId) return;
    const currentState = interactionsCache.get(publicacionId) || state;
    updateCache(publicacionId, {
      commentsCount: Math.max(0, currentState.commentsCount - 1),
    });
  }, [publicacionId, state]);

  // Incrementar contador de compartidos
  const incrementShares = useCallback(() => {
    if (!publicacionId) return;
    const currentState = interactionsCache.get(publicacionId) || state;
    updateCache(publicacionId, {
      sharesCount: currentState.sharesCount + 1,
    });
  }, [publicacionId, state]);

  return {
    likesCount: state.likesCount,
    commentsCount: state.commentsCount,
    sharesCount: state.sharesCount,
    hasLiked: state.hasLiked,
    hasSaved: state.hasSaved,
    toggleLike,
    toggleSave,
    incrementComments,
    decrementComments,
    incrementShares,
  };
}

// ============= PREFETCH PARA LISTAS =============
export async function prefetchPublicacionInteractions(
  publicacionIds: string[],
  userId?: string | null
) {
  if (publicacionIds.length === 0) return;

  try {
    const [likesData, commentsData, sharesData] = await Promise.all([
      supabase
        .from('interacciones')
        .select('publicacion_id')
        .in('publicacion_id', publicacionIds)
        .eq('tipo_interaccion', 'me_gusta'),
      supabase
        .from('comentarios')
        .select('publicacion_id')
        .in('publicacion_id', publicacionIds)
        .eq('activo', true),
      supabase
        .from('publicacion_compartidos')
        .select('publicacion_id')
        .in('publicacion_id', publicacionIds),
    ]);

    // Contar por publicación
    const likesCount = new Map<string, number>();
    const commentsCount = new Map<string, number>();
    const sharesCount = new Map<string, number>();

    likesData.data?.forEach(l => {
      likesCount.set(l.publicacion_id!, (likesCount.get(l.publicacion_id!) || 0) + 1);
    });
    commentsData.data?.forEach(c => {
      commentsCount.set(c.publicacion_id!, (commentsCount.get(c.publicacion_id!) || 0) + 1);
    });
    sharesData.data?.forEach(s => {
      sharesCount.set(s.publicacion_id!, (sharesCount.get(s.publicacion_id!) || 0) + 1);
    });

    // Obtener interacciones del usuario
    let userLikes = new Set<string>();
    let userSaved = new Set<string>();

    if (userId) {
      const [userLikesRes, userSavedRes] = await Promise.all([
        supabase
          .from('interacciones')
          .select('publicacion_id')
          .eq('user_id', userId)
          .eq('tipo_interaccion', 'me_gusta')
          .in('publicacion_id', publicacionIds),
        supabase
          .from('publicacion_guardadas')
          .select('publicacion_id')
          .eq('user_id', userId)
          .in('publicacion_id', publicacionIds),
      ]);

      userLikesRes.data?.forEach(l => userLikes.add(l.publicacion_id!));
      userSavedRes.data?.forEach(s => userSaved.add(s.publicacion_id!));
    }

    // Actualizar cache
    publicacionIds.forEach(id => {
      updateCache(id, {
        likesCount: likesCount.get(id) || 0,
        commentsCount: commentsCount.get(id) || 0,
        sharesCount: sharesCount.get(id) || 0,
        hasLiked: userLikes.has(id),
        hasSaved: userSaved.has(id),
      });
    });
  } catch (error) {
    console.error('Error prefetching interactions:', error);
  }
}

// ============= LIMPIAR CACHE =============
export function clearInteractionsCache() {
  interactionsCache.clear();
}
