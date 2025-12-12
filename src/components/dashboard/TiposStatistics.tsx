import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag, TrendingUp, FileText, TagIcon } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { useTiposAnalysis } from '@/hooks/controlador/useTiposAnalysis';

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
            <p className="text-2xl sm:text-3xl font-bold text-foreground break-words">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={cn(
            'p-2.5 rounded-lg shrink-0',
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
  </div>
);

export const TiposStatistics = memo(function TiposStatistics() {
  const {
    stats,
    reportesPorTipo,
    tiposPorCategoria,
    isLoading,
  } = useTiposAnalysis();

  if (isLoading) {
    return <StatisticsSkeleton />;
  }

  const hasReportesPorTipo = reportesPorTipo.length > 0;
  const hasTiposPorCategoria = tiposPorCategoria.length > 0;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Tipos"
          value={stats.totalTipos}
          description="Tipos de reportes"
          icon={<Tag className="h-5 w-5 text-primary" />}
          iconBgClass="bg-primary/10"
          delay={0}
        />
        <StatCard
          title="Tipo Más Usado"
          value={stats.tipoMasUsado}
          description="Mayor frecuencia"
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
          delay={50}
        />
        <StatCard
          title="Uso Promedio"
          value={stats.usoPromedio}
          description="Reportes por tipo"
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          iconBgClass="bg-blue-50 dark:bg-blue-900/20"
          delay={100}
        />
        <StatCard
          title="Sin Usar"
          value={stats.sinUsar}
          description="Tipos sin reportes"
          icon={<TagIcon className="h-5 w-5 text-amber-600" />}
          iconBgClass="bg-amber-50 dark:bg-amber-900/20"
          delay={150}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reportes por Tipo - Bar Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Reportes por Tipo</CardTitle>
            <CardDescription className="text-xs">Distribución por tipo de reporte</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {hasReportesPorTipo ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={reportesPorTipo} 
                    margin={{ top: 10, right: 10, bottom: 60, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={60}
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
                      radius={[4, 4, 0, 0]}
                    >
                      {reportesPorTipo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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

        {/* Tipos por Categoría - Bar Chart */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Tipos por Categoría</CardTitle>
            <CardDescription className="text-xs">Relación categoría-tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {hasTiposPorCategoria ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={tiposPorCategoria} 
                    margin={{ top: 10, right: 10, bottom: 60, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={60}
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
                              <p className="text-xs text-muted-foreground">Tipos: {data.value}</p>
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
                      {tiposPorCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
      </div>
    </div>
  );
});
