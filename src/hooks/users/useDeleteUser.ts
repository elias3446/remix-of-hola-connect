import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useDeleteUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deleteUser = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: user, error: deleteError } = await supabase
        .from('profiles')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (deleteError) throw deleteError;

      // Invalidar caché de usuarios y roles para refrescar la tabla
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['userRolesList'] });

      return { user, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar usuario';
      setError(message);
      return { user: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  const restoreUser = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: user, error: restoreError } = await supabase
        .from('profiles')
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (restoreError) throw restoreError;

      // Invalidar caché de usuarios y roles para refrescar la tabla
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['userRolesList'] });

      return { user, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al restaurar usuario';
      setError(message);
      return { user: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  return { deleteUser, restoreUser, loading, error };
}
