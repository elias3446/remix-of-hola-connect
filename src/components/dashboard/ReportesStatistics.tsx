import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
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
  LineChart,
  Line,
} from 'recharts';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { useReportesAnalysis } from '@/hooks/controlador/useReportesAnalysis';

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Skeleton className="h-[280px]" />
      <Skeleton className="h-[280px]" />
    </div>
  </div>
);

export const ReportesStatistics = memo(function ReportesStatistics() {
  const {
    stats,
    statusDistribution,
    priorityDistribution,
    trendData,
    visibilityDistribution,
    isLoading,
  } = useReportesAnalysis();

  if (isLoading) {
    return <StatisticsSkeleton />;
  }

  const hasStatusData = statusDistribution.some(s => s.value > 0);
  const hasPriorityData = priorityDistribution.some(p => p.value > 0);
  const hasVisibilityData = visibilityDistribution.some(v => v.value > 0);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total de Reportes"
          value={stats.totalReportes}
          description="Reportes activos"
          icon={<FileText className="h-5 w-5 text-primary" />}
          iconBgClass="bg-primary/10"
          delay={0}
        />
        <StatCard
          title="Tasa de Resolución"
          value={`${stats.tasaResolucion}%`}
          description="Reportes resueltos"
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
          delay={50}
        />
        <StatCard
          title="Tiempo Promedio"
          value={stats.tiempoPromedioResolucion}
          description="De resolución"
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          iconBgClass="bg-amber-50 dark:bg-amber-900/20"
          delay={100}
        />
        <StatCard
          title="Reportes Críticos"
          value={stats.reportesCriticos}
          description="Alta prioridad"
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          iconBgClass="bg-destructive/10"
          delay={150}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reportes por Estado - Donut Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Reportes por Estado</CardTitle>
            <CardDescription className="text-xs">Distribución actual de reportes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-center justify-center">
              {hasStatusData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
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
                              <p className="text-xs text-muted-foreground">Cantidad: {data.value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value, entry) => {
                        const item = statusDistribution.find(s => s.name === value);
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

        {/* Reportes por Prioridad - Bar Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Reportes por Prioridad</CardTitle>
            <CardDescription className="text-xs">Nivel de urgencia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {hasPriorityData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityDistribution} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
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
                      fill="hsl(217, 91%, 60%)" 
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

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tendencia de Reportes - Line Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Tendencia de Reportes</CardTitle>
            <CardDescription className="text-xs">Últimos 7 días</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
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
                            <p className="text-xs text-muted-foreground">Reportes: {data.value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(217, 91%, 60%)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Reportes por Visibilidad - Donut Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Reportes por Visibilidad</CardTitle>
            <CardDescription className="text-xs">Distribución de acceso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-center justify-center">
              {hasVisibilityData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={visibilityDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {visibilityDistribution.map((entry, index) => (
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
                              <p className="text-xs text-muted-foreground">Cantidad: {data.value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value) => (
                        <span className="text-xs text-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
