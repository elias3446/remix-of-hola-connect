/**
 * useTrendingAnalytics - Hook para análisis de publicaciones en tendencia
 * Calcula métricas, distribución de engagement y datos para gráficos
 */
import { useMemo, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subHours, format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos de período de tiempo
export type TrendingPeriod = '24h' | '7d' | '30d' | 'all';

export interface TrendingPostAnalytics {
  id: string;
  rank: number;
  contenido: string | null;
  created_at: string;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
  } | null;
  score: number;
  likes_count: number;
  comments_count: number;
  views_count: number;
  shares_count: number;
}

export interface TrendingMetrics {
  totalScore: number;
  averageScore: number;
  totalPosts: number;
  totalLikes: number;
  averageLikes: number;
  totalComments: number;
  averageComments: number;
  totalViews: number;
  averageViews: number;
  totalShares: number;
  averageShares: number;
}

export interface EngagementDistribution {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface PostMetrics {
  name: string;
  value: number;
  value2: number;
}

export interface TrendScorePoint {
  name: string;
  value: number;
  label?: string;
}

export interface RadarMetric {
  name: string;
  value: number;
}

export interface UseTrendingAnalyticsOptions {
  userId?: string;
  enabled?: boolean;
}

export interface UseTrendingAnalyticsReturn {
  // Estado
  period: TrendingPeriod;
  setPeriod: (period: TrendingPeriod) => void;
  
  // Datos
  myTrendingPosts: TrendingPostAnalytics[];
  allTrendingPosts: TrendingPostAnalytics[];
  metrics: TrendingMetrics;
  
  // Datos para gráficos
  engagementDistribution: EngagementDistribution[];
  postMetrics: PostMetrics[];
  trendScores: TrendScorePoint[];
  radarData: RadarMetric[];
  
