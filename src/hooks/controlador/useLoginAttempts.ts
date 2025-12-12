import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

interface LockoutStatus {
  is_locked: boolean;
  remaining_ms: number;
  attempts_left: number;
  attempt_count?: number;
}

interface BlockStatus {
  is_blocked: boolean;
  reason?: string;
  is_permanent?: boolean;
}

export function useLoginAttempts() {
  // Verificar si el usuario está bloqueado permanentemente en user_blocks
  const checkUserBlock = useCallback(async (email: string): Promise<BlockStatus | null> => {
    try {
      const { data, error } = await supabase.rpc('check_user_block', {
        p_email: email
      });

      if (error) {
        console.error('Error checking user block:', error);
        return null;
      }

      return data as unknown as BlockStatus;
    } catch (err) {
      console.error('Error in checkUserBlock:', err);
      return null;
    }
  }, []);

  // Verificar si el usuario está bloqueado temporalmente por intentos fallidos
  const checkLockout = useCallback(async (email: string): Promise<LockoutStatus | null> => {
    try {
      const { data, error } = await supabase.rpc('check_login_lockout', {
        p_email: email
      });

      if (error) {
        console.error('Error checking lockout:', error);
        return null;
      }

      return data as unknown as LockoutStatus;
    } catch (err) {
      console.error('Error in checkLockout:', err);
      return null;
    }
  }, []);

  // Registrar intento fallido
  const recordFailedAttempt = useCallback(async (email: string): Promise<LockoutStatus | null> => {
    try {
      const { data, error } = await supabase.rpc('record_failed_login', {
        p_email: email
      });

      if (error) {
        console.error('Error recording failed login:', error);
        return null;
      }

      return data as unknown as LockoutStatus;
    } catch (err) {
      console.error('Error in recordFailedAttempt:', err);
      return null;
    }
  }, []);

  // Limpiar intentos tras login exitoso
  const resetAttempts = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('reset_login_attempts', {
        p_email: email
      });

      if (error) {
        console.error('Error resetting login attempts:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in resetAttempts:', err);
      return false;
    }
  }, []);

  // Formatear tiempo restante de bloqueo
  const formatRemainingTime = useCallback((ms: number): string => {
    const minutes = Math.ceil(ms / 60000);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes} minutos`;
  }, []);

  return {
    checkUserBlock,
    checkLockout,
    recordFailedAttempt,
    resetAttempts,
    formatRemainingTime
  };
}
