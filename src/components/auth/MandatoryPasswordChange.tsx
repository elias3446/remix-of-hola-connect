import { useState, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordStrength } from '@/components/ui/password-strength';
import { useChangePassword } from '@/hooks/controlador/useChangePassword';
import {
  useAnimations,
  useResponsive,
  skeletonClasses,
} from '@/hooks/optimizacion';
import { Lock, Info, CheckCircle, Eye, EyeOff } from 'lucide-react';

// Skeleton de carga para el formulario
export function MandatoryPasswordChangeSkeleton() {
  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="rounded-xl border border-border bg-card p-8 space-y-5">
        <div className="space-y-2">
          <div className={`${skeletonClasses.heading} w-64`} />
          <div className={`${skeletonClasses.textSm} w-48`} />
        </div>
        <div className={`${skeletonClasses.card} h-16`} />
        <div className="space-y-4">
          <div className="space-y-2">
            <div className={`${skeletonClasses.textSm} w-32`} />
            <div className={skeletonClasses.input} />
          </div>
          <div className="space-y-2">
            <div className={`${skeletonClasses.textSm} w-40`} />
            <div className={skeletonClasses.input} />
          </div>
        </div>
        <div className={skeletonClasses.buttonFull} />
      </div>
    </div>
  );
}

interface MandatoryPasswordChangeProps {
  onSuccess?: () => void;
}

// Componente principal memoizado
export const MandatoryPasswordChange = memo(function MandatoryPasswordChange({
  onSuccess,
}: MandatoryPasswordChangeProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { changePassword, loading, error, success } = useChangePassword({
    onSuccess,
  });

  // Hooks de optimización
  const { transitionClasses } = useAnimations();
  const { isMobile } = useResponsive();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await changePassword(null, newPassword, confirmPassword);
  };

  // Validación de requisitos de contraseña
  const passwordRequirements = [
    { label: 'Al menos 8 caracteres', test: (p: string) => p.length >= 8 },
    { label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Una letra minúscula', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Un número', test: (p: string) => /\d/.test(p) },
    { label: 'Un carácter especial (!@#$%^&*)', test: (p: string) => /[!@#$%^&*]/.test(p) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isFormValid = allRequirementsMet && passwordsMatch;

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
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Contraseña actualizada
            </h1>
            <p className="text-sm text-muted-foreground">
              Tu contraseña ha sido cambiada exitosamente. Ya puedes continuar usando la aplicación.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md animate-fade-in ${isMobile ? 'px-2' : ''}`}>
      <div className={`rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm ${transitionClasses.card}`}>
        {/* Título y subtítulo */}
        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Cambio de contraseña obligatorio
          </h1>
          <p className="text-sm text-muted-foreground">
            Por seguridad, debes cambiar tu contraseña temporal antes de continuar
          </p>
        </div>

        {/* Mensaje informativo */}
        <Alert className="mb-6 animate-fade-in [animation-delay:50ms] bg-secondary/50 border-border">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-sm text-muted-foreground">
            Tu cuenta fue creada con una contraseña temporal. Por favor, elige una contraseña segura que solo tú conozcas.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Nueva Contraseña */}
          <div className="space-y-2 animate-fade-in [animation-delay:100ms]">
            <Label
              htmlFor="new-password"
              className="text-sm font-medium text-foreground"
            >
              Nueva contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`h-11 pl-10 pr-10 bg-background border-border focus:border-primary ${transitionClasses.input}`}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            
            {/* Indicador de requisitos de contraseña */}
            <PasswordStrength 
              password={newPassword} 
              requirements={passwordRequirements}
              title="Requisitos de contraseña:"
            />
          </div>

          {/* Campo Confirmar Contraseña */}
          <div className="space-y-2 animate-fade-in [animation-delay:150ms]">
            <Label
              htmlFor="confirm-password"
              className="text-sm font-medium text-foreground"
            >
              Confirmar contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`h-11 pl-10 pr-10 bg-background border-border focus:border-primary ${transitionClasses.input}`}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive animate-fade-in">
                Las contraseñas no coinciden
              </p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-green-600 animate-fade-in flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Las contraseñas coinciden
              </p>
            )}
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
            disabled={loading || !isFormValid}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Cambiando contraseña...
              </span>
            ) : (
              'Cambiar contraseña'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
});

MandatoryPasswordChange.displayName = 'MandatoryPasswordChange';
