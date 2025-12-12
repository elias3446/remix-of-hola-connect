/**
 * Hook para gestionar suscripciones a hashtags
 * Permite seguir/dejar de seguir tendencias
 */
import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';

export interface HashtagSubscription {
  id: string;
  hashtag_id: string;
  user_id: string;
  created_at: string;
  hashtag?: {
    id: string;
    nombre: string;
    uso_count: number | null;
  };
}

interface UseHashtagSubscriptionOptions {
  userId?: string | null;
  enabled?: boolean;
  realtime?: boolean;
}

export function useHashtagSubscription(options: UseHashtagSubscriptionOptions = {}) {
  const { userId: providedUserId, enabled = true, realtime = true } = options;
  const queryClient = useQueryClient();
  
  // Si no se proporciona userId, obtenerlo del contexto de auth
  const { user } = useAuth();
  const { data: profile } = useOptimizedProfile(user?.id);
  const userId = providedUserId ?? profile?.id ?? null;

  // Obtener suscripciones del usuario
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['hashtag-subscriptions', userId],
    queryFn: async (): Promise<HashtagSubscription[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_hashtag_follows')
        .select(`
          id,
          hashtag_id,
          user_id,
          created_at,
          hashtag:hashtags(id, nombre, uso_count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        hashtag: Array.isArray(item.hashtag) ? item.hashtag[0] : item.hashtag,
      }));
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Suscripción realtime
  useEffect(() => {
    if (!realtime || !userId) return;

    const channel = supabase
      .channel(`hashtag-subs-${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_hashtag_follows',
          filter: `user_id=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['hashtag-subscriptions', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtime, userId, queryClient]);

  // Seguir hashtag
  const followMutation = useMutation({
    mutationFn: async (hashtagId: string) => {
      if (!userId) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('user_hashtag_follows')
        .insert({
          user_id: userId,
          hashtag_id: hashtagId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hashtag-subscriptions'] });
      toast.success('Ahora sigues esta tendencia');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.info('Ya sigues esta tendencia');
      } else {
        toast.error('Error al seguir tendencia');
      }
    },
  });

  // Dejar de seguir hashtag
  const unfollowMutation = useMutation({
    mutationFn: async (hashtagId: string) => {
      if (!userId) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('user_hashtag_follows')
        .delete()
        .eq('user_id', userId)
        .eq('hashtag_id', hashtagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hashtag-subscriptions'] });
      toast.success('Dejaste de seguir esta tendencia');
    },
    onError: () => {
      toast.error('Error al dejar de seguir');
    },
  });

  // Verificar si sigue un hashtag
  const isFollowing = useCallback((hashtagId: string): boolean => {
    return subscriptions?.some(s => s.hashtag_id === hashtagId) || false;
  }, [subscriptions]);

  // Toggle seguir/dejar de seguir
  const toggleFollow = useCallback(async (hashtagId: string) => {
    if (isFollowing(hashtagId)) {
      await unfollowMutation.mutateAsync(hashtagId);
    } else {
      await followMutation.mutateAsync(hashtagId);
    }
  }, [isFollowing, followMutation, unfollowMutation]);

  return {
    subscriptions: subscriptions || [],
    isLoading,
    isFollowing,
    followHashtag: followMutation.mutate,
    unfollowHashtag: unfollowMutation.mutate,
    toggleFollow,
    isToggling: followMutation.isPending || unfollowMutation.isPending,
  };
}
