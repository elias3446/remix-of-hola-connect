import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UseChangeUserEmailOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface ChangeEmailResult {
  success: boolean;
  profile_id: string;
  old_email: string;
  new_email: string;
  new_username: string;
  message: string;
}

/**
 * Hook para que administradores cambien el email de un usuario
 * 
 * Flujo completo:
 * 1. Llama a complete_email_change que:
 *    - Desvincula user_id del perfil (lo pone NULL)
 *    - Actualiza email y username en el perfil
 *    - Elimina el usuario viejo de auth.users
 * 2. Crea un nuevo usuario en auth con el nuevo email
 *    - Pasa existing_profile_id en metadata
 * 3. El trigger handle_new_user detecta existing_profile_id y reconecta el perfil
 */
export function useChangeUserEmail(options: UseChangeUserEmailOptions = {}) {
  const { onSuccess, onError } = options;
  const queryClient = useQueryClient();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changeUserEmail = useCallback(async (
    profileId: string,
    oldEmail: string,
    newEmail: string,
    newPassword: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validaciones básicas
      if (!newEmail || !newEmail.includes('@')) {
        throw new Error('El nuevo email no es válido');
      }

      if (oldEmail === newEmail) {
        throw new Error('El nuevo email debe ser diferente al actual');
      }

      if (!newPassword || newPassword.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
      }

      // PASO 1: Llamar a complete_email_change
      // Esta función:
      // - Desvincula user_id del perfil (NULL)
      // - Actualiza email y username en profiles
      // - Elimina el usuario viejo de auth.users
      const { data: changeResult, error: changeError } = await supabase
        .rpc('complete_email_change', {
          p_profile_id: profileId,
          p_new_email: newEmail
        });

      if (changeError) {
        throw new Error(`Error al preparar cambio de email: ${changeError.message}`);
      }

      const result = changeResult as unknown as ChangeEmailResult;
      
      if (!result?.success) {
        throw new Error('Error al completar el cambio de email');
      }

      // PASO 2: Crear nuevo usuario en auth con el nuevo email
      // Pasamos existing_profile_id para que handle_new_user reconecte el perfil
      const { error: signUpError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            existing_profile_id: profileId,
            signup_source: 'admin_email_change',
            password: newPassword
          }
        }
      });

      if (signUpError) {
        // Si falla la creación del nuevo usuario, el perfil queda desvinculado
        // Esto es un estado parcial que requiere intervención manual
        throw new Error(`Error al crear nuevo usuario: ${signUpError.message}. El perfil quedó desvinculado.`);
      }

      // Invalidar cachés
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['userRolesList'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });

      setSuccess(true);
      toast.success('Email cambiado exitosamente. El usuario debe confirmar el nuevo email.');
      onSuccess?.();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cambiar el email';
      setError(message);
      toast.error(message);
      onError?.(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError, queryClient]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess(false);
  }, []);

  return { changeUserEmail, loading, error, success, clearError, clearSuccess };
}
