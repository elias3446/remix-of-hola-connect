import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRouteProtection } from '@/hooks/controlador/useRouteProtection';
import { LoadingScreen } from './LoadingScreen';
import { AlertTriangle, ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Ruta a la que redirigir si no tiene acceso (default: /bienvenida) */
  fallbackPath?: string;
  /** Si es true, muestra un mensaje en lugar de redirigir */
  showAccessDenied?: boolean;
}

/**
 * Componente que protege rutas basándose en roles y permisos
 * 
 * @example
 * ```tsx
 * <Route 
 *   path="/admin" 
 *   element={
 *     <ProtectedRoute>
 *       <AdminPage />
 *     </ProtectedRoute>
 *   } 
 * />
 * ```
 */
export function ProtectedRoute({ 
  children, 
  fallbackPath = '/bienvenida',
  showAccessDenied = true 
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { hasAccess, isLoading, isReady, accessDeniedReason } = useRouteProtection();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Esperar a que los datos estén listos antes de tomar decisiones
    if (!isReady || isLoading) return;

    if (hasAccess) {
      setShouldRender(true);
    } else if (!showAccessDenied) {
      // Redirigir si no tiene acceso y no queremos mostrar el mensaje
      navigate(fallbackPath, { replace: true });
    } else {
      // Mostrar mensaje de acceso denegado
      setShouldRender(true);
    }
  }, [hasAccess, isLoading, isReady, navigate, fallbackPath, showAccessDenied]);

  // Mostrar loading mientras se verifican permisos
  if (isLoading || !isReady) {
    return <LoadingScreen />;
  }

  // Si no tiene acceso y queremos mostrar el mensaje
  if (!hasAccess && showAccessDenied) {
    return <AccessDeniedMessage reason={accessDeniedReason} />;
  }

  // Si no tiene acceso y no queremos mostrar el mensaje (se redirigirá)
  if (!hasAccess) {
    return <LoadingScreen />;
  }

  // Tiene acceso, renderizar el contenido
  if (shouldRender) {
    return <>{children}</>;
  }

  return <LoadingScreen />;
}

interface AccessDeniedMessageProps {
  reason: string | null;
}

function AccessDeniedMessage({ reason }: AccessDeniedMessageProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl text-destructive">
            Acceso Restringido
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-background p-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-warning" />
            <p className="text-left">
              {reason || 'No tienes los permisos necesarios para acceder a esta página.'}
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Si crees que deberías tener acceso, contacta a un administrador.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <Button 
              onClick={() => navigate('/bienvenida')}
              className="flex-1"
            >
              Ir al Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProtectedRoute;
