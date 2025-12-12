/**
 * Hook principal para manejo de Estados (Stories)
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { prefetchViews } from './useStatusViewsCache';
import { prefetchReactions } from './useStatusReactionsCache';
import type { 
  Estado, 
  EstadoExtendido, 
  UserEstadoGroup,
  CreateEstadoOptions,
  EstadoReaccionInput,
  EstadoFilter,
  EstadoStats
} from './types';

const ESTADO_DURATION_HOURS = 24;

type EstadoSource = 'mensajes' | 'social' | 'all';

interface UseEstadosOptions {
  /** Filtrar por origen: 'mensajes' solo muestra compartido_en_mensajes, 'social' solo compartido_en_social */
  source?: EstadoSource;
}

export function useEstados(currentUserId?: string, options: UseEstadosOptions = {}) {
  const { source = 'all' } = options;
  const queryClient = useQueryClient();

  // Obtener todos los estados activos (no expirados)
  const { 
    data: estados = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['estados', 'active', source],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      let query = supabase
        .from('estados')
        .select(`
          *,
          profiles!estados_user_id_fkey (
            id,
            name,
            avatar,
            username
          ),
          publicaciones:publicacion_id (
            id,
            user_id,
            profiles:user_id (
              id,
              name,
              avatar,
              username
            )
          )
        `)
        .eq('activo', true)
        .gt('expires_at', now);

      // Filtrar por origen
      if (source === 'mensajes') {
        query = query.eq('compartido_en_mensajes', true);
      } else if (source === 'social') {
        query = query.eq('compartido_en_social', true);
      }
      // Si es 'all', no filtramos

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      console.log('[useEstados] Raw data from API:', data);

      // Transformar los datos
      const transformed = (data || []).map((estado): EstadoExtendido => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const estadoAny = estado as any;
        const user = estadoAny.profiles ? {
          id: estadoAny.profiles.id,
          name: estadoAny.profiles.name,
          avatar: estadoAny.profiles.avatar,
          username: estadoAny.profiles.username,
        } : undefined;
        
        // Obtener autor original de la publicación compartida
        const originalAuthor = estadoAny.publicaciones?.profiles ? {
          id: estadoAny.publicaciones.profiles.id,
          name: estadoAny.publicaciones.profiles.name,
          avatar: estadoAny.publicaciones.profiles.avatar,
          username: estadoAny.publicaciones.profiles.username,
        } : null;
        
        console.log('[useEstados] Estado:', estado.id, 'profiles:', estadoAny.profiles, 'user:', user, 'originalAuthor:', originalAuthor);
        
        return {
          ...estado,
          user,
          original_author: originalAuthor,
        };
      });

      // Prefetch de vistas y reacciones de estados en paralelo
      const estadoIds = transformed.map(e => e.id);
      if (estadoIds.length > 0) {
        Promise.all([
          prefetchViews(estadoIds),
          prefetchReactions(estadoIds),
        ]).catch(console.error);
      }

      console.log('[useEstados] Transformed estados:', transformed);
      return transformed;
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Refetch cada minuto
  });

  // Suscripción realtime para cambios en estados (crear, eliminar, actualizar)
  useEffect(() => {
    const channel = supabase
      .channel('estados_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'estados',
        },
        () => {
          // Invalidar todas las queries de estados para refrescar
          queryClient.invalidateQueries({ queryKey: ['estados'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, source]);

  // Obtener mis estados (filtrado por source)
  const { data: misEstados = [] } = useQuery({
    queryKey: ['estados', 'mine', currentUserId, source],
    queryFn: async () => {
      if (!currentUserId) return [];

      const now = new Date().toISOString();
      
      let query = supabase
        .from('estados')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('activo', true)
        .gt('expires_at', now);

      // Filtrar por origen (igual que los estados generales)
      if (source === 'mensajes') {
        query = query.eq('compartido_en_mensajes', true);
      } else if (source === 'social') {
        query = query.eq('compartido_en_social', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUserId,
  });

  // Obtener vistas de mis estados
  const { data: misVistas = [] } = useQuery({
    queryKey: ['estado_vistas', 'mine', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];

      const estadoIds = misEstados.map(e => e.id);
      if (estadoIds.length === 0) return [];

      const { data, error } = await supabase
        .from('estado_vistas')
        .select(`
          *,
          profiles!estado_vistas_user_id_fkey (
            id,
            name,
            avatar,
            username
          )
        `)
        .in('estado_id', estadoIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUserId && misEstados.length > 0,
  });

  // Suscripción realtime para vistas de estados
  useEffect(() => {
    if (!currentUserId || misEstados.length === 0) return;

    const estadoIds = misEstados.map(e => e.id);

    const channel = supabase
      .channel('estado_vistas_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'estado_vistas',
        },
        (payload) => {
          // Solo invalidar si la vista es para uno de mis estados
          if (estadoIds.includes(payload.new.estado_id)) {
            queryClient.invalidateQueries({ queryKey: ['estado_vistas', 'mine', currentUserId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, misEstados, queryClient]);

  // Agrupar estados por usuario
  const estadosGroupedByUser = useMemo((): UserEstadoGroup[] => {
    const groups = new Map<string, UserEstadoGroup>();

    estados.forEach((estado) => {
      if (!estado.user_id || !estado.user) return;

      const existing = groups.get(estado.user_id);
      
      if (existing) {
        existing.estados.push(estado);
        existing.total_count++;
        // Actualizar si es más reciente
        if (new Date(estado.created_at) > new Date(existing.latest_created_at)) {
          existing.latest_created_at = estado.created_at;
        }
      } else {
        groups.set(estado.user_id, {
          user_id: estado.user_id,
          user: estado.user,
          estados: [estado],
          has_unviewed: true, // TODO: Calcular basado en vistas del usuario actual
          total_count: 1,
          latest_created_at: estado.created_at,
        });
      }
    });

    // Ordenar: mis estados primero, luego por más reciente
    return Array.from(groups.values()).sort((a, b) => {
      // Mis estados primero
      if (a.user_id === currentUserId) return -1;
      if (b.user_id === currentUserId) return 1;
      
      // Luego por fecha
      return new Date(b.latest_created_at).getTime() - new Date(a.latest_created_at).getTime();
    });
  }, [estados, currentUserId]);

  // Mutación para crear estado
  const createEstadoMutation = useMutation({
    mutationFn: async (options: CreateEstadoOptions) => {
      if (!currentUserId) throw new Error('Usuario no autenticado');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ESTADO_DURATION_HOURS);

      // Determinar tipo - solo valores permitidos: 'imagen', 'texto', 'video'
      let tipo: 'imagen' | 'texto' | 'video' = 'texto';
      if (options.imagenes && options.imagenes.length > 0) {
        tipo = 'imagen';
      }

      const insertData = {
        user_id: currentUserId,
        contenido: options.contenido || null,
        imagenes: options.imagenes || [],
        visibilidad: options.visibilidad,
        compartido_en_mensajes: options.compartido_en_mensajes ?? false,
        compartido_en_social: options.compartido_en_social ?? false,
        tipo,
        expires_at: expiresAt.toISOString(),
        activo: true,
        publicacion_id: options.publicacion_id || null,
      };

      const { data, error } = await supabase
        .from('estados')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estados'] });
      toast.success('Estado publicado correctamente');
    },
    onError: (error) => {
      console.error('Error creating estado:', error);
      toast.error('Error al publicar el estado');
    },
  });

  // Mutación para eliminar estado
  const deleteEstadoMutation = useMutation({
    mutationFn: async (estadoId: string) => {
      const { error } = await supabase
        .from('estados')
        .update({ activo: false })
        .eq('id', estadoId)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estados'] });
      toast.success('Estado eliminado');
    },
    onError: (error) => {
      console.error('Error deleting estado:', error);
      toast.error('Error al eliminar el estado');
    },
  });

  // Mutación para registrar vista - permite que el usuario vea su propio estado
  const registerViewMutation = useMutation({
    mutationFn: async (estadoId: string) => {
      if (!currentUserId) return null;

      // Verificar si ya existe la vista usando maybeSingle() para evitar errores
      const { data: existing } = await supabase
        .from('estado_vistas')
        .select('id')
        .eq('estado_id', estadoId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (existing) return null; // Ya existe la vista

      const { data, error } = await supabase
        .from('estado_vistas')
        .insert({
          estado_id: estadoId,
          user_id: currentUserId,
        })
        .select()
        .single();

      if (error && error.code !== '23505') throw error; // Ignorar duplicados
      return data;
    },
    onSuccess: (data) => {
      // Solo invalidar si se insertó una nueva vista
      if (data) {
        // Invalidar inmediatamente para actualizar el contador
        queryClient.invalidateQueries({ queryKey: ['estado_vistas'] });
      }
    },
    onError: (error) => {
      console.error('Error registering view:', error);
    },
  });

  // Mutación para agregar reacción
  const addReactionMutation = useMutation({
    mutationFn: async ({ estado_id, emoji }: EstadoReaccionInput) => {
      if (!currentUserId) throw new Error('Usuario no autenticado');

      // Eliminar reacción existente si hay
      await supabase
        .from('estado_reacciones')
        .delete()
        .eq('estado_id', estado_id)
        .eq('user_id', currentUserId);

      // Agregar nueva reacción
      const { data, error } = await supabase
        .from('estado_reacciones')
        .insert({
          estado_id,
          user_id: currentUserId,
          emoji,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estados'] });
    },
    onError: (error) => {
      console.error('Error adding reaction:', error);
      toast.error('Error al reaccionar');
    },
  });

  // Obtener estadísticas de un estado
  const getEstadoStats = useCallback(async (estadoId: string): Promise<EstadoStats> => {
    const [vistasResult, reaccionesResult] = await Promise.all([
      supabase
        .from('estado_vistas')
        .select('user_id')
        .eq('estado_id', estadoId),
      supabase
        .from('estado_reacciones')
        .select('emoji')
        .eq('estado_id', estadoId),
    ]);

    const uniqueVistas = new Set(vistasResult.data?.map(v => v.user_id) || []).size;
    const reaccionesByEmoji: Record<string, number> = {};
    
    (reaccionesResult.data || []).forEach(r => {
      reaccionesByEmoji[r.emoji] = (reaccionesByEmoji[r.emoji] || 0) + 1;
    });

    return {
      total_vistas: vistasResult.data?.length || 0,
      unique_vistas: uniqueVistas,
      reacciones_by_emoji: reaccionesByEmoji,
      total_reacciones: reaccionesResult.data?.length || 0,
    };
  }, []);

  return {
    // Data
    estados,
    misEstados,
    misVistas,
    estadosGroupedByUser,
    
    // Estado
    isLoading,
    error,
    
    // Acciones
    createEstado: createEstadoMutation.mutateAsync,
    deleteEstado: deleteEstadoMutation.mutateAsync,
    registerView: registerViewMutation.mutate,
    addReaction: addReactionMutation.mutateAsync,
    getEstadoStats,
    refetch,
    
    // Estados de mutaciones
    isCreating: createEstadoMutation.isPending,
    isDeleting: deleteEstadoMutation.isPending,
  };
}
