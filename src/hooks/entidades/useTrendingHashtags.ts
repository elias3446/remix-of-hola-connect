/**
 * Hook para obtener hashtags en tendencia
 * Filtrable por período: 24h, 7d, 30d, todos
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TrendingPeriod = '24h' | '7d' | '30d' | 'all';

export interface TrendingHashtag {
  id: string;
  nombre: string;
  uso_count: number;
  publicaciones_count: number;
}

interface UseTrendingHashtagsOptions {
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

export function useTrendingHashtags(options: UseTrendingHashtagsOptions = {}) {
  const { limit = 10, enabled = true } = options;
  const [period, setPeriod] = useState<TrendingPeriod>('7d');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trending-hashtags', period, limit],
    queryFn: async (): Promise<TrendingHashtag[]> => {
      const periodDate = getPeriodDate(period);

      if (periodDate) {
        // Obtener hashtags usados en publicaciones del período
        const { data: hashtagLinks, error: linksError } = await supabase
          .from('publicacion_hashtags')
          .select(`
            hashtag_id,
            hashtags!inner(id, nombre, uso_count),
            publicaciones!inner(id, created_at)
          `)
          .gte('publicaciones.created_at', periodDate.toISOString());

        if (linksError) throw linksError;

        // Contar uso por hashtag en el período
        const hashtagCounts = new Map<string, { hashtag: any; count: number }>();
        
        hashtagLinks?.forEach((link: any) => {
          const hashtagId = link.hashtag_id;
          const hashtag = link.hashtags;
          
          if (hashtagCounts.has(hashtagId)) {
            hashtagCounts.get(hashtagId)!.count++;
          } else {
            hashtagCounts.set(hashtagId, { hashtag, count: 1 });
          }
        });

        // Ordenar por conteo y limitar
        const sorted = Array.from(hashtagCounts.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, limit)
          .map(([_, value]) => ({
            id: value.hashtag.id,
            nombre: value.hashtag.nombre,
            uso_count: value.hashtag.uso_count || 0,
            publicaciones_count: value.count,
          }));

        return sorted;
      } else {
        // Si es "all", usar el conteo total de la tabla hashtags
        const { data: hashtags, error } = await supabase
          .from('hashtags')
          .select('id, nombre, uso_count')
          .order('uso_count', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return (hashtags || []).map(h => ({
          id: h.id,
          nombre: h.nombre,
          uso_count: h.uso_count || 0,
          publicaciones_count: h.uso_count || 0,
        }));
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const changePeriod = useCallback((newPeriod: TrendingPeriod) => {
    setPeriod(newPeriod);
  }, []);

  return {
    hashtags: data || [],
    isLoading,
    period,
    changePeriod,
    refetch,
  };
}
