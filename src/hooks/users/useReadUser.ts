import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export function useReadUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserById = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: user, error: readError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (readError) throw readError;

      return { user, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener usuario';
      setError(message);
      return { user: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  const getUserByEmail = async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: user, error: readError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .is('deleted_at', null)
        .single();

      if (readError) throw readError;

      return { user, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener usuario';
      setError(message);
      return { user: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  const getAllUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: users, error: readError } = await supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (readError) throw readError;

      return { users, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener usuarios';
      setError(message);
      return { users: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  return { getUserById, getUserByEmail, getAllUsers, loading, error };
}
