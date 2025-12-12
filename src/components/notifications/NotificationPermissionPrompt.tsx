import { useState, useEffect } from 'react';
import { Bell, BellOff, X, Shield, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/controlador/usePushNotifications';
import { cn } from '@/lib/utils';

interface NotificationPermissionPromptProps {
  className?: string;
  onPermissionChange?: (granted: boolean) => void;
  variant?: 'modal' | 'banner' | 'inline';
  autoShow?: boolean;
  delay?: number;
}

export function NotificationPermissionPrompt({
  className,
  onPermissionChange,
  variant = 'banner',
  autoShow = true,
  delay = 3000,
}: NotificationPermissionPromptProps) {
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Mostrar el prompt después de un delay
  useEffect(() => {
    if (!autoShow || !isSupported || permission !== 'default' || isDismissed) {
      return;
    }

    // Verificar si ya fue descartado antes
    const dismissed = localStorage.getItem('notification_prompt_dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [autoShow, isSupported, permission, delay, isDismissed]);

  // Manejar solicitud de permiso
  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const granted = await requestPermission();
      onPermissionChange?.(granted);
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Descartar el prompt
  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('notification_prompt_dismissed', 'true');
  };

  // No mostrar si no es soportado, ya tiene permiso o fue denegado
  if (!isSupported || permission === 'granted' || permission === 'denied' || !isVisible) {
    return null;
  }

  const features = [
    { icon: Bell, text: 'Alertas de reportes cercanos' },
    { icon: Shield, text: 'Actualizaciones de seguridad' },
    { icon: Smartphone, text: 'Notificaciones en tiempo real' },
  ];

  if (variant === 'inline') {
    return (
      <Card className={cn('bg-primary/5 border-primary/20', className)}>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Activa las notificaciones
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Recibe alertas de reportes cercanos en tiempo real
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleRequestPermission}
            disabled={isLoading}
          >
            {isLoading ? 'Activando...' : 'Activar'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={cn(
        'fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300',
        'md:left-auto md:right-4 md:max-w-md',
        className
      )}>
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="pb-2 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">¿Activar notificaciones?</CardTitle>
                <CardDescription>
                  Mantente informado de lo que sucede
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <feature.icon className="h-4 w-4 text-primary" />
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDismiss}
              >
                <BellOff className="h-4 w-4 mr-2" />
                Ahora no
              </Button>
              <Button
                className="flex-1"
                onClick={handleRequestPermission}
                disabled={isLoading}
              >
                <Bell className="h-4 w-4 mr-2" />
                {isLoading ? 'Activando...' : 'Activar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Modal variant
  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center p-4',
      'bg-background/80 backdrop-blur-sm animate-in fade-in duration-200',
      className
    )}>
      <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Activa las notificaciones</CardTitle>
          <CardDescription className="text-base">
            Para mantenerte informado de alertas importantes cerca de ti
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-muted-foreground">{feature.text}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              onClick={handleRequestPermission}
              disabled={isLoading}
            >
              <Bell className="h-5 w-5 mr-2" />
              {isLoading ? 'Activando...' : 'Activar notificaciones'}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-muted-foreground"
              onClick={handleDismiss}
            >
              Quizás más tarde
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Puedes cambiar esto en cualquier momento desde la configuración
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
