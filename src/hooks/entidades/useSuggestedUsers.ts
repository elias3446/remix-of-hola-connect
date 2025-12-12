/**
 * Hook para obtener usuarios sugeridos
 * 
 * ALGORITMO DE RECOMENDACIÓN:
 * El algoritmo utiliza múltiples factores ponderados para recomendar usuarios relevantes:
 * 
 * 1. CONEXIONES MUTUAS (40% del peso)
 *    - Usuarios seguidos por personas que tú sigues (amigos de amigos)
 *    - Mayor peso cuantas más conexiones mutuas compartan
 * 
 * 2. INTERACCIONES SIMILARES (30% del peso)
 *    - Usuarios que han interactuado con las mismas publicaciones que tú
 *    - Incluye likes, comentarios y compartidos en posts comunes
 * 
 * 3. POPULARIDAD (20% del peso)
 *    - Usuarios con más seguidores activos
 *    - Se normaliza para evitar sesgo hacia cuentas muy populares
 * 
 * 4. ACTIVIDAD RECIENTE (10% del peso)
 *    - Usuarios que han publicado recientemente
 *    - Prioriza cuentas activas sobre cuentas inactivas
 * 
 * EXCLUSIONES:
 * - El propio usuario
 * - Usuarios que ya sigues
 * - Usuarios bloqueados o que te han bloqueado
 * - Usuarios eliminados o inactivos
 */
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SuggestedUser {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  isFollowing: boolean;
  /** Número de conexiones mutuas */
  mutualConnections: number;
  /** Puntuación de relevancia (0-100) */
  relevanceScore: number;
  /** Razón de la sugerencia */
  suggestionReason: 'mutual_friends' | 'similar_interests' | 'popular' | 'active' | 'new_user';
}

interface UseSuggestedUsersOptions {
  userId?: string | null;
  limit?: number;
  enabled?: boolean;
}

