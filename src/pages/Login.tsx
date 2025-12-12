import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionPersistence } from '@/hooks/controlador';
import { LoginForm } from '@/components/form/LoginForm';

export default function Login() {
  const navigate = useNavigate();
  const { loading, isAuthenticated } = useSessionPersistence();
  // Track si el usuario ya estaba autenticado al cargar la página
  const wasAuthenticatedOnMount = useRef<boolean | null>(null);

  useEffect(() => {
    // Solo capturar el estado inicial de autenticación
    if (!loading && wasAuthenticatedOnMount.current === null) {
      wasAuthenticatedOnMount.current = isAuthenticated;
    }
  }, [loading, isAuthenticated]);

  useEffect(() => {
    // Solo redirigir si el usuario YA estaba autenticado al cargar la página
    // No redirigir si se autenticó durante esta sesión (el hook useSignIn maneja eso)
    if (!loading && wasAuthenticatedOnMount.current === true && isAuthenticated) {
      navigate('/bienvenida');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Solo mostrar null si ya estaba autenticado al cargar
  if (wasAuthenticatedOnMount.current === true && isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto flex items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
