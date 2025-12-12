import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSignIn } from '@/hooks/controlador/useSignIn';
import { useValidateEmail } from '@/hooks/controlador/useValidateEmail';
import {
  useAnimations,
  useResponsive,
  useDebounce,
  skeletonClasses,
} from '@/hooks/optimizacion';
import { Users, Mail, Lock } from 'lucide-react';

// Skeleton de carga para el formulario
function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="rounded-xl border border-border bg-card p-8 space-y-5">
        <div className="flex justify-center">
          <div className={`${skeletonClasses.avatar} w-16 h-16`} />
        </div>
        <div className="space-y-2 text-center">
          <div className={`${skeletonClasses.textLg} w-40 mx-auto`} />
          <div className={`${skeletonClasses.textSm} w-56 mx-auto`} />
        </div>
        <div className="space-y-2">
          <div className={`${skeletonClasses.textSm} w-32`} />
          <div className={skeletonClasses.input} />
        </div>
        <div className="space-y-2">
          <div className={`${skeletonClasses.textSm} w-24`} />
          <div className={skeletonClasses.input} />
        </div>
        <div className={`${skeletonClasses.buttonFull} mt-6`} />
      </div>
    </div>
  );
}

// Componente principal memoizado
export const LoginForm = memo(function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading, error } = useSignIn();
  
  // Hooks de optimización
  const { transitionClasses, hoverClasses } = useAnimations();
  const { isMobile } = useResponsive();
  
  // Debounce del email para validación
  const debouncedEmail = useDebounce(email, 300);
  
  // Validación de email
  const { isValid: isEmailValid, error: emailError } = useValidateEmail(debouncedEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar email antes de enviar
    if (!isEmailValid && email.length > 0) {
      return;
    }
    
    await signIn({ email, password });
  };

  return (
    <div className={`w-full max-w-md animate-fade-in ${isMobile ? 'px-2' : ''}`}>
      <div className={`rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm ${transitionClasses.card}`}>
        {/* Icono de usuario */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Título y subtítulo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Iniciar Sesión</h1>
          <p className="text-sm text-muted-foreground">Accede a tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Email */}
          <div className="space-y-2">
            <Label 
              htmlFor="login-email" 
              className="text-sm font-medium text-foreground"
            >
              Correo electrónico
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`h-11 pl-10 bg-background border-border focus:border-primary ${transitionClasses.input}`}
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
            </div>
            {emailError && email.length > 0 && (
              <p className="text-xs text-destructive animate-fade-in">{emailError}</p>
            )}
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label 
                htmlFor="login-password" 
                className="text-sm font-medium text-foreground"
              >
                Contraseña
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`h-11 pl-10 bg-background border-border focus:border-primary ${transitionClasses.input}`}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {/* Mensaje de error con animación */}
          {error && (
            <p className="text-sm text-destructive animate-fade-in text-center">
              {error}
            </p>
          )}

          {/* Botón de envío */}
          <Button 
            type="submit" 
            className={`w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-2 ${transitionClasses.button}`}
            disabled={loading || (email.length > 0 && !isEmailValid)}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar sesión'
            )}
          </Button>
        </form>

        {/* Texto de contacto */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Necesitas acceso?{' '}
          <span className="text-primary cursor-pointer hover:underline">
            Contacta al administrador del sistema
          </span>
        </p>
      </div>
    </div>
  );
});

// Exportar skeleton para uso externo
LoginForm.displayName = 'LoginForm';
export { LoginFormSkeleton };