export function useSuggestedUsers(options: UseSuggestedUsersOptions = {}) {
  const { userId, limit = 5, enabled = true } = options;
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['suggested-users', userId, limit],
    queryFn: async (): Promise<SuggestedUser[]> => {
      if (!userId) return [];

      // 1. Obtener IDs de usuarios que ya sigo
      const { data: following } = await supabase
        .from('relaciones')
        .select('user_id')
        .eq('seguidor_id', userId)
        .eq('tipo', 'seguidor')
        .eq('estado', 'aceptado');

      const followingIds = following?.map(f => f.user_id).filter(Boolean) as string[] || [];
      
      // 2. Obtener usuarios bloqueados (desde usuarios_silenciados)
      const { data: muted } = await supabase
        .from('usuarios_silenciados')
        .select('silenciado_user_id')
        .eq('user_id', userId);

      const { data: mutedByOthers } = await supabase
        .from('usuarios_silenciados')
        .select('user_id')
        .eq('silenciado_user_id', userId);

      const blockedIds = [
        ...(muted?.map(m => m.silenciado_user_id) || []),
        ...(mutedByOthers?.map(m => m.user_id) || []),
      ].filter(Boolean) as string[];

      // IDs a excluir
      const excludeIds = [...new Set([...followingIds, ...blockedIds, userId])];

      // 3. Obtener amigos de amigos (conexiones mutuas)
      const { data: friendsOfFriends } = await supabase
        .from('relaciones')
        .select('user_id')
        .in('seguidor_id', followingIds)
        .eq('tipo', 'seguidor')
        .eq('estado', 'aceptado')
        .not('user_id', 'in', `(${excludeIds.join(',')})`);

      // Contar conexiones mutuas por usuario
      const mutualConnectionsCount: Record<string, number> = {};
      friendsOfFriends?.forEach(f => {
        if (f.user_id) {
          mutualConnectionsCount[f.user_id] = (mutualConnectionsCount[f.user_id] || 0) + 1;
        }
      });

      // 4. Obtener publicaciones con las que he interactuado
      const { data: myInteractions } = await supabase
        .from('interacciones')
        .select('publicacion_id')
        .eq('user_id', userId)
        .limit(100);

      const myPostIds = myInteractions?.map(i => i.publicacion_id).filter(Boolean) as string[] || [];

      // 5. Usuarios que interactuaron con las mismas publicaciones
      const similarInterestsCount: Record<string, number> = {};
      if (myPostIds.length > 0) {
        const { data: similarUsers } = await supabase
          .from('interacciones')
          .select('user_id')
          .in('publicacion_id', myPostIds)
          .not('user_id', 'eq', userId)
          .limit(200);

        similarUsers?.forEach(s => {
          if (s.user_id && !excludeIds.includes(s.user_id)) {
            similarInterestsCount[s.user_id] = (similarInterestsCount[s.user_id] || 0) + 1;
          }
        });
      }

      // 6. Obtener conteo de seguidores por usuario (popularidad)
      const { data: followerCounts } = await supabase
        .from('relaciones')
        .select('user_id')
        .eq('tipo', 'seguidor')
        .eq('estado', 'aceptado');

      const popularityCount: Record<string, number> = {};
      followerCounts?.forEach(f => {
        if (f.user_id) {
          popularityCount[f.user_id] = (popularityCount[f.user_id] || 0) + 1;
        }
      });

      // 7. Obtener usuarios candidatos
      const candidateIds = [
        ...Object.keys(mutualConnectionsCount),
        ...Object.keys(similarInterestsCount),
      ].filter(id => !excludeIds.includes(id));

      // Si no hay candidatos por conexiones, buscar usuarios populares/activos
      let finalCandidateIds = [...new Set(candidateIds)];
      
      if (finalCandidateIds.length < limit) {
        // Buscar usuarios con actividad reciente
        const { data: recentUsers } = await supabase
          .from('publicaciones')
          .select('user_id')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .eq('activo', true)
          .not('user_id', 'in', `(${excludeIds.join(',')})`)
          .limit(20);

        const recentUserIds = recentUsers?.map(p => p.user_id).filter(Boolean) as string[] || [];
        finalCandidateIds = [...new Set([...finalCandidateIds, ...recentUserIds])];
      }

      if (finalCandidateIds.length === 0) return [];

      // 8. Obtener perfiles de los candidatos
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar, bio, created_at')
        .in('id', finalCandidateIds)
        .is('deleted_at', null)
        .eq('estado', 'activo');

      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      // 9. Calcular puntuación de relevancia
      const maxMutual = Math.max(1, ...Object.values(mutualConnectionsCount));
      const maxSimilar = Math.max(1, ...Object.values(similarInterestsCount));
      const maxPopularity = Math.max(1, ...Object.values(popularityCount));

      const scoredUsers = profiles.map(profile => {
        const mutual = mutualConnectionsCount[profile.id] || 0;
        const similar = similarInterestsCount[profile.id] || 0;
        const popularity = popularityCount[profile.id] || 0;
        const isNew = new Date(profile.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000;

        // Ponderación de factores
        const mutualScore = (mutual / maxMutual) * 40;
        const similarScore = (similar / maxSimilar) * 30;
        const popularityScore = (popularity / maxPopularity) * 20;
        const activityScore = isNew ? 10 : 5;

        const totalScore = mutualScore + similarScore + popularityScore + activityScore;

        // Determinar razón principal de la sugerencia
        let reason: SuggestedUser['suggestionReason'] = 'active';
        if (mutual > 0) reason = 'mutual_friends';
        else if (similar > 0) reason = 'similar_interests';
        else if (popularity > 5) reason = 'popular';
        else if (isNew) reason = 'new_user';

        return {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          avatar: profile.avatar,
          bio: profile.bio,
          isFollowing: false,
          mutualConnections: mutual,
          relevanceScore: Math.round(totalScore),
          suggestionReason: reason,
        };
      });

      // 10. Ordenar por puntuación y limitar
      return scoredUsers
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Mutación para seguir/dejar de seguir
  const followMutation = useMutation({
    mutationFn: async ({ targetUserId, action }: { targetUserId: string; action: 'follow' | 'unfollow' }) => {
      if (!userId) throw new Error('No user ID');

      if (action === 'follow') {
        const { error } = await supabase
          .from('relaciones')
          .insert({
            user_id: targetUserId,
            seguidor_id: userId,
            tipo: 'seguidor',
            estado: 'aceptado',
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('relaciones')
          .delete()
          .eq('user_id', targetUserId)
          .eq('seguidor_id', userId)
          .eq('tipo', 'seguidor');

        if (error) throw error;
      }
    },
    onMutate: async ({ targetUserId, action }) => {
      await queryClient.cancelQueries({ queryKey: ['suggested-users', userId, limit] });
      
      const previousData = queryClient.getQueryData<SuggestedUser[]>(['suggested-users', userId, limit]);
      
      if (previousData && action === 'follow') {
        queryClient.setQueryData<SuggestedUser[]>(
          ['suggested-users', userId, limit],
          previousData.filter(u => u.id !== targetUserId)
        );
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['suggested-users', userId, limit], context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-relations'] });
    },
  });

  const followUser = useCallback(async (targetUserId: string) => {
    await followMutation.mutateAsync({ targetUserId, action: 'follow' });
  }, [followMutation]);

  const unfollowUser = useCallback(async (targetUserId: string) => {
    await followMutation.mutateAsync({ targetUserId, action: 'unfollow' });
  }, [followMutation]);

  return {
    users: data || [],
    isLoading,
    isEmpty: !isLoading && (!data || data.length === 0),
    followUser,
    unfollowUser,
    isFollowing: followMutation.isPending,
    refetch,
  };
}
