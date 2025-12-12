import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ResendResult {
  email: string;
  success: boolean;
  error?: string;
}

interface UseBulkResendConfirmationOptions {
  onSuccess?: (results: ResendResult[]) => void;
  onError?: (error: string) => void;
}

/**
 * Hook para reenvío masivo de confirmación de email
 * Permite reenviar emails de confirmación a múltiples usuarios no confirmados
 */
export function useBulkResendConfirmation(options: UseBulkResendConfirmationOptions = {}) {
  const { onSuccess, onError } = options;
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ResendResult[]>([]);

  /**
   * Reenvía confirmación a un solo email (interno)
   */
  const resendSingleInternal = async (email: string): Promise<ResendResult> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        return { email, success: false, error: error.message };
      }

      return { email, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      return { email, success: false, error: message };
    }
  };

  /**
   * Reenvía confirmación a un solo usuario (público)
   */
  const resendSingle = useCallback(async (email: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      const result = await resendSingleInternal(email);
      
      if (result.success) {
        toast.success(`Email de confirmación enviado a ${email}`);
        return true;
      } else {
        toast.error(result.error || 'Error al enviar email');
        onError?.(result.error || 'Error al enviar email');
        return false;
      }
    } finally {
      setLoading(false);
    }
  }, [onError]);

  /**
   * Reenvía confirmación a múltiples emails
   */
  const resendBulk = useCallback(async (emails: string[]): Promise<ResendResult[]> => {
    if (emails.length === 0) {
      toast.warning('No hay usuarios seleccionados para reenviar confirmación');
      return [];
    }

    setLoading(true);
    setProgress(0);
    setResults([]);

    const allResults: ResendResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Procesar en lotes de 5 para evitar rate limiting
    const batchSize = 5;
    const batches = Math.ceil(emails.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min((i + 1) * batchSize, emails.length);
      const batchEmails = emails.slice(batchStart, batchEnd);

      // Procesar lote en paralelo
      const batchResults = await Promise.all(
        batchEmails.map(email => resendSingleInternal(email))
      );

      allResults.push(...batchResults);

      // Actualizar contadores
      batchResults.forEach(result => {
        if (result.success) successCount++;
        else errorCount++;
      });

      // Actualizar progreso
      setProgress(Math.round((batchEnd / emails.length) * 100));
      setResults([...allResults]);

      // Pausa entre lotes para evitar rate limiting (excepto en el último)
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setLoading(false);

    // Mostrar resultado
    if (errorCount === 0) {
      toast.success(`Se enviaron ${successCount} emails de confirmación`);
    } else if (successCount === 0) {
      toast.error(`Error al enviar todos los emails (${errorCount} errores)`);
      onError?.(`Todos los envíos fallaron: ${errorCount} errores`);
    } else {
      toast.warning(`Enviados: ${successCount}, Errores: ${errorCount}`);
    }

    onSuccess?.(allResults);
    return allResults;
  }, [onSuccess, onError]);

  /**
   * Reenvía confirmación a todos los usuarios no confirmados
   */
  const resendToAllUnconfirmed = useCallback(async (): Promise<ResendResult[]> => {
    setLoading(true);

    try {
      // Obtener todos los usuarios no confirmados
      const { data: unconfirmedUsers, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('confirmed', false)
        .is('deleted_at', null)
        .not('email', 'is', null);

      if (error) {
        throw new Error(`Error al obtener usuarios: ${error.message}`);
      }

      if (!unconfirmedUsers || unconfirmedUsers.length === 0) {
        toast.info('No hay usuarios pendientes de confirmación');
        setLoading(false);
        return [];
      }

      const emails = unconfirmedUsers
        .map(u => u.email)
        .filter((email): email is string => email !== null);

      toast.info(`Procesando ${emails.length} usuarios no confirmados...`);

      return await resendBulk(emails);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(message);
      onError?.(message);
      setLoading(false);
      return [];
    }
  }, [resendBulk, onError]);

  const reset = useCallback(() => {
    setProgress(0);
    setResults([]);
  }, []);

  return {
    resendSingle,
    resendBulk,
    resendToAllUnconfirmed,
    loading,
    progress,
    results,
    reset
  };
}
