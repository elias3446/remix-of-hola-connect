import { z } from 'zod';
import { useState, useMemo } from 'react';

const emailSchema = z.string().email('Correo electrónico inválido');

interface UseValidateEmailReturn {
  isValid: boolean;
  error: string | null;
  validate: (email: string) => boolean;
}

export function useValidateEmail(email: string): UseValidateEmailReturn {
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(() => {
    if (email.length === 0) {
      setError(null);
      return false;
    }
    
    const result = emailSchema.safeParse(email);
    if (result.success) {
      setError(null);
      return true;
    } else {
      setError(result.error.errors[0]?.message || 'Correo electrónico inválido');
      return false;
    }
  }, [email]);

  const validate = (emailToValidate: string): boolean => {
    const result = emailSchema.safeParse(emailToValidate);
    if (result.success) {
      setError(null);
      return true;
    } else {
      setError(result.error.errors[0]?.message || 'Correo electrónico inválido');
      return false;
    }
  };

  return { isValid, error, validate };
}
