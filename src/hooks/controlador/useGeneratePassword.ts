import { useState, useCallback, useMemo } from 'react';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const defaultRequirements: PasswordRequirement[] = [
  { label: 'Al menos 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p) => /\d/.test(p) },
  { label: 'Un carácter especial (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
];

interface UseGeneratePasswordOptions {
  length?: number;
  requirements?: PasswordRequirement[];
}

interface UseGeneratePasswordReturn {
  password: string;
  showPassword: boolean;
  isValid: boolean;
  generatePassword: () => void;
  setPassword: (password: string) => void;
  toggleShowPassword: () => void;
  requirements: PasswordRequirement[];
}

/**
 * Hook para generar contraseñas que cumplen con los requisitos de seguridad
 */
export function useGeneratePassword(
  options: UseGeneratePasswordOptions = {}
): UseGeneratePasswordReturn {
  const { length = 12, requirements = defaultRequirements } = options;

  // Caracteres disponibles para generar contraseña
  const chars = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    special: '!@#$%^&*',
  };

  // Función para generar contraseña (pura, sin estado)
  const createPassword = (): string => {
    const allChars = chars.uppercase + chars.lowercase + chars.numbers + chars.special;
    let newPassword = '';
    
    newPassword += chars.uppercase[Math.floor(Math.random() * chars.uppercase.length)];
    newPassword += chars.lowercase[Math.floor(Math.random() * chars.lowercase.length)];
    newPassword += chars.numbers[Math.floor(Math.random() * chars.numbers.length)];
    newPassword += chars.special[Math.floor(Math.random() * chars.special.length)];
    
    for (let i = newPassword.length; i < length; i++) {
      newPassword += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return newPassword.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Estado inicial con contraseña ya generada
  const [password, setPassword] = useState(() => createPassword());
  const [showPassword, setShowPassword] = useState(false);

  // Regenerar contraseña
  const generatePassword = useCallback(() => {
    setPassword(createPassword());
  }, [length]);

  // Verificar si la contraseña cumple con todos los requisitos
  const isValid = useMemo(() => {
    if (password.length === 0) return false;
    return requirements.every((req) => req.test(password));
  }, [password, requirements]);

  // Alternar visibilidad de contraseña
  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return {
    password,
    showPassword,
    isValid,
    generatePassword,
    setPassword,
    toggleShowPassword,
    requirements,
  };
}
