/**
 * Hook para obtener el perfil de un usuario por username o id
 * Usado para ver perfiles de otros usuarios en la red social
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface UserProfileData extends Profile {
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

interface UseUserProfileOptions {
  username?: string | null;
  userId?: string | null;
  enabled?: boolean;
}

/**
 * Obtener perfil de usuario por username o id
 */
export function useUserProfile(options: UseUserProfileOptions = {}) {
  const { username, userId, enabled = true } = options;
  const identifier = username || userId;

  return useQuery({
    queryKey: ['user-profile', identifier],
    queryFn: async (): Promise<UserProfileData | null> => {
      if (!identifier) return null;

      // Construir query según el tipo de identificador
      let query = supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null);

      if (username) {
        query = query.eq('username', username);
      } else if (userId) {
        query = query.eq('id', userId);
      }

      const { data: profile, error } = await query.single();

      if (error || !profile) {
        console.error('[useUserProfile] Error:', error);
        return null;
      }

      // Obtener estadísticas en paralelo
      const [postsRes, followersRes, followingRes] = await Promise.all([
        // Posts
        supabase
          .from('publicaciones')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('activo', true)
          .is('deleted_at', null),
        // Seguidores
        supabase
          .from('relaciones')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('tipo', 'seguidor')
          .eq('estado', 'aceptado'),
        // Siguiendo
        supabase
          .from('relaciones')
          .select('id', { count: 'exact', head: true })
          .eq('seguidor_id', profile.id)
          .eq('tipo', 'seguidor')
          .eq('estado', 'aceptado'),
      ]);

      return {
        ...profile,
        postsCount: postsRes.count || 0,
        followersCount: followersRes.count || 0,
        followingCount: followingRes.count || 0,
      };
    },
    enabled: enabled && !!identifier,
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Obtener lista de seguidores de un usuario
 */
export function useUserFollowers(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['user-followers', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('relaciones')
        .select(`
          id,
          created_at,
          follower:profiles!relaciones_seguidor_id_fkey(
            id,
            name,
            username,
            avatar,
            bio
          )
        `)
        .eq('user_id', userId)
        .eq('tipo', 'seguidor')
        .eq('estado', 'aceptado')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useUserFollowers] Error:', error);
        return [];
      }

      return data.map(r => ({
        id: r.id,
        created_at: r.created_at,
        ...(Array.isArray(r.follower) ? r.follower[0] : r.follower),
      })).filter(Boolean);
    },
    enabled: enabled && !!userId,
    staleTime: 60000,
  });
}

/**
 * Obtener lista de usuarios que sigue
 */
export function useUserFollowing(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['user-following', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('relaciones')
        .select(`
          id,
          created_at,
          following:profiles!relaciones_user_id_fkey(
            id,
            name,
            username,
            avatar,
            bio
          )
        `)
        .eq('seguidor_id', userId)
        .eq('tipo', 'seguidor')
        .eq('estado', 'aceptado')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useUserFollowing] Error:', error);
        return [];
      }

      return data.map(r => ({
        id: r.id,
        created_at: r.created_at,
        ...(Array.isArray(r.following) ? r.following[0] : r.following),
      })).filter(Boolean);
    },
    enabled: enabled && !!userId,
    staleTime: 60000,
  });
}
