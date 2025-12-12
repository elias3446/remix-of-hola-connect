import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';

interface UseChangePasswordOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useChangePassword(options: UseChangePasswordOptions = {}) {
  const { onSuccess, onError } = options;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePassword = useCallback(async (
    currentPassword: string | null,
    newPassword: string, 
    confirmPassword: string
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      const message = 'Las contraseñas no coinciden';
      setError(message);
      onError?.(message);
      setLoading(false);
      return { error: message };
    }

    // Validar requisitos mínimos de contraseña
    if (newPassword.length < 8) {
      const message = 'La contraseña debe tener al menos 8 caracteres';
      setError(message);
      onError?.(message);
      setLoading(false);
      return { error: message };
    }

    try {
      // Verificar contraseña actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error('No se pudo obtener el usuario actual');
      }

      // Verificar contraseña actual (solo si se proporciona)
      if (currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInError) {
          throw new Error('La contraseña actual es incorrecta');
        }
      }

      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Actualizar el flag en profiles si existe
      await supabase
        .from('profiles')
        .update({ 
          must_change_password: false,
          temp_password_used: false 
        })
        .eq('user_id', user.id);

      setSuccess(true);
      onSuccess?.();
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cambiar la contraseña';
      setError(message);
      onError?.(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess(false);
  }, []);

  return { changePassword, loading, error, success, clearError, clearSuccess };
}
