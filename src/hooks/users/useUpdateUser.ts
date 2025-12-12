import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UpdateUserData {
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  estado?: 'activo' | 'bloqueado' | 'eliminado' | 'inactivo';
}

// Keys para localStorage (compartidas con useUserDataReady)
const STORAGE_KEYS = {
  profile: 'user_cache:profile',
  timestamp: 'user_cache:timestamp',
} as const;

/**
 * Actualiza el perfil en localStorage
 */
function updateStoredProfile(updatedProfile: Record<string, unknown>): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.profile);
    if (stored) {
      const currentProfile = JSON.parse(stored);
      const newProfile = { ...currentProfile, ...updatedProfile };
      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(newProfile));
      localStorage.setItem(STORAGE_KEYS.timestamp, JSON.stringify(Date.now()));
    }
  } catch (error) {
    console.warn('Error updating localStorage profile:', error);
  }
}

export function useUpdateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updateUser = async (id: string, data: UpdateUserData) => {
    setLoading(true);
    setError(null);

    try {
      const { data: user, error: updateError } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (updateError) throw updateError;

      // Obtener el auth user id para invalidar el caché correcto
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser?.id) {
        // Actualizar el caché de React Query del perfil actual
        queryClient.setQueryData(['profile', authUser.id], user);
        
        // Actualizar localStorage
        updateStoredProfile(user);
      }

      // Invalidar caché de usuarios y roles para refrescar la tabla
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['userRolesList'] });

      return { user, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar usuario';
      setError(message);
      return { user: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  return { updateUser, loading, error };
}
