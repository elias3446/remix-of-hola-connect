import { useState, useMemo } from 'react';

interface UseRegisterFormReturn {
  fullName: string;
  setFullName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  passwordsMatch: boolean;
  showPasswordMismatch: boolean;
}

export function useRegisterForm(): UseRegisterFormReturn {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordsMatch = useMemo(() => {
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const showPasswordMismatch = useMemo(() => {
    return confirmPassword.length > 0 && !passwordsMatch;
  }, [confirmPassword, passwordsMatch]);

  return {
    fullName,
    setFullName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    passwordsMatch,
    showPasswordMismatch,
  };
}
