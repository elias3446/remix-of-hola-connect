import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, UserPlus, CheckCircle } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { useUsuariosAnalysis } from '@/hooks/controlador/useUsuariosAnalysis';

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  iconBgClass: string;
  delay?: number;
}

const StatCard = memo(function StatCard({
  title,
  value,
  description,
  icon,
  iconBgClass,
  delay = 0,
}: StatCardProps) {
  return (
    <Card 
      className={cn(
        'hover:shadow-md border-border',
        animationClasses.fadeIn,
        transitionClasses.normal
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={cn(
            'p-2.5 rounded-lg',
            iconBgClass
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Loading skeleton
const StatisticsSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Skeleton className="h-[280px]" />
      <Skeleton className="h-[280px]" />
    </div>
    <Skeleton className="h-[280px]" />
  </div>
);

export const UsuariosStatistics = memo(function UsuariosStatistics() {
  const {
    stats,
    estadoDistribution,
    actividadData,
    crecimientoData,
    isLoading,
  } = useUsuariosAnalysis();

  if (isLoading) {
    return <StatisticsSkeleton />;
  }

  const hasEstadoData = estadoDistribution.some(e => e.value > 0);
  const hasActividadData = actividadData.length > 0;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Usuarios"
          value={stats.totalUsuarios}
          description="Registrados en el sistema"
          icon={<Users className="h-5 w-5 text-primary" />}
          iconBgClass="bg-primary/10"
          delay={0}
        />
        <StatCard
          title="Usuarios Activos"
          value={stats.usuariosActivos}
          description={`${stats.totalUsuarios > 0 ? Math.round((stats.usuariosActivos / stats.totalUsuarios) * 100) : 0}% del total`}
          icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
          iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
          delay={50}
        />
        <StatCard
          title="Nuevos (7 días)"
          value={stats.nuevos7Dias}
          description="Registros recientes"
          icon={<UserPlus className="h-5 w-5 text-cyan-600" />}
          iconBgClass="bg-cyan-50 dark:bg-cyan-900/20"
          delay={100}
        />
        <StatCard
          title="Tasa de Confirmación"
          value={`${stats.tasaConfirmacion}%`}
          description="Usuarios confirmados"
          icon={<CheckCircle className="h-5 w-5 text-violet-600" />}
          iconBgClass="bg-violet-50 dark:bg-violet-900/20"
          delay={150}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribución de Estados - Bar Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Distribución de Estados</CardTitle>
            <CardDescription className="text-xs">Estados de usuarios en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {hasEstadoData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={estadoDistribution} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ payload }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-sm font-medium">{data.name}</p>
                              <p className="text-xs text-muted-foreground">Cantidad: {data.value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[4, 4, 0, 0]}
                    >
                      {estadoDistribution.map((entry, index) => (
                        <rect key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actividad de Usuarios - Bar Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Actividad de Usuarios</CardTitle>
            <CardDescription className="text-xs">Reportes creados por usuario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {hasActividadData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actividadData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      interval={0}
                      angle={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ payload }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-sm font-medium">{data.name}</p>
                              <p className="text-xs text-muted-foreground">Reportes: {data.value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(217, 91%, 60%)" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sin actividad registrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Crecimiento de Usuarios - Line Chart */}
      <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Crecimiento de Usuarios</CardTitle>
          <CardDescription className="text-xs">Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={crecimientoData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ payload }) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                          <p className="text-sm font-medium">{data.label}</p>
                          <p className="text-xs text-muted-foreground">Usuarios: {data.value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(142, 76%, 45%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(142, 76%, 45%)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
