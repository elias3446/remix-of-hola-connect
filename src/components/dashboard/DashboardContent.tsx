import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Activity, Settings } from 'lucide-react';

export const DashboardContent = memo(function DashboardContent() {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground mb-2">Bienvenido</h2>
          <p className="text-muted-foreground">Panel de administración del sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="animate-fade-in [animation-delay:100ms] hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
              <Users className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <CardDescription>Total de usuarios registrados</CardDescription>
            </CardContent>
          </Card>

          <Card className="animate-fade-in [animation-delay:200ms] hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Actividad</CardTitle>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <CardDescription>Sesiones activas</CardDescription>
            </CardContent>
          </Card>

          <Card className="animate-fade-in [animation-delay:300ms] hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Configuración</CardTitle>
              <Settings className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Activa</div>
              <CardDescription>Estado del sistema</CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
});

DashboardContent.displayName = 'DashboardContent';
