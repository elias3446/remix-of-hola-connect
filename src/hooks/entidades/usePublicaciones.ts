/**
 * Hook optimizado para cargar publicaciones del feed
 * Implementa scroll infinito y actualizaciones en tiempo real
 */
import { useCallback, useRef, useEffect, useState } from 'react';
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useDebounce } from '@/hooks/optimizacion';
import { prefetchPostViews } from '@/hooks/controlador/usePostViews';

export interface PublicacionAuthor {
  id: string;
  name: string | null;
  avatar: string | null;
  username: string | null;
}

export interface Publicacion {
  id: string;
  contenido: string | null;
  imagenes: string[] | null;
  visibilidad: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  repost_of: string | null;
  repost_comentario: string | null;
  estado_id: string | null;
  activo: boolean;
  author: PublicacionAuthor | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  has_liked: boolean;
  has_saved: boolean;
  // Datos de la publicación original (si es repost de una publicación)
  original_post?: {
    id: string;
    contenido: string | null;
    imagenes: string[] | null;
    created_at: string;
    author: PublicacionAuthor | null;
  } | null;
  // Datos del estado original (si se comparte un estado en el feed)
  original_status?: {
    id: string;
    contenido: string | null;
    imagenes: string[] | null;
    created_at: string;
    author: PublicacionAuthor | null;
  } | null;
}

interface PublicacionesPage {
  data: Publicacion[];
  nextCursor: string | null;
  hasMore: boolean;
}

const PAGE_SIZE = 10;

export interface UsePublicacionesOptions {
  /** ID del usuario actual (para marcar likes/saves propios) */
  userId?: string | null;
  /** ID del autor para filtrar posts (si se quiere ver posts de un usuario específico) */
  authorId?: string | null;
  enabled?: boolean;
}

