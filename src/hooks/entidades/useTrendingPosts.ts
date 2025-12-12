/**
 * Hook para obtener publicaciones en tendencia
 * Ranking basado en likes, comentarios y vistas
 * Filtrable por período: 24h, 7d, 30d, todos
 * REALTIME: Actualiza instantáneamente como notificaciones/mensajes
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type TrendingPeriod } from './useTrendingHashtags';

export interface TrendingPost {
  id: string;
  contenido: string | null;
  created_at: string;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
  } | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  shares_count: number;
  score: number;
  rank: number;
  previousRank?: number;
  rankChange?: 'up' | 'down' | 'same' | 'new';
}

interface UseTrendingPostsOptions {
  limit?: number;
  enabled?: boolean;
}

function getPeriodDate(period: TrendingPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
}

export function useTrendingPosts(options: UseTrendingPostsOptions = {}) {
  const { limit = 5, enabled = true } = options;
  const [period, setPeriod] = useState<TrendingPeriod>('7d');
  const queryClient = useQueryClient();
  const previousPostsRef = useRef<Map<string, number>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Función para refetch con debounce corto
  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['trending-posts', period, limit] });
    }, 500); // 500ms debounce para agrupar cambios rápidos
  }, [queryClient, period, limit]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['trending-posts', period, limit],
    queryFn: async (): Promise<TrendingPost[]> => {
      const periodDate = getPeriodDate(period);
      const dateFilter = periodDate ? periodDate.toISOString() : new Date(0).toISOString();

      // Obtener publicaciones del período con sus autores
      const { data: posts, error: postsError } = await supabase
        .from('publicaciones')
        .select(`
          id,
          contenido,
          created_at,
          author:profiles!publicaciones_user_id_fkey(
            id,
            name,
            username,
            avatar
          )
        `)
        .eq('activo', true)
        .is('deleted_at', null)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(100);

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return [];

      const postIds = posts.map(p => p.id);

      // Obtener conteos en paralelo - filtrados por período
      const [likesRes, commentsRes, viewsRes, sharesRes] = await Promise.all([
        supabase
          .from('interacciones')
          .select('publicacion_id, created_at')
          .in('publicacion_id', postIds)
          .eq('tipo_interaccion', 'me_gusta')
          .gte('created_at', dateFilter),
        supabase
          .from('comentarios')
          .select('publicacion_id, created_at')
          .in('publicacion_id', postIds)
          .eq('activo', true)
          .gte('created_at', dateFilter),
        supabase
          .from('publicacion_vistas')
          .select('publicacion_id, created_at')
          .in('publicacion_id', postIds)
          .gte('created_at', dateFilter),
        supabase
          .from('publicacion_compartidos')
          .select('publicacion_id, created_at')
          .in('publicacion_id', postIds)
          .gte('created_at', dateFilter),
      ]);

      // Contar por publicación
      const likesCount = new Map<string, number>();
      const commentsCount = new Map<string, number>();
      const viewsCount = new Map<string, number>();
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

      viewsRes.data?.forEach(v => {
        if (v.publicacion_id) {
          viewsCount.set(v.publicacion_id, (viewsCount.get(v.publicacion_id) || 0) + 1);
        }
      });

      sharesRes.data?.forEach(s => {
        if (s.publicacion_id) {
          sharesCount.set(s.publicacion_id, (sharesCount.get(s.publicacion_id) || 0) + 1);
        }
      });

      // Calcular score y ordenar
      // Score = (likes * 3) + (comments * 2) + (shares * 2) + views
      const scoredPosts = posts.map(post => {
        const likes = likesCount.get(post.id) || 0;
        const comments = commentsCount.get(post.id) || 0;
        const views = viewsCount.get(post.id) || 0;
        const shares = sharesCount.get(post.id) || 0;
        const score = (likes * 3) + (comments * 2) + (shares * 2) + views;

        return {
          id: post.id,
          contenido: post.contenido,
          created_at: post.created_at,
          author: Array.isArray(post.author) ? post.author[0] : post.author,
          likes_count: likes,
          comments_count: comments,
          views_count: views,
          shares_count: shares,
          score,
          rank: 0,
          previousRank: undefined as number | undefined,
          rankChange: 'same' as const,
        };
      });

      // Ordenar por score y limitar
      const ranked = scoredPosts
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((post, index) => {
          const previousRank = previousPostsRef.current.get(post.id);
          let rankChange: 'up' | 'down' | 'same' | 'new' = 'same';
          
          if (previousRank === undefined) {
            rankChange = 'new';
          } else if (previousRank > index + 1) {
            rankChange = 'up';
          } else if (previousRank < index + 1) {
            rankChange = 'down';
          }

          return {
            ...post,
            rank: index + 1,
            previousRank,
            rankChange,
          };
        });

      // Guardar ranking actual para comparar en próxima actualización
      const newRankMap = new Map<string, number>();
      ranked.forEach(p => newRankMap.set(p.id, p.rank));
      previousPostsRef.current = newRankMap;

      return ranked;
    },
    enabled,
    staleTime: 0, // Siempre considerar stale para updates en tiempo real
    refetchInterval: 30000, // Refetch cada 30 segundos como backup
  });

  // Suscripción realtime con refetch inmediato
  useEffect(() => {
    if (!enabled) return;

    const channelId = `trending-posts-realtime-${Date.now()}`;
    
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interacciones' },
        () => debouncedRefetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comentarios' },
        () => debouncedRefetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'publicacion_vistas' },
        () => debouncedRefetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'publicacion_compartidos' },
        () => debouncedRefetch()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'publicaciones' },
        () => debouncedRefetch()
      )
      .subscribe((status) => {
        console.log('[TrendingPosts] Realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled, debouncedRefetch]);

  const changePeriod = useCallback((newPeriod: TrendingPeriod) => {
    // Limpiar ranking previo al cambiar período
    previousPostsRef.current = new Map();
    setPeriod(newPeriod);
  }, []);

  return {
    posts: data || [],
    isLoading,
    isFetching,
    period,
    changePeriod,
    refetch,
  };
}
