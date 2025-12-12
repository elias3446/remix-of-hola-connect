/**
 * Hook para manejar el caché de vistas de estados con actualización en segundo plano
 * Evita consultas directas a la base de datos en cada render
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ViewsCacheEntry {
  count: number;
  lastUpdated: number;
  isRegistered: boolean;
}

// Caché global para vistas de estados
const viewsCache = new Map<string, ViewsCacheEntry>();
const CACHE_TTL = 30000; // 30 segundos de TTL para el caché

export function useStatusViewsCache(estadoId: string | undefined, currentUserId: string | undefined) {
  const [viewCount, setViewCount] = useState(0);
  const [hasRegisteredView, setHasRegisteredView] = useState(false);
  const isMountedRef = useRef(true);
  const registeringRef = useRef(false);

  // Obtener del caché o retornar null si está expirado
  const getFromCache = useCallback((id: string): ViewsCacheEntry | null => {
    const cached = viewsCache.get(id);
    if (!cached) return null;
    
    // Verificar si el caché está expirado
    if (Date.now() - cached.lastUpdated > CACHE_TTL) {
      return null;
    }
    
    return cached;
  }, []);

  // Actualizar caché
  const updateCache = useCallback((id: string, count: number, isRegistered: boolean) => {
    viewsCache.set(id, {
      count,
      lastUpdated: Date.now(),
      isRegistered,
    });
  }, []);

  // Fetch vistas en segundo plano
  const fetchViewsInBackground = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('estado_vistas')
        .select('id')
        .eq('estado_id', id);
      
      if (!error && data && isMountedRef.current) {
        const count = data.length;
        const cached = viewsCache.get(id);
        updateCache(id, count, cached?.isRegistered ?? false);
        setViewCount(count);
      }
    } catch (error) {
      console.error('Error fetching views in background:', error);
    }
  }, [updateCache]);

  // Registrar vista del usuario
  const registerView = useCallback(async (id: string, userId: string) => {
    if (registeringRef.current) return;
    registeringRef.current = true;

    try {
      // Verificar si ya existe la vista
      const { data: existing } = await supabase
        .from('estado_vistas')
        .select('id')
        .eq('estado_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        // Insertar nueva vista
        const { error } = await supabase
          .from('estado_vistas')
          .insert({
            estado_id: id,
            user_id: userId,
          });

        if (!error && isMountedRef.current) {
          setHasRegisteredView(true);
          // Incrementar contador localmente para UI inmediata
          setViewCount(prev => {
            const newCount = prev + 1;
            updateCache(id, newCount, true);
            return newCount;
          });
        }
      } else {
        setHasRegisteredView(true);
        const cached = viewsCache.get(id);
        if (cached) {
          updateCache(id, cached.count, true);
        }
      }
    } catch (error) {
      console.error('Error registering view:', error);
    } finally {
      registeringRef.current = false;
    }
  }, [updateCache]);

  // Efecto principal
  useEffect(() => {
    isMountedRef.current = true;

    if (!estadoId) {
      setViewCount(0);
      setHasRegisteredView(false);
      return;
    }

    // Intentar obtener del caché primero
    const cached = getFromCache(estadoId);
    
    if (cached) {
      // Usar valor del caché inmediatamente
      setViewCount(cached.count);
      setHasRegisteredView(cached.isRegistered);
      
      // Actualizar en segundo plano si el caché tiene más de 10 segundos
      if (Date.now() - cached.lastUpdated > 10000) {
        fetchViewsInBackground(estadoId);
      }
    } else {
      // No hay caché, obtener de la base de datos
      fetchViewsInBackground(estadoId);
    }

    // Registrar vista si hay usuario y no está registrada
    if (currentUserId && !cached?.isRegistered) {
      registerView(estadoId, currentUserId);
    }

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel(`estado-vistas-cache-${estadoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'estado_vistas',
          filter: `estado_id=eq.${estadoId}`,
        },
        () => {
          // Actualizar en segundo plano cuando hay nueva vista
          fetchViewsInBackground(estadoId);
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [estadoId, currentUserId, getFromCache, fetchViewsInBackground, registerView]);

  // Función para forzar actualización
  const refreshViews = useCallback(() => {
    if (estadoId) {
      fetchViewsInBackground(estadoId);
    }
  }, [estadoId, fetchViewsInBackground]);

  return {
    viewCount,
    hasRegisteredView,
    refreshViews,
  };
}

// Función para limpiar el caché (útil al cerrar el visor)
export function clearViewsCache() {
  viewsCache.clear();
}

// Función para pre-cargar vistas de múltiples estados
export async function prefetchViews(estadoIds: string[]) {
  if (estadoIds.length === 0) return;

  try {
    const { data, error } = await supabase
      .from('estado_vistas')
      .select('estado_id')
      .in('estado_id', estadoIds);

    if (!error && data) {
      // Contar vistas por estado
      const counts = new Map<string, number>();
      data.forEach(item => {
        counts.set(item.estado_id, (counts.get(item.estado_id) || 0) + 1);
      });

      // Actualizar caché
      estadoIds.forEach(id => {
        viewsCache.set(id, {
          count: counts.get(id) || 0,
          lastUpdated: Date.now(),
          isRegistered: false,
        });
      });
    }
  } catch (error) {
    console.error('Error prefetching views:', error);
  }
}
