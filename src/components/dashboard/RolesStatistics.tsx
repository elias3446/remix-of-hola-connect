import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Users, Key, Award } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { useRolesAnalysis } from '@/hooks/controlador/useRolesAnalysis';

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
    <Skeleton className="h-[300px]" />
  </div>
);

export const RolesStatistics = memo(function RolesStatistics() {
  const {
    stats,
    roleDistribution,
    permisosPorRol,
    matrizPermisos,
    isLoading,
  } = useRolesAnalysis();

  if (isLoading) {
    return <StatisticsSkeleton />;
  }

  const hasRoleData = roleDistribution.length > 0;
  const hasPermisosData = permisosPorRol.length > 0;
  const hasMatrizData = matrizPermisos.length > 0;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total de Roles"
          value={stats.totalRoles}
          description="Roles configurados"
          icon={<Shield className="h-5 w-5 text-violet-600" />}
          iconBgClass="bg-violet-50 dark:bg-violet-900/20"
          delay={0}
        />
        <StatCard
          title="Usuarios con Roles"
          value={stats.usuariosConRoles}
          description="Usuarios asignados"
          icon={<Users className="h-5 w-5 text-cyan-600" />}
          iconBgClass="bg-cyan-50 dark:bg-cyan-900/20"
          delay={50}
        />
        <StatCard
          title="Permisos Activos"
          value={stats.permisosActivos}
          description="Permisos en uso"
          icon={<Key className="h-5 w-5 text-emerald-600" />}
          iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
          delay={100}
        />
        <StatCard
          title="Rol Más Común"
          value={stats.rolMasComun}
          description="Más asignado"
          icon={<Award className="h-5 w-5 text-pink-600" />}
          iconBgClass="bg-pink-50 dark:bg-pink-900/20"
          delay={150}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribución de Roles - Pie Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Distribución de Roles</CardTitle>
            <CardDescription className="text-xs">Usuarios por rol en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-center justify-center">
              {hasRoleData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ payload }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-sm font-medium">{data.name}: {data.percentage}%</p>
                              <p className="text-xs text-muted-foreground">Usuarios: {data.value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value, entry) => {
                        const item = roleDistribution.find(s => s.name === value);
                        return (
                          <span className="text-xs text-foreground">
                            {value}: {item?.percentage}%
                          </span>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Permisos por Rol - Bar Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Permisos por Rol</CardTitle>
            <CardDescription className="text-xs">Cantidad de permisos asignados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {hasPermisosData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={permisosPorRol} margin={{ top: 10, right: 10, bottom: 40, left: 0 }}>
                    <defs>
                      <linearGradient id="gradientPurple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(280, 65%, 60%)" />
                        <stop offset="100%" stopColor="hsl(280, 65%, 75%)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      allowDecimals={false}
                      label={{ value: 'Permisos', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ payload }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-sm font-medium">{data.name}</p>
                              <p className="text-xs text-muted-foreground">Permisos: {data.value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="url(#gradientPurple)" 
                      radius={[4, 4, 0, 0]}
                    />
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
      </div>

      {/* Matriz de Permisos */}
      <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Matriz de Permisos</CardTitle>
          <CardDescription className="text-xs">Permisos más utilizados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            {hasMatrizData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={matrizPermisos} margin={{ top: 10, right: 10, bottom: 80, left: 10 }}>
                  <defs>
                    <linearGradient id="gradientPurpleCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(280, 65%, 60%)" />
                      <stop offset="100%" stopColor="hsl(190, 75%, 55%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    allowDecimals={false}
                    label={{ value: 'Roles', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                            <p className="text-sm font-medium">{data.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {data.value} {data.value === 1 ? 'usuario tiene' : 'usuarios tienen'} este permiso
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="url(#gradientPurpleCyan)" 
                    radius={[4, 4, 0, 0]}
                  />
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
    </div>
  );
});
