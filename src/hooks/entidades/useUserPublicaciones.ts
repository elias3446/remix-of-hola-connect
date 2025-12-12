/**
 * Hook para obtener las publicaciones de un usuario específico
 * Similar a usePublicaciones pero filtrado por user_id
 */
import { useCallback, useRef, useEffect } from 'react';
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Publicacion, PublicacionAuthor } from './usePublicaciones';

interface PublicacionesPage {
  data: Publicacion[];
  nextCursor: string | null;
  hasMore: boolean;
}

const PAGE_SIZE = 10;

interface UseUserPublicacionesOptions {
  profileUserId: string | null; // El usuario del perfil que estamos viendo
  currentUserId?: string | null; // El usuario actual (para saber si ha dado like, etc.)
  enabled?: boolean;
}

export function useUserPublicaciones(options: UseUserPublicacionesOptions) {
  const { profileUserId, currentUserId, enabled = true } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const queryKey = ['user-publicaciones', profileUserId];

  const fetchPublicaciones = useCallback(async ({ pageParam }: { pageParam?: string }): Promise<PublicacionesPage> => {
    if (!profileUserId) {
      return { data: [], nextCursor: null, hasMore: false };
    }

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
      .eq('user_id', profileUserId)
      .eq('activo', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (pageParam) {
      query = query.lt('created_at', pageParam);
    }

    const { data: publicaciones, error } = await query;

    if (error) {
      console.error('[useUserPublicaciones] Error fetching:', error);
      throw error;
    }

    const publicacionIds = publicaciones?.map(p => p.id) || [];

    // Obtener IDs de publicaciones originales (reposts)
    const repostOfIds = publicaciones
      ?.filter(p => p.repost_of && !p.estado_id)
      .map(p => p.repost_of)
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

    // Interacciones del usuario actual
    let userLikes: string[] = [];
    let userSaved: string[] = [];

    if (currentUserId) {
      const { data: userLikesData } = await supabase
        .from('interacciones')
        .select('publicacion_id')
        .eq('user_id', currentUserId)
        .eq('tipo_interaccion', 'me_gusta')
        .in('publicacion_id', publicacionIds);

      userLikes = userLikesData?.map(l => l.publicacion_id).filter(Boolean) as string[] || [];

      const { data: userSavedData } = await supabase
        .from('publicacion_guardadas')
        .select('publicacion_id')
        .eq('user_id', currentUserId)
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

    const enrichedPublicaciones: Publicacion[] = (publicaciones || []).map(p => {
      const original = (p.repost_of && !p.estado_id) ? originalPostsMap.get(p.repost_of) : null;

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
        original_status: null,
      };
    });

    const lastItem = enrichedPublicaciones[enrichedPublicaciones.length - 1];
    const hasMore = enrichedPublicaciones.length === PAGE_SIZE;

    return {
      data: enrichedPublicaciones,
      nextCursor: hasMore && lastItem ? lastItem.created_at : null,
      hasMore,
    };
  }, [profileUserId, currentUserId]);

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
    enabled: enabled && !!profileUserId,
    staleTime: 1000 * 30,
  });

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    if (!enabled || !profileUserId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`user-publicaciones-${profileUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'publicaciones',
          filter: `user_id=eq.${profileUserId}`,
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
  }, [enabled, profileUserId, queryClient, queryKey]);

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
  };
}

/**
 * Hook para obtener las publicaciones guardadas por el usuario
 */
export function useUserSavedPosts(userId: string | null, enabled = true) {
  const queryKey = ['user-saved-posts', userId];

  const fetchSavedPosts = useCallback(async ({ pageParam }: { pageParam?: string }): Promise<PublicacionesPage> => {
    if (!userId) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    let query = supabase
      .from('publicacion_guardadas')
      .select(`
        id,
        created_at,
        publicacion:publicaciones!publicacion_guardadas_publicacion_id_fkey(
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
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (pageParam) {
      query = query.lt('created_at', pageParam);
    }

    const { data: savedPosts, error } = await query;

    if (error) {
      console.error('[useUserSavedPosts] Error fetching:', error);
      throw error;
    }

    // Filtrar y extraer las publicaciones
    const publicaciones = savedPosts
      ?.filter(sp => sp.publicacion && (sp.publicacion as any).activo)
      .map(sp => {
        const pub = sp.publicacion as any;
        return {
          ...pub,
          author: Array.isArray(pub.author) ? pub.author[0] : pub.author,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          has_liked: false,
          has_saved: true,
          original_post: null,
          original_status: null,
        };
      }) || [];

    const lastItem = savedPosts?.[savedPosts.length - 1];
    const hasMore = savedPosts?.length === PAGE_SIZE;

    return {
      data: publicaciones,
      nextCursor: hasMore && lastItem ? lastItem.created_at : null,
      hasMore,
    };
  }, [userId]);

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
    queryFn: fetchSavedPosts,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: enabled && !!userId,
    staleTime: 1000 * 30,
  });

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
  };
}

