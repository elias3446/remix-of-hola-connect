import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditLog } from './useAuditLog';
import { useLoginAttempts } from './useLoginAttempts';
import { useInitializeUserData } from '@/hooks/entidades';

interface SignInData {
  email: string;
  password: string;
}

interface SignInResult {
  user: any;
  session: any;
  error: string | null;
  mustChangePassword: boolean;
  changePasswordReason: string | null;
}

interface UseSignInOptions {
  redirectTo?: string;
  passwordChangeRedirectTo?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onMustChangePassword?: (reason: string) => void;
}

export function useSignIn(options: UseSignInOptions = {}) {
  const { redirectTo = '/bienvenida', passwordChangeRedirectTo = '/change-password', onSuccess, onError, onMustChangePassword } = options;
  const navigate = useNavigate();
  const { auditLogin } = useAuditLog();
  const { checkUserBlock, checkLockout, recordFailedAttempt, resetAttempts, formatRemainingTime } = useLoginAttempts();
  const { initializeUserData } = useInitializeUserData();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const signIn = useCallback(async (data: SignInData): Promise<SignInResult> => {
    setLoading(true);
    setError(null);
    setMustChangePassword(false);

    try {
      // Verificar si el usuario está bloqueado permanentemente
      const blockStatus = await checkUserBlock(data.email);
      if (blockStatus?.is_blocked) {
        const reason = blockStatus.reason || 'Contacta al administrador para más información';
        const message = `Tu cuenta ha sido bloqueada. ${reason}`;
        setError(message);
        onError?.(message);
        return { user: null, session: null, error: message, mustChangePassword: false, changePasswordReason: null };
      }

      // Verificar si el usuario está bloqueado temporalmente por intentos fallidos
      const lockoutStatus = await checkLockout(data.email);
      if (lockoutStatus?.is_locked) {
        const timeRemaining = formatRemainingTime(lockoutStatus.remaining_ms);
        const message = `Cuenta bloqueada temporalmente. Intenta de nuevo en ${timeRemaining}`;
        setError(message);
        onError?.(message);
        return { user: null, session: null, error: message, mustChangePassword: false, changePasswordReason: null };
      }

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        // Registrar intento fallido
        const attemptResult = await recordFailedAttempt(data.email);
        
        let message = signInError.message;
        if (attemptResult) {
          if (attemptResult.is_locked) {
            const timeRemaining = formatRemainingTime(attemptResult.remaining_ms);
            message = `Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en ${timeRemaining}`;
          } else if (attemptResult.attempts_left > 0) {
            message = `${signInError.message}. Intentos restantes: ${attemptResult.attempts_left}`;
          }
        }
        
        throw new Error(message);
      }

      // Login exitoso: limpiar intentos fallidos
      await resetAttempts(data.email);

      // Registrar login en user_audit y pre-cargar datos del usuario
      if (authData.user) {
        // Inicializar datos del usuario en caché (profile, settings, roles)
        // Se ejecuta en paralelo con el audit para no bloquear
        const [, auditResult] = await Promise.allSettled([
          initializeUserData(authData.user.id),
          auditLogin({
            authUserId: authData.user.id,
            email: authData.user.email,
            sessionId: authData.session?.access_token?.slice(-10)
          })
        ]);

        // Verificar si el usuario debe cambiar su contraseña
        const { data: passwordCheck, error: passwordCheckError } = await supabase.rpc(
          'check_must_change_password',
          { p_user_id: authData.user.id }
        );

        const checkResult = passwordCheck as { must_change?: boolean; reason?: string } | null;
        if (!passwordCheckError && checkResult?.must_change) {
          setMustChangePassword(true);
          onMustChangePassword?.(checkResult.reason || 'mandatory_change');
          navigate(passwordChangeRedirectTo);
          return { 
            user: authData.user, 
            session: authData.session, 
            error: null, 
            mustChangePassword: true, 
            changePasswordReason: checkResult.reason || null 
          };
        }
      }

      // Callback de éxito
      onSuccess?.();
      
      // Redirección automática al dashboard
      navigate(redirectTo);

      return { user: authData.user, session: authData.session, error: null, mustChangePassword: false, changePasswordReason: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      onError?.(message);
      return { user: null, session: null, error: message, mustChangePassword: false, changePasswordReason: null };
    } finally {
      setLoading(false);
    }
  }, [navigate, redirectTo, passwordChangeRedirectTo, onSuccess, onError, onMustChangePassword, auditLogin, checkUserBlock, checkLockout, recordFailedAttempt, resetAttempts, formatRemainingTime, initializeUserData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { signIn, loading, error, mustChangePassword, clearError };
}