  // Estado de carga
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

// Pesos para calcular el score de trending
const SCORE_WEIGHTS = {
  likes: 3,
  comments: 2,
  views: 1,
  shares: 4,
};

// Colores para distribución de engagement
const ENGAGEMENT_COLORS = {
  likes: 'hsl(0, 84%, 60%)',      // Rojo
  comments: 'hsl(217, 91%, 60%)', // Azul
  views: 'hsl(38, 92%, 50%)',     // Amarillo
  shares: 'hsl(142, 76%, 36%)',   // Verde
};

function getPeriodDate(period: TrendingPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case '24h':
      return subHours(now, 24);
    case '7d':
      return subDays(now, 7);
    case '30d':
      return subDays(now, 30);
    case 'all':
      return null;
  }
}

export function useTrendingAnalytics(options: UseTrendingAnalyticsOptions = {}): UseTrendingAnalyticsReturn {
  const { userId, enabled = true } = options;
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<TrendingPeriod>('30d');

  // Query principal para obtener publicaciones trending
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trending-analytics', period, userId],
    queryFn: async () => {
      const periodDate = getPeriodDate(period);

      // Query base para publicaciones
      let query = supabase
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
        .order('created_at', { ascending: false })
        .limit(100);

      if (periodDate) {
        query = query.gte('created_at', periodDate.toISOString());
      }

      const { data: posts, error: postsError } = await query;

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) {
        return { 
          posts: [] as typeof posts, 
          counts: {
            likes: new Map<string, number>(),
            comments: new Map<string, number>(),
            views: new Map<string, number>(),
            shares: new Map<string, number>(),
          } 
        };
      }

      const postIds = posts.map(p => p.id);

      // Obtener conteos en paralelo
      const [likesRes, commentsRes, viewsRes, sharesRes] = await Promise.all([
        supabase
          .from('interacciones')
          .select('publicacion_id')
          .in('publicacion_id', postIds)
          .eq('tipo_interaccion', 'me_gusta'),
        supabase
          .from('comentarios')
          .select('publicacion_id')
          .in('publicacion_id', postIds)
          .eq('activo', true)
          .is('deleted_at', null),
        supabase
          .from('publicacion_vistas')
          .select('publicacion_id')
          .in('publicacion_id', postIds),
        supabase
          .from('publicacion_compartidos')
          .select('publicacion_id')
          .in('publicacion_id', postIds),
      ]);

      // Crear mapas de conteo
      const counts = {
        likes: new Map<string, number>(),
        comments: new Map<string, number>(),
        views: new Map<string, number>(),
        shares: new Map<string, number>(),
      };

      likesRes.data?.forEach(l => {
        if (l.publicacion_id) {
          counts.likes.set(l.publicacion_id, (counts.likes.get(l.publicacion_id) || 0) + 1);
        }
      });

      commentsRes.data?.forEach(c => {
        if (c.publicacion_id) {
          counts.comments.set(c.publicacion_id, (counts.comments.get(c.publicacion_id) || 0) + 1);
        }
      });

      viewsRes.data?.forEach(v => {
        if (v.publicacion_id) {
          counts.views.set(v.publicacion_id, (counts.views.get(v.publicacion_id) || 0) + 1);
        }
      });

      sharesRes.data?.forEach(s => {
        if (s.publicacion_id) {
          counts.shares.set(s.publicacion_id, (counts.shares.get(s.publicacion_id) || 0) + 1);
        }
      });

      return { posts, counts };
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Procesar posts con scores
  const processedPosts = useMemo(() => {
    if (!data?.posts || data.posts.length === 0) return [];

    const { posts, counts } = data;

    return posts.map(post => {
      const likes = counts.likes.get(post.id) || 0;
      const comments = counts.comments.get(post.id) || 0;
      const views = counts.views.get(post.id) || 0;
      const shares = counts.shares.get(post.id) || 0;
      
      const score = 
        (likes * SCORE_WEIGHTS.likes) +
        (comments * SCORE_WEIGHTS.comments) +
        (views * SCORE_WEIGHTS.views) +
        (shares * SCORE_WEIGHTS.shares);

      return {
        id: post.id,
        rank: 0, // Se asignará después de ordenar
        contenido: post.contenido,
        created_at: post.created_at,
        author: Array.isArray(post.author) ? post.author[0] : post.author,
        score,
        likes_count: likes,
        comments_count: comments,
        views_count: views,
        shares_count: shares,
      };
    }).sort((a, b) => b.score - a.score).map((post, index) => ({
      ...post,
      rank: index + 1,
    }));
  }, [data]);

  // Posts del usuario actual
  const myTrendingPosts = useMemo(() => {
    if (!userId) return [];
    return processedPosts.filter(p => p.author?.id === userId);
  }, [processedPosts, userId]);

  // Todos los posts (limitado a 50 para rendimiento)
  const allTrendingPosts = useMemo(() => {
    return processedPosts.slice(0, 50);
  }, [processedPosts]);

  // Calcular métricas agregadas
  const metrics = useMemo<TrendingMetrics>(() => {
    const posts = myTrendingPosts.length > 0 ? myTrendingPosts : [];
    const count = posts.length || 1;

    const totalScore = posts.reduce((sum, p) => sum + p.score, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p.likes_count, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments_count, 0);
    const totalViews = posts.reduce((sum, p) => sum + p.views_count, 0);
    const totalShares = posts.reduce((sum, p) => sum + p.shares_count, 0);

    return {
      totalScore,
      averageScore: Math.round(totalScore / count),
      totalPosts: posts.length,
      totalLikes,
      averageLikes: Math.round(totalLikes / count),
      totalComments,
      averageComments: Math.round(totalComments / count),
      totalViews,
      averageViews: Math.round(totalViews / count),
      totalShares,
      averageShares: Math.round(totalShares / count),
    };
  }, [myTrendingPosts]);

  // Distribución de engagement (para pie chart)
  const engagementDistribution = useMemo<EngagementDistribution[]>(() => {
    const total = metrics.totalLikes + metrics.totalComments + metrics.totalViews + metrics.totalShares;
    if (total === 0) return [];

    return [
      {
        name: 'Me gusta',
        value: metrics.totalLikes,
        percentage: Math.round((metrics.totalLikes / total) * 100),
        color: ENGAGEMENT_COLORS.likes,
      },
      {
        name: 'Comentarios',
        value: metrics.totalComments,
        percentage: Math.round((metrics.totalComments / total) * 100),
        color: ENGAGEMENT_COLORS.comments,
      },
      {
        name: 'Vistas',
        value: metrics.totalViews,
        percentage: Math.round((metrics.totalViews / total) * 100),
        color: ENGAGEMENT_COLORS.views,
      },
      {
        name: 'Compartidos',
        value: metrics.totalShares,
        percentage: Math.round((metrics.totalShares / total) * 100),
        color: ENGAGEMENT_COLORS.shares,
      },
    ].filter(d => d.value > 0);
  }, [metrics]);

  // Métricas por publicación (para bar chart)
  const postMetrics = useMemo<PostMetrics[]>(() => {
    return myTrendingPosts.slice(0, 4).map((post, index) => ({
      name: `Post ${index + 1}`,
      value: post.likes_count,
      value2: post.comments_count,
    }));
  }, [myTrendingPosts]);

  // Puntuación de tendencia (para line chart)
  const trendScores = useMemo<TrendScorePoint[]>(() => {
    return myTrendingPosts.slice(0, 4).map((post, index) => ({
      name: `#${index + 1}`,
      value: post.score,
      label: `Post ${index + 1}`,
    }));
  }, [myTrendingPosts]);

  // Datos para radar chart (engagement promedio)
  const radarData = useMemo<RadarMetric[]>(() => {
    return [
      { name: 'Me gusta', value: metrics.averageLikes },
      { name: 'Comentarios', value: metrics.averageComments },
      { name: 'Vistas', value: metrics.averageViews },
      { name: 'Compartidos', value: metrics.averageShares },
    ];
  }, [metrics]);

  // Función de refetch
  const handleRefetch = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['trending-analytics'] });
  }, [refetch, queryClient]);

  return {
    period,
    setPeriod,
    myTrendingPosts,
    allTrendingPosts,
    metrics,
    engagementDistribution,
    postMetrics,
    trendScores,
    radarData,
    isLoading,
    isError,
    refetch: handleRefetch,
  };
}
