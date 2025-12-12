import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, TrendingUp, FileText, FolderX } from 'lucide-react';
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
import { useCategoriesAnalysis } from '@/hooks/controlador/useCategoriesAnalysis';

// Color palette for categories
const COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(33, 100%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(350, 89%, 60%)',
  'hsl(180, 65%, 50%)',
];

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
          <div className={cn('p-2.5 rounded-lg', iconBgClass)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

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

export const CategoriasStatistics = memo(function CategoriasStatistics() {
  const {
    stats,
    reportesPorCategoria,
    estadoDistribution,
    trendData,
    categoryNames,
    isLoading,
  } = useCategoriesAnalysis();

  if (isLoading) {
    return <StatisticsSkeleton />;
  }

  const hasReportesData = reportesPorCategoria.some(r => r.value > 0);
  const hasEstadoData = estadoDistribution.some(e => e.value > 0);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Categorías"
          value={stats.totalCategorias}
          description="Categorías activas"
          icon={<FolderOpen className="h-5 w-5 text-primary" />}
          iconBgClass="bg-primary/10"
          delay={0}
        />
        <StatCard
          title="Categoría Más Usada"
          value={stats.categoriaMasUsada}
          description="Mayor número de reportes"
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
          delay={50}
        />
        <StatCard
          title="Uso Promedio"
          value={stats.usoPromedio}
          description="Reportes por categoría"
          icon={<FileText className="h-5 w-5 text-primary" />}
          iconBgClass="bg-primary/10"
          delay={100}
        />
        <StatCard
          title="Sin Usar"
          value={stats.sinUsar}
          description="Categorías sin reportes"
          icon={<FolderX className="h-5 w-5 text-amber-600" />}
          iconBgClass="bg-amber-50 dark:bg-amber-900/20"
          delay={150}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reportes por Categoría - Bar Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Reportes por Categoría</CardTitle>
            <CardDescription className="text-xs">Distribución de reportes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {hasReportesData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={reportesPorCategoria} 
                    layout="vertical"
                    margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      type="number"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      width={100}
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
                      radius={[0, 4, 4, 0]}
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

        {/* Estado de Categorías - Pie Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Estado de Categorías</CardTitle>
            <CardDescription className="text-xs">Categorías activas vs inactivas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-center justify-center">
              {hasEstadoData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={estadoDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {estadoDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ payload }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          const total = estadoDistribution.reduce((a, b) => a + b.value, 0);
                          const percentage = total > 0 ? Math.round((data.value / total) * 100) : 0;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-sm font-medium">{data.name}: {percentage}%</p>
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

      {/* Trend Chart */}
      <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Tendencia de Uso de Categorías</CardTitle>
          <CardDescription className="text-xs">Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ payload, label }) => {
                    if (payload && payload.length > 0) {
                      return (
                        <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                          <p className="text-sm font-medium mb-1">{label}</p>
                          {payload.map((entry, index) => (
                            <p key={index} className="text-xs text-muted-foreground">
                              {entry.name}: {entry.value}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => (
                    <span className="text-xs text-foreground">{value}</span>
                  )}
                />
                {categoryNames.map((name, index) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
