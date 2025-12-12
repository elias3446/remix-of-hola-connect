/**
 * Hook para gestionar usuarios silenciados
 * 
 * Funcionalidad:
 * - Silenciar usuarios (no recibir notificaciones)
 * - Des-silenciar usuarios
 * - Verificar si un usuario está silenciado
 * - Los mensajes de usuarios silenciados no cuentan en el badge del sidebar
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface MutedUser {
  id: string;
  silenciado_user_id: string;
  created_at: string;
  user?: {
    id: string;
    name: string | null;
    avatar: string | null;
    username: string | null;
  };
}

interface UseMutedUsersReturn {
  /** Lista de usuarios silenciados */
  mutedUsers: MutedUser[];
  /** Estado de carga */
  isLoading: boolean;
  /** Verificar si un usuario está silenciado */
  isUserMuted: (profileId: string) => boolean;
  /** Silenciar usuario */
  muteUser: (profileId: string) => Promise<boolean>;
  /** Des-silenciar usuario */
  unmuteUser: (profileId: string) => Promise<boolean>;
  /** Toggle silenciar/des-silenciar */
  toggleMute: (profileId: string) => Promise<boolean>;
  /** IDs de usuarios silenciados (para filtros) */
  mutedUserIds: string[];
  /** Refrescar lista */
  refetch: () => void;
}

export function useMutedUsers(): UseMutedUsersReturn {
  const queryClient = useQueryClient();
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  // Obtener profile_id actual
  useEffect(() => {
    const getProfileId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCurrentProfileId(profile.id);
      }
    };

    getProfileId();
  }, []);

  // Query para obtener usuarios silenciados
  const { data: mutedUsers = [], isLoading, refetch } = useQuery({
    queryKey: ['muted-users', currentProfileId],
    queryFn: async (): Promise<MutedUser[]> => {
      if (!currentProfileId) return [];

      const { data, error } = await supabase
        .from('usuarios_silenciados')
        .select(`
          *,
          user:profiles!usuarios_silenciados_silenciado_user_id_fkey(id, name, avatar, username)
        `)
        .eq('user_id', currentProfileId);

      if (error) throw error;
      return (data || []) as MutedUser[];
    },
    enabled: !!currentProfileId,
  });

  // Lista de IDs silenciados
  const mutedUserIds = mutedUsers.map(mu => mu.silenciado_user_id);

  // Verificar si un usuario está silenciado
  const isUserMuted = useCallback((profileId: string): boolean => {
    return mutedUserIds.includes(profileId);
  }, [mutedUserIds]);

  // Mutación para silenciar usuario
  const muteMutation = useMutation({
    mutationFn: async (profileId: string): Promise<boolean> => {
      if (!currentProfileId) return false;

      const { error } = await supabase.from('usuarios_silenciados').insert({
        user_id: currentProfileId,
        silenciado_user_id: profileId,
      });

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muted-users'] });
      toast.success('Usuario silenciado');
    },
    onError: (error) => {
      console.error('Error silenciando usuario:', error);
      toast.error('Error al silenciar usuario');
    },
  });

  // Mutación para des-silenciar usuario
  const unmuteMutation = useMutation({
    mutationFn: async (profileId: string): Promise<boolean> => {
      if (!currentProfileId) return false;

      const { error } = await supabase
        .from('usuarios_silenciados')
        .delete()
        .eq('user_id', currentProfileId)
        .eq('silenciado_user_id', profileId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muted-users'] });
      toast.success('Usuario des-silenciado');
    },
    onError: (error) => {
      console.error('Error des-silenciando usuario:', error);
      toast.error('Error al des-silenciar usuario');
    },
  });

  // Toggle silenciar/des-silenciar
  const toggleMute = useCallback(async (profileId: string): Promise<boolean> => {
    if (isUserMuted(profileId)) {
      return unmuteMutation.mutateAsync(profileId);
    } else {
      return muteMutation.mutateAsync(profileId);
    }
  }, [isUserMuted, muteMutation, unmuteMutation]);

  return {
    mutedUsers,
    isLoading,
    isUserMuted,
    muteUser: muteMutation.mutateAsync,
    unmuteUser: unmuteMutation.mutateAsync,
    toggleMute,
    mutedUserIds,
    refetch,
  };
}
