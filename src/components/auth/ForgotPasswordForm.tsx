import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useResetPassword } from '@/hooks/controlador/useResetPassword';
import { useValidateEmail } from '@/hooks/controlador/useValidateEmail';
import {
  useAnimations,
  useResponsive,
  useDebounce,
  skeletonClasses,
} from '@/hooks/optimizacion';
import { KeyRound, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

// Skeleton de carga para el formulario
function ForgotPasswordFormSkeleton() {
  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="rounded-xl border border-border bg-card p-8 space-y-5">
        <div className="flex justify-center">
          <div className={`${skeletonClasses.avatar} w-16 h-16`} />
        </div>
        <div className="space-y-2 text-center">
          <div className={`${skeletonClasses.textLg} w-48 mx-auto`} />
          <div className={`${skeletonClasses.textSm} w-64 mx-auto`} />
        </div>
        <div className="space-y-2">
          <div className={`${skeletonClasses.textSm} w-32`} />
          <div className={skeletonClasses.input} />
        </div>
        <div className={`${skeletonClasses.buttonFull} mt-6`} />
      </div>
    </div>
  );
}

// Componente principal memoizado
export const ForgotPasswordForm = memo(function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const { resetPassword, loading, error, success } = useResetPassword();
  
  // Hooks de optimización
  const { transitionClasses } = useAnimations();
  const { isMobile } = useResponsive();
  
  // Debounce del email para validación
  const debouncedEmail = useDebounce(email, 300);
  
  // Validación de email
  const { isValid: isEmailValid, error: emailError } = useValidateEmail(debouncedEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEmailValid && email.length > 0) {
      return;
    }
    
    await resetPassword(email);
  };

  // Pantalla de éxito
  if (success) {
    return (
      <div className={`w-full max-w-md animate-fade-in ${isMobile ? 'px-2' : ''}`}>
        <div className={`rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm ${transitionClasses.card}`}>
          <div className="flex justify-center mb-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="text-center mb-6 animate-fade-in [animation-delay:50ms]">
            <h1 className="text-2xl font-bold text-foreground mb-2">Correo Enviado</h1>
            <p className="text-sm text-muted-foreground">
              Hemos enviado un enlace de recuperación a <strong>{email}</strong>. 
              Revisa tu bandeja de entrada.
            </p>
          </div>

          <Link to="/login">
            <Button 
              variant="outline"
              className={`w-full h-11 mt-4 animate-fade-in [animation-delay:100ms] ${transitionClasses.button}`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio de sesión
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md animate-fade-in ${isMobile ? 'px-2' : ''}`}>
      <div className={`rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm ${transitionClasses.card}`}>
        {/* Icono de llave */}
        <div className="flex justify-center mb-4 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Título y subtítulo */}
        <div className="text-center mb-6 animate-fade-in [animation-delay:50ms]">
          <h1 className="text-2xl font-bold text-foreground mb-1">Recuperar Contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Email */}
          <div className="space-y-2 animate-fade-in [animation-delay:100ms]">
            <Label 
              htmlFor="recovery-email" 
              className="text-sm font-medium text-foreground"
            >
              Correo electrónico
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="recovery-email"
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
            <p className="text-xs text-muted-foreground">
              Te enviaremos un enlace para restablecer tu contraseña
            </p>
          </div>

          {/* Mensaje de error */}
          {error && (
            <p className="text-sm text-destructive animate-fade-in text-center">
              {error}
            </p>
          )}

          {/* Botón de envío */}
          <Button 
            type="submit" 
            className={`w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-2 animate-fade-in [animation-delay:200ms] ${transitionClasses.button}`}
            disabled={loading || (email.length > 0 && !isEmailValid)}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Enviando...
              </span>
            ) : (
              'Enviar enlace de recuperación'
            )}
          </Button>
        </form>

        {/* Enlace de regreso */}
        <Link 
          to="/login" 
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-6 animate-fade-in [animation-delay:300ms] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
});

ForgotPasswordForm.displayName = 'ForgotPasswordForm';
export { ForgotPasswordFormSkeleton };
