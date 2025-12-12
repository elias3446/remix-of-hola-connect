import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';

interface UseChangeUserPasswordOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook para cambio de contraseña de usuarios
 * 
 * Flujo Normal (propio usuario):
 * 1. Validar contraseña actual
 * 2. Actualizar contraseña
 * 
 * Cambio Forzado (Admin):
 * El admin crea una nueva contraseña temporal y el usuario debe cambiarla
 * usando el flujo de cambio de email (que incluye nueva contraseña)
 */
export function useChangeUserPassword(options: UseChangeUserPasswordOptions = {}) {
  const { onSuccess, onError } = options;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Cambiar contraseña del usuario actual (propio perfil)
   */
  const changeOwnPassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validaciones
    if (newPassword !== confirmPassword) {
      const message = 'Las contraseñas no coinciden';
      setError(message);
      onError?.(message);
      setLoading(false);
      return { error: message };
    }

    if (newPassword.length < 8) {
      const message = 'La contraseña debe tener al menos 8 caracteres';
      setError(message);
      onError?.(message);
      setLoading(false);
      return { error: message };
    }

    try {
      // Verificar contraseña actual intentando re-autenticar
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error('No se pudo obtener el usuario actual');
      }

      // Verificar contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('La contraseña actual es incorrecta');
      }

      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Actualizar flags en profiles
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

  /**
   * Marcar que el usuario debe cambiar contraseña
   * (usado cuando admin resetea acceso)
   */
  const forcePasswordChange = useCallback(async (profileId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          must_change_password: true,
          temp_password_used: true 
        })
        .eq('id', profileId);

      if (updateError) throw updateError;

      setSuccess(true);
      onSuccess?.();
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al marcar cambio de contraseña';
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

  return { 
    changeOwnPassword,
    forcePasswordChange,
    loading, 
    error, 
    success, 
    clearError, 
    clearSuccess 
  };
}
