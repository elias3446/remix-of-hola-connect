import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';

interface UseResetPasswordOptions {
  redirectTo?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useResetPassword(options: UseResetPasswordOptions = {}) {
  const { redirectTo, onSuccess, onError } = options;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Verificar si el email existe en auth.users
      const { data: exists, error: checkError } = await supabase.rpc('check_user_exists_in_auth', {
        p_email: normalizedEmail
      });

      if (checkError) throw checkError;

      if (!exists) {
        throw new Error('No existe una cuenta registrada con este correo electrónico');
      }

      // Verificar si el usuario está bloqueado permanentemente
      const { data: blockData } = await supabase.rpc('check_user_block', {
        p_email: normalizedEmail
      });

      const block = blockData as { is_blocked?: boolean; reason?: string } | null;
      if (block?.is_blocked) {
        const reason = block.reason || 'Contacta al administrador para más información';
        throw new Error(`Tu cuenta ha sido bloqueada. ${reason}`);
      }

      // Verificar si hay bloqueo temporal por intentos fallidos
      const { data: lockoutData } = await supabase.rpc('check_login_lockout', {
        p_email: normalizedEmail
      });

      const lockout = lockoutData as { is_locked?: boolean; remaining_ms?: number } | null;
      if (lockout?.is_locked) {
        const remainingMs = lockout.remaining_ms || 0;
        const minutes = Math.ceil(remainingMs / 60000);
        throw new Error(`Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ${minutes} minuto${minutes > 1 ? 's' : ''}`);
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess(true);
      onSuccess?.();
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar el correo de recuperación';
      setError(message);
      onError?.(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [redirectTo, onSuccess, onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess(false);
  }, []);

  return { resetPassword, loading, error, success, clearError, clearSuccess };
}
