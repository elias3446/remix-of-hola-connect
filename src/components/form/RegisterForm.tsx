import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PasswordStrength } from '@/components/ui/password-strength';
import { useFirstUserRegistration } from '@/hooks/controlador/useFirstUserRegistration';
import { Shield, User, Mail, Lock, Info, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function RegisterFormSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="flex flex-col items-center mb-8">
          <Skeleton className="w-14 h-14 rounded-full mb-4" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-full mt-6" />
        </div>
      </div>
    </div>
  );
}

export function RegisterForm() {
  const {
    fullName,
    setFullName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPasswordMismatch,
    isEmailValid,
    emailError,
    isLoading,
    isCheckingUsers,
    registrationError,
    handleSubmit,
  } = useFirstUserRegistration();

  // Show skeleton while checking if users exist
  if (isCheckingUsers) {
    return <RegisterFormSkeleton />;
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border border-border bg-card p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Configuración Inicial</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crea la cuenta de administrador del sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm text-muted-foreground">
              Nombre completo
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                placeholder="Tu nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
                className="h-11 pl-10 bg-input border-border focus:border-primary"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">
              Correo electrónico
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-11 pl-10 bg-input border-border focus:border-primary"
              />
            </div>
            {email.length > 0 && emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-muted-foreground">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 pl-10 bg-input border-border focus:border-primary"
              />
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
              Confirmar contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 pl-10 bg-input border-border focus:border-primary"
              />
            </div>
            {showPasswordMismatch && (
              <p className="text-sm text-destructive">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Registration Error */}
          {registrationError && (
            <p className="text-sm text-destructive text-center">{registrationError}</p>
          )}

          <Button 
            type="submit" 
            className="w-full h-11 btn-gradient mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              'Crear cuenta de administrador'
            )}
          </Button>
        </form>

        {/* Info Message */}
        <div className="mt-6 p-4 rounded-lg bg-secondary/50 flex gap-3">
          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Este es el <span className="text-primary font-medium">primer usuario</span> del sistema. 
            Se asignarán automáticamente todos los permisos de administrador.
          </p>
        </div>
      </div>
    </div>
  );
}