export function usePublicaciones(options: UsePublicacionesOptions = {}) {
  const { userId, authorId, enabled = true } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [newPostsCount, setNewPostsCount] = useState(0);

  const queryKey = ['publicaciones-feed', userId, authorId];

  const fetchPublicaciones = useCallback(async ({ pageParam }: { pageParam?: string }): Promise<PublicacionesPage> => {
    let query = supabase
      .from('publicaciones')
      .select(`
        id,
        contenido,
        imagenes,
        visibilidad,
        created_at,
        updated_at,
        user_id,
        repost_of,
        repost_comentario,
        estado_id,
        activo,
        author:profiles!publicaciones_user_id_fkey(
          id,
          name,
          avatar,
          username
        )
      `)
      .eq('activo', true)
      .is('deleted_at', null);
    
    // Filtrar por autor si se especifica (para ver perfil de usuario específico)
    if (authorId) {
      query = query.eq('user_id', authorId);
    }
    
    query = query
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (pageParam) {
      query = query.lt('created_at', pageParam);
    }

    const { data: publicaciones, error } = await query;

    if (error) {
      console.error('[usePublicaciones] Error fetching:', error);
      throw error;
    }

    // Obtener conteos de interacciones para cada publicación
    const publicacionIds = publicaciones?.map(p => p.id) || [];
    
    // Obtener IDs de publicaciones originales (reposts de publicaciones)
    const repostOfIds = publicaciones
      ?.filter(p => p.repost_of && !p.estado_id)
      .map(p => p.repost_of)
      .filter((id): id is string => !!id) || [];
    
    // Obtener IDs de estados originales (cuando se comparte un estado en el feed)
    const estadoIds = publicaciones
      ?.map(p => p.estado_id)
      .filter((id): id is string => !!id) || [];
    
    // Obtener publicaciones originales para reposts
    let originalPostsMap = new Map<string, any>();
    if (repostOfIds.length > 0) {
      const { data: originalPosts } = await supabase
        .from('publicaciones')
        .select(`
          id,
          contenido,
          imagenes,
          created_at,
          activo,
          author:profiles!publicaciones_user_id_fkey(
            id,
            name,
            avatar,
            username
          )
        `)
        .in('id', repostOfIds);
      
      originalPosts?.forEach(op => {
        originalPostsMap.set(op.id, {
          ...op,
          author: Array.isArray(op.author) ? op.author[0] : op.author,
        });
      });
    }

    // Obtener estados originales para publicaciones que comparten estados
    let originalStatusMap = new Map<string, any>();
    if (estadoIds.length > 0) {
      const { data: originalEstados } = await supabase
        .from('estados')
        .select(`
          id,
          contenido,
          imagenes,
          created_at,
          activo,
          author:profiles!estados_user_id_fkey(
            id,
            name,
            avatar,
            username
          )
        `)
        .in('id', estadoIds);
      
      originalEstados?.forEach(estado => {
        originalStatusMap.set(estado.id, {
          ...estado,
          author: Array.isArray(estado.author) ? estado.author[0] : estado.author,
        });
      });
    }
    
    // Obtener likes
    const { data: likesData } = await supabase
      .from('interacciones')
      .select('publicacion_id')
      .in('publicacion_id', publicacionIds)
      .eq('tipo_interaccion', 'me_gusta');

    // Obtener comentarios
    const { data: commentsData } = await supabase
      .from('comentarios')
      .select('publicacion_id')
      .in('publicacion_id', publicacionIds)
      .eq('activo', true);

    // Obtener shares
    const { data: sharesData } = await supabase
      .from('publicacion_compartidos')
      .select('publicacion_id')
      .in('publicacion_id', publicacionIds);

    // Si hay usuario logueado, obtener sus interacciones
    let userLikes: string[] = [];
    let userSaved: string[] = [];
    
    if (userId) {
      const { data: userLikesData } = await supabase
        .from('interacciones')
        .select('publicacion_id')
        .eq('user_id', userId)
        .eq('tipo_interaccion', 'me_gusta')
        .in('publicacion_id', publicacionIds);
      
      userLikes = userLikesData?.map(l => l.publicacion_id).filter(Boolean) as string[] || [];

      const { data: userSavedData } = await supabase
        .from('publicacion_guardadas')
        .select('publicacion_id')
        .eq('user_id', userId)
        .in('publicacion_id', publicacionIds);
      
      userSaved = userSavedData?.map(s => s.publicacion_id).filter(Boolean) as string[] || [];
    }

    // Contar por publicación
    const likesCount = new Map<string, number>();
    const commentsCount = new Map<string, number>();
    const sharesCount = new Map<string, number>();

    likesData?.forEach(l => {
      if (l.publicacion_id) {
        likesCount.set(l.publicacion_id, (likesCount.get(l.publicacion_id) || 0) + 1);
      }
    });

    commentsData?.forEach(c => {
      if (c.publicacion_id) {
        commentsCount.set(c.publicacion_id, (commentsCount.get(c.publicacion_id) || 0) + 1);
      }
    });

    sharesData?.forEach(s => {
      if (s.publicacion_id) {
        sharesCount.set(s.publicacion_id, (sharesCount.get(s.publicacion_id) || 0) + 1);
      }
    });

    // Prefetch de vistas en paralelo (no bloquea la carga del feed)
    if (publicacionIds.length > 0) {
      prefetchPostViews(publicacionIds, userId).catch(console.error);
    }

    const enrichedPublicaciones: Publicacion[] = (publicaciones || []).map(p => {
      // Obtener publicación original (repost de post, no de estado)
      const original = (p.repost_of && !p.estado_id) ? originalPostsMap.get(p.repost_of) : null;
      // Obtener estado original (cuando se comparte un estado)
      const originalEstado = p.estado_id ? originalStatusMap.get(p.estado_id) : null;
      
      return {
        ...p,
        author: Array.isArray(p.author) ? p.author[0] : p.author,
        likes_count: likesCount.get(p.id) || 0,
        comments_count: commentsCount.get(p.id) || 0,
        shares_count: sharesCount.get(p.id) || 0,
        has_liked: userLikes.includes(p.id),
        has_saved: userSaved.includes(p.id),
        original_post: original && original.activo ? {
          id: original.id,
          contenido: original.contenido,
          imagenes: original.imagenes,
          created_at: original.created_at,
          author: original.author,
        } : null,
        original_status: originalEstado && originalEstado.activo ? {
          id: originalEstado.id,
          contenido: originalEstado.contenido,
          imagenes: originalEstado.imagenes,
          created_at: originalEstado.created_at,
          author: originalEstado.author,
        } : null,
      };
    });

    const lastItem = enrichedPublicaciones[enrichedPublicaciones.length - 1];
    const hasMore = enrichedPublicaciones.length === PAGE_SIZE;

    return {
      data: enrichedPublicaciones,
      nextCursor: hasMore && lastItem ? lastItem.created_at : null,
      hasMore,
    };
  }, [userId, authorId]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: fetchPublicaciones,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled,
    staleTime: 1000 * 30, // 30 segundos para datos más frescos
  });

  // Suscripción a cambios en publicaciones en tiempo real
  useEffect(() => {
    if (!enabled) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('publicaciones-feed-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'publicaciones',
        },
        () => {
          // Incrementar contador de nuevas publicaciones
          setNewPostsCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'publicaciones',
        },
        () => {
          // Invalidar para refrescar (eliminar = activo: false)
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'publicaciones',
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, queryClient, queryKey]);

  // Función para cargar nuevas publicaciones
  const loadNewPosts = useCallback(async () => {
    setNewPostsCount(0);
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Flatten pages into a single array
  const publicaciones = data?.pages.flatMap(page => page.data) || [];

  return {
    publicaciones,
    isLoading,
    isError,
    error: error as Error | null,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    refetch,
    newPostsCount,
    loadNewPosts,
  };
}

/**
 * Hook para detectar scroll infinito
 */
export function useInfiniteScroll(
  callback: () => void,
  options: { threshold?: number; enabled?: boolean } = {}
) {
  const { threshold = 100, enabled = true } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const debouncedCallback = useDebounce(callback, 200);

  useEffect(() => {
    if (!enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          debouncedCallback;
          callback();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [callback, threshold, enabled, debouncedCallback]);

  return { sentinelRef };
}
