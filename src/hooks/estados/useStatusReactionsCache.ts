/**
 * Sistema robusto de caché de reacciones para estados
 * Garantiza persistencia completa de reacciones del usuario
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReactionData {
  emoji: string;
  count: number;
  users: string[];
}

interface ReactionsCacheEntry {
  reactions: ReactionData[];
  userReaction: string | null;
  lastUpdated: number;
  isOptimistic: boolean;
}

// ============= CACHÉ GLOBAL =============
// Caché principal de reacciones por estado
const reactionsCache = new Map<string, ReactionsCacheEntry>();

// Caché de reacciones del usuario (NUNCA se sobreescribe por realtime)
// Esta es la fuente de verdad para las reacciones del usuario actual
const userReactionsCache = new Map<string, string | null>();

// Timestamps de operaciones optimistas pendientes
const pendingOperations = new Map<string, number>();

// Listeners para notificar cambios
const listeners = new Set<() => void>();

const CACHE_TTL = 60000; // 1 minuto
const OPERATION_LOCK_MS = 5000; // 5 segundos de bloqueo después de operación

// ============= FUNCIONES DE NOTIFICACIÓN =============
function notifyListeners() {
  listeners.forEach(listener => listener());
}

// ============= FUNCIONES DE CACHÉ =============
function getCacheEntry(estadoId: string): ReactionsCacheEntry | null {
  return reactionsCache.get(estadoId) || null;
}

function getUserReaction(estadoId: string): string | null {
  return userReactionsCache.get(estadoId) ?? null;
}

function setUserReaction(estadoId: string, emoji: string | null) {
  userReactionsCache.set(estadoId, emoji);
}

function isOperationPending(estadoId: string): boolean {
  const timestamp = pendingOperations.get(estadoId);
  if (!timestamp) return false;
  if (Date.now() - timestamp > OPERATION_LOCK_MS) {
    pendingOperations.delete(estadoId);
    return false;
  }
  return true;
}

function setOperationPending(estadoId: string) {
  pendingOperations.set(estadoId, Date.now());
}

function clearOperationPending(estadoId: string) {
  pendingOperations.delete(estadoId);
}

// ============= FUNCIÓN DE PROCESAMIENTO DE DATOS =============
function processReactionsData(
  data: any[],
  currentUserId: string | undefined
): { reactions: ReactionData[]; userReaction: string | null } {
  const grouped: Record<string, { count: number; users: string[] }> = {};
  let userReaction: string | null = null;

  (data || []).forEach((r: any) => {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { count: 0, users: [] };
    }
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.profiles?.name || r.profiles?.username || 'Usuario');
    
    if (currentUserId && r.user_id === currentUserId) {
      userReaction = r.emoji;
    }
  });

  const reactions = Object.entries(grouped).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    users: data.users,
  }));

  return { reactions, userReaction };
}

// ============= ACTUALIZAR CACHÉ =============
function updateCache(
  estadoId: string, 
  reactions: ReactionData[], 
  userReaction: string | null,
  isOptimistic: boolean = false
) {
  reactionsCache.set(estadoId, {
    reactions,
    userReaction,
    lastUpdated: Date.now(),
    isOptimistic,
  });
  
  // Solo actualizar userReactionsCache si es operación optimista
  // o si no hay valor previo
  if (isOptimistic || !userReactionsCache.has(estadoId)) {
    userReactionsCache.set(estadoId, userReaction);
  }
  
  notifyListeners();
}

// ============= HOOK PRINCIPAL =============
export function useStatusReactionsCache(estadoId: string | undefined, currentUserId: string | undefined) {
  const [version, setVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const lastFetchedIdRef = useRef<string | null>(null);

  // Forzar re-render cuando cambia el caché
  useEffect(() => {
    const unsubscribe = () => {
      listeners.delete(forceUpdate);
    };
    
    const forceUpdate = () => {
      if (isMountedRef.current) {
        setVersion(v => v + 1);
      }
    };
    
    listeners.add(forceUpdate);
    return unsubscribe;
  }, []);

  // Obtener datos del caché
  const cached = estadoId ? getCacheEntry(estadoId) : null;
  const reactions = cached?.reactions || [];
  
  // IMPORTANTE: userReaction SIEMPRE viene del caché de usuario
  const userReaction = estadoId ? getUserReaction(estadoId) : null;

  // Función para fetch de datos
  const fetchReactions = useCallback(async (id: string, force: boolean = false) => {
    // Evitar fetch múltiple
    if (fetchingRef.current && !force) return;
    
    // Evitar fetch si hay operación pendiente
    if (!force && isOperationPending(id)) {
      console.log('[ReactionsCache] Skipping fetch - operation pending for', id);
      return;
    }

    fetchingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('estado_reacciones')
        .select(`
          emoji,
          user_id,
          profiles!estado_reacciones_user_id_fkey (
            name,
            username
          )
        `)
        .eq('estado_id', id);

      if (error) {
        console.error('[ReactionsCache] Error fetching:', error);
        return;
      }

      if (!isMountedRef.current) return;
      
      // Si hay operación pendiente, no actualizar
      if (isOperationPending(id)) {
        console.log('[ReactionsCache] Discarding fetch result - operation pending');
        return;
      }

      const { reactions: fetchedReactions, userReaction: fetchedUserReaction } = 
        processReactionsData(data || [], currentUserId);

      // Actualizar caché
      updateCache(id, fetchedReactions, fetchedUserReaction, false);
      lastFetchedIdRef.current = id;

    } catch (error) {
      console.error('[ReactionsCache] Error:', error);
    } finally {
      fetchingRef.current = false;
    }
  }, [currentUserId]);

  // Efecto para cargar datos cuando cambia el estadoId
  useEffect(() => {
    isMountedRef.current = true;

    if (!estadoId) return;

    const cached = getCacheEntry(estadoId);
    const needsFetch = !cached || 
      Date.now() - cached.lastUpdated > CACHE_TTL ||
      (lastFetchedIdRef.current !== estadoId && !cached.isOptimistic);

    if (needsFetch) {
      setIsLoading(true);
      fetchReactions(estadoId).finally(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      });
    }

    // Suscripción realtime
    const channel = supabase
      .channel(`estado-reactions-${estadoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'estado_reacciones',
          filter: `estado_id=eq.${estadoId}`,
        },
        () => {
          // Solo actualizar si no hay operación pendiente
          if (!isOperationPending(estadoId)) {
            fetchReactions(estadoId);
          }
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [estadoId, fetchReactions]);

  // Función para actualizar reacción optimísticamente
  const setOptimisticReaction = useCallback((emoji: string) => {
    if (!estadoId || !currentUserId) return;

    // Marcar operación como pendiente
    setOperationPending(estadoId);

    // Obtener estado actual
    const currentUserReaction = getUserReaction(estadoId);
    const cached = getCacheEntry(estadoId);
    const currentReactions = cached?.reactions ? [...cached.reactions] : [];

    let newReactions = [...currentReactions];
    let newUserReaction: string | null;

    // Caso 1: Quitar reacción (clic en el mismo emoji)
    if (currentUserReaction === emoji) {
      const index = newReactions.findIndex(r => r.emoji === emoji);
      if (index !== -1) {
        if (newReactions[index].count <= 1) {
          newReactions.splice(index, 1);
        } else {
          newReactions[index] = {
            ...newReactions[index],
            count: newReactions[index].count - 1,
          };
        }
      }
      newUserReaction = null;
    } 
    // Caso 2: Cambiar o agregar reacción
    else {
      // Quitar reacción anterior si existe
      if (currentUserReaction) {
        const prevIndex = newReactions.findIndex(r => r.emoji === currentUserReaction);
        if (prevIndex !== -1) {
          if (newReactions[prevIndex].count <= 1) {
            newReactions.splice(prevIndex, 1);
          } else {
            newReactions[prevIndex] = {
              ...newReactions[prevIndex],
              count: newReactions[prevIndex].count - 1,
            };
          }
        }
      }
      
      // Agregar nueva reacción
      const existingIndex = newReactions.findIndex(r => r.emoji === emoji);
      if (existingIndex !== -1) {
        newReactions[existingIndex] = {
          ...newReactions[existingIndex],
          count: newReactions[existingIndex].count + 1,
        };
      } else {
        newReactions.push({ emoji, count: 1, users: ['Tú'] });
      }
      
      newUserReaction = emoji;
    }

    // Actualizar caches inmediatamente
    setUserReaction(estadoId, newUserReaction);
    updateCache(estadoId, newReactions, newUserReaction, true);

    console.log('[ReactionsCache] Optimistic update:', {
      estadoId,
      oldReaction: currentUserReaction,
      newReaction: newUserReaction,
    });

    // Limpiar operación pendiente después de un tiempo
    setTimeout(() => {
      clearOperationPending(estadoId);
    }, OPERATION_LOCK_MS);
  }, [estadoId, currentUserId]);

  // Función para refrescar
  const refreshReactions = useCallback(() => {
    if (estadoId) {
      clearOperationPending(estadoId);
      fetchReactions(estadoId, true);
    }
  }, [estadoId, fetchReactions]);

  return {
    reactions,
    userReaction,
    isLoading,
    setOptimisticReaction,
    refreshReactions,
  };
}

// ============= FUNCIONES EXPORTADAS =============

// Limpiar todo el caché
export function clearReactionsCache() {
  reactionsCache.clear();
  userReactionsCache.clear();
  pendingOperations.clear();
  notifyListeners();
}

// Pre-cargar reacciones de múltiples estados
export async function prefetchReactions(estadoIds: string[], currentUserId?: string) {
  if (estadoIds.length === 0) return;

  // Filtrar IDs que ya tienen caché válido
  const idsToFetch = estadoIds.filter(id => {
    const cached = getCacheEntry(id);
    return !cached || Date.now() - cached.lastUpdated > CACHE_TTL;
  });

  if (idsToFetch.length === 0) return;

  try {
    const { data, error } = await supabase
      .from('estado_reacciones')
      .select(`
        estado_id,
        emoji,
        user_id,
        profiles!estado_reacciones_user_id_fkey (
          name,
          username
        )
      `)
      .in('estado_id', idsToFetch);

    if (error) {
      console.error('[ReactionsCache] Prefetch error:', error);
      return;
    }

    // Agrupar por estado_id
    const byEstado = new Map<string, any[]>();
    
    // Inicializar con arrays vacíos para todos los IDs
    idsToFetch.forEach(id => byEstado.set(id, []));
    
    // Agregar datos
    (data || []).forEach((item: any) => {
      const arr = byEstado.get(item.estado_id);
      if (arr) arr.push(item);
    });

    // Actualizar caché para cada estado
    byEstado.forEach((items, estadoId) => {
      // No sobreescribir si hay operación pendiente
      if (isOperationPending(estadoId)) return;
      
      const { reactions, userReaction } = processReactionsData(items, currentUserId);
      
      // Solo actualizar si no existe en userReactionsCache o si es la primera carga
      const existingUserReaction = userReactionsCache.get(estadoId);
      const finalUserReaction = existingUserReaction !== undefined ? existingUserReaction : userReaction;
      
      reactionsCache.set(estadoId, {
        reactions,
        userReaction: finalUserReaction,
        lastUpdated: Date.now(),
        isOptimistic: false,
      });
      
      // Solo establecer userReaction si no existe
      if (!userReactionsCache.has(estadoId)) {
        userReactionsCache.set(estadoId, userReaction);
      }
    });

    notifyListeners();
    console.log('[ReactionsCache] Prefetched reactions for', idsToFetch.length, 'estados');
    
  } catch (error) {
    console.error('[ReactionsCache] Prefetch error:', error);
  }
}