/**
 * Hook para obtener las publicaciones destacadas de un usuario
 * Ordenadas por engagement (likes + comentarios + shares)
 */
export function useUserFeaturedPosts(profileUserId: string | null, currentUserId?: string | null, enabled = true) {
  const queryKey = ['user-featured-posts', profileUserId];

  const fetchFeaturedPosts = useCallback(async (): Promise<Publicacion[]> => {
    if (!profileUserId) {
      return [];
    }

    // Obtener publicaciones del usuario
    const { data: publicaciones, error } = await supabase
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
      .eq('user_id', profileUserId)
      .eq('activo', true)
      .is('deleted_at', null)
      .is('repost_of', null) // Solo posts originales, no reposts
      .order('created_at', { ascending: false })
      .limit(50); // Obtener más para ordenar por engagement

    if (error) {
      console.error('[useUserFeaturedPosts] Error fetching:', error);
      throw error;
    }

    if (!publicaciones || publicaciones.length === 0) {
      return [];
    }

    const publicacionIds = publicaciones.map(p => p.id);

    // Obtener conteos en paralelo
    const [likesRes, commentsRes, sharesRes] = await Promise.all([
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

    // Interacciones del usuario actual
    let userLikes: string[] = [];
    let userSaved: string[] = [];

    if (currentUserId) {
      const [userLikesRes, userSavedRes] = await Promise.all([
        supabase
          .from('interacciones')
          .select('publicacion_id')
          .eq('user_id', currentUserId)
          .eq('tipo_interaccion', 'me_gusta')
          .in('publicacion_id', publicacionIds),
        supabase
          .from('publicacion_guardadas')
          .select('publicacion_id')
          .eq('user_id', currentUserId)
          .in('publicacion_id', publicacionIds),
      ]);

      userLikes = userLikesRes.data?.map(l => l.publicacion_id).filter(Boolean) as string[] || [];
      userSaved = userSavedRes.data?.map(s => s.publicacion_id).filter(Boolean) as string[] || [];
    }

    // Contar por publicación
    const likesCount = new Map<string, number>();
    const commentsCount = new Map<string, number>();
    const sharesCount = new Map<string, number>();

    likesRes.data?.forEach(l => {
      if (l.publicacion_id) {
        likesCount.set(l.publicacion_id, (likesCount.get(l.publicacion_id) || 0) + 1);
      }
    });

    commentsRes.data?.forEach(c => {
      if (c.publicacion_id) {
        commentsCount.set(c.publicacion_id, (commentsCount.get(c.publicacion_id) || 0) + 1);
      }
    });

    sharesRes.data?.forEach(s => {
      if (s.publicacion_id) {
        sharesCount.set(s.publicacion_id, (sharesCount.get(s.publicacion_id) || 0) + 1);
      }
    });

    // Enriquecer y ordenar por engagement
    const enrichedPublicaciones: Publicacion[] = publicaciones.map(p => ({
      ...p,
      author: Array.isArray(p.author) ? p.author[0] : p.author,
      likes_count: likesCount.get(p.id) || 0,
      comments_count: commentsCount.get(p.id) || 0,
      shares_count: sharesCount.get(p.id) || 0,
      has_liked: userLikes.includes(p.id),
      has_saved: userSaved.includes(p.id),
      original_post: null,
      original_status: null,
    }));

    // Ordenar por engagement total (likes + comments + shares)
    const sorted = enrichedPublicaciones.sort((a, b) => {
      const engagementA = a.likes_count + a.comments_count + a.shares_count;
      const engagementB = b.likes_count + b.comments_count + b.shares_count;
      return engagementB - engagementA;
    });

    // Filtrar solo los que tienen algún engagement y devolver top 10
    return sorted.filter(p => p.likes_count + p.comments_count + p.shares_count > 0).slice(0, 10);
  }, [profileUserId, currentUserId]);

  const {
    data: publicaciones,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: fetchFeaturedPosts,
    getNextPageParam: () => null, // No hay paginación para featured
    initialPageParam: undefined,
    enabled: enabled && !!profileUserId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    publicaciones: publicaciones?.pages?.[0] || [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    // Sin paginación para featured
    fetchNextPage: () => Promise.resolve(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}
