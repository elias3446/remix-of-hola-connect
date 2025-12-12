import { memo, useMemo } from 'react';
import { Users, UserCheck, CheckCircle, UserPlus, TrendingUp, Clock, Activity, Key, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComparisonFilters } from '@/components/ui/comparison-filters';
import { DistributionChart } from '@/components/ui/distribution-chart';
import { ActivityPeak } from '@/components/ui/activity-peak';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsuariosEntityAnalysis } from '@/hooks/controlador/useUsuariosEntityAnalysis';
import { useAnimations, transitionClasses, animationClasses } from '@/hooks/optimizacion';
import { useResponsive } from '@/hooks/optimizacion/useResponsive';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useState } from 'react';

// Loading skeleton
const AnalysisSkeleton = memo(function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-[400px]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
      <Skeleton className="h-[200px]" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    </div>
  );
});

// Permisos Horizontal Bar Chart Component
interface PermisosChartData {
  name: string;
  value: number;
  color: string;
  percentage?: number;
}

interface PermisosHorizontalChartProps {
  data: PermisosChartData[];
  getTransition: (speed: string) => string;
}

const PermisosHorizontalChart = memo(function PermisosHorizontalChart({ 
  data, 
  getTransition 
}: PermisosHorizontalChartProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('bar');
  const { isMobile } = useResponsive();

  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
  const hasData = total > 0;

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: PermisosChartData }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {item.value} usuarios ({item.percentage || 0}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={getTransition('normal')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">Distribución por Permisos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Usuarios con cada permiso asignado
            </p>
          </div>
          
          {/* Toggle buttons */}
          <div className="flex rounded-lg border border-border p-0.5">
            <Button
              variant={chartType === 'pie' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                chartType === 'pie' && 'bg-primary text-primary-foreground'
              )}
              onClick={() => setChartType('pie')}
              title="Gráfico circular"
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                chartType === 'bar' && 'bg-primary text-primary-foreground'
              )}
              onClick={() => setChartType('bar')}
              title="Gráfico de barras"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative mb-4">
              <div
                className="h-32 w-32 rounded-full border-8"
                style={{ borderColor: 'hsl(var(--primary) / 0.2)' }}
              >
                <div className="absolute inset-2 rounded-full bg-card" />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-primary" />
              No hay permisos asignados
            </p>
          </div>
        ) : (
          <div style={{ height: isMobile ? 400 : 450 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  layout="vertical"
                  data={data}
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 11 }} 
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: isMobile ? 9 : 11 }}
                    width={isMobile ? 80 : 110}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={data.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 50 : 60}
                    outerRadius={isMobile ? 80 : 100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Legend */}
        {hasData && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {data.filter(d => d.value > 0).map((item, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs">
                <div
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Stat Card Config
interface StatCardConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  getValue: (stats: any) => number | string;
  getSubLabel: (stats: any) => string;
}

const statCards: StatCardConfig[] = [
  {
    key: 'total',
    label: 'Total Usuarios',
    icon: Users,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    getValue: (stats) => stats.total,
    getSubLabel: () => 'En el sistema',
  },
  {
    key: 'activos',
    label: 'Activos',
    icon: UserCheck,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    getValue: (stats) => stats.activos,
    getSubLabel: (stats) => `${stats.total > 0 ? Math.round((stats.activos / stats.total) * 100) : 0}% del total`,
  },
  {
    key: 'confirmados',
    label: 'Confirmados',
    icon: CheckCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    getValue: (stats) => stats.confirmados,
    getSubLabel: (stats) => `${stats.total > 0 ? Math.round((stats.confirmados / stats.total) * 100) : 0}%`,
  },
  {
    key: 'nuevos',
    label: 'Nuevos',
    icon: UserPlus,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    getValue: (stats) => stats.nuevos,
    getSubLabel: () => 'Últimos 7 días',
  },
  {
    key: 'crecimiento',
    label: 'Crecimiento',
    icon: TrendingUp,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    getValue: (stats) => `${stats.crecimiento >= 0 ? '+' : ''}${stats.crecimiento}%`,
    getSubLabel: () => 'Últimos 7 días',
  },
];

export const UsuariosComparativeAnalysis = memo(function UsuariosComparativeAnalysis() {
  const { getTransition } = useAnimations();
  const { isMobile, isTablet } = useResponsive();

  const {
    filteredData,
    isLoading,
    stats,
    estadoDistribution,
    confirmacionDistribution,
    rolesDistribution,
    permisosDistribution,
    estadosPorConfirmacion,
    statusSummary,
    temporalDistribution,
    efficiency,
    filtersController,
  } = useUsuariosEntityAnalysis();

  if (isLoading) {
    return <AnalysisSkeleton />;
  }

  return (
    <div className={cn('space-y-6', animationClasses.fadeIn)}>
      <EntityPageHeader
        title="Análisis Comparativo de Usuarios"
        description="Análisis comparativo detallado con filtros avanzados"
        icon={Users}
        entityKey="usuarios"
        showCreate={false}
        showBulkUpload={false}
      />

      {/* Filtros de comparación */}
      <ComparisonFilters 
        controller={filtersController} 
        title="Filtros de Comparación"
      />

      {/* Stat Cards */}
      <div className={cn(
        'grid gap-4',
        isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-3' : 'grid-cols-5'
      )}>
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = card.getValue(stats);
          const subLabel = card.getSubLabel(stats);

          return (
            <Card
              key={card.key}
              className={cn(
                'relative overflow-hidden',
                transitionClasses.normal,
                getTransition('normal')
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {card.label}
                    </p>
                    <p className={cn('text-3xl font-bold', card.color)}>
                      {value}
                    </p>
                    <p className="text-xs text-muted-foreground">{subLabel}</p>
                  </div>
                  <div className={cn('rounded-lg p-2', card.bgColor)}>
                    <Icon className={cn('h-5 w-5', card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity Peak */}
      <ActivityPeak
        data={filteredData}
        dateField="created_at"
        entityName="Usuario"
        entityNamePlural="Usuarios"
        title="Pico de Actividad de Usuarios"
        description="Explora patrones de registro de usuarios con drill-down"
      />

      {/* Distribution Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Distribución por Estado de Activación */}
        <DistributionChart
          title="Distribución por Estado de Activación"
          description="Todos los usuarios según su estado de activación"
          data={estadoDistribution}
          emptyMessage="No hay usuarios disponibles"
        />

        {/* Distribución por Confirmación de Email */}
        <DistributionChart
          title="Distribución por Confirmación de Email"
          description="Todos los usuarios según confirmación de email"
          data={confirmacionDistribution}
          emptyMessage="No hay usuarios disponibles"
        />

        {/* Distribución por Roles */}
        <DistributionChart
          title="Distribución por Roles"
          description="Usuarios por roles (pueden tener múltiples roles)"
          data={rolesDistribution}
          emptyMessage="No hay roles asignados"
        />

        {/* Distribución por Permisos - Horizontal Bar Chart */}
        <PermisosHorizontalChart 
          data={permisosDistribution} 
          getTransition={getTransition}
        />
      </div>

      {/* Análisis de Estados por Confirmación */}
      <Card className={getTransition('normal')}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Análisis de Estados por Confirmación</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Análisis detallado de estados basado en la confirmación de email de todos los usuarios
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {estadosPorConfirmacion.map((estado, index) => (
            <div key={index} className="space-y-3">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: estado.color }}
                  />
                  <span className="text-sm font-semibold text-foreground">{estado.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {estado.percentage}% del total
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {estado.total} usuarios
                </span>
              </div>
              
              {/* Confirmation boxes */}
              <div className="grid grid-cols-2 gap-2">
                {/* Confirmados */}
                <div 
                  className="rounded-lg p-3 border-l-4"
                  style={{ 
                    backgroundColor: 'hsl(142, 76%, 95%)',
                    borderLeftColor: 'hsl(142, 76%, 40%)'
                  }}
                >
                  <span className="text-lg font-bold text-emerald-600 block">
                    {estado.confirmados}
                  </span>
                  <span className="text-xs text-emerald-700">
                    Confirmados
                  </span>
                </div>
                
                {/* Sin confirmar */}
                <div 
                  className="rounded-lg p-3 border-l-4"
                  style={{ 
                    backgroundColor: 'hsl(38, 92%, 95%)',
                    borderLeftColor: 'hsl(38, 92%, 50%)'
                  }}
                >
                  <span className="text-lg font-bold text-amber-600 block">
                    {estado.sinConfirmar}
                  </span>
                  <span className="text-xs text-amber-700">
                    Sin confirmar
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bottom Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Status Summary */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 12h-4V8" />
              </svg>
              <CardTitle className="text-sm font-medium">Resumen de Estados</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusSummary.map((status, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: status.color }}>
                  {status.name}
                </span>
                <span className="text-sm font-medium">
                  {status.value}
                  <span className="text-muted-foreground ml-1">({status.percentage}%)</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Temporal Distribution */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm font-medium">Distribución Temporal</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-500">{temporalDistribution.rangeLabel}</span>
              <span className="text-sm font-medium">{temporalDistribution.recentCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-500">Promedio diario</span>
              <span className="text-sm font-medium">{temporalDistribution.dailyAverage}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-500">Total histórico</span>
              <span className="text-sm font-medium">{temporalDistribution.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-purple-500">Crecimiento</span>
              <span className={cn(
                "text-sm font-medium",
                temporalDistribution.crecimiento >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {temporalDistribution.crecimiento >= 0 ? '+' : ''}{temporalDistribution.crecimiento}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Metrics */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm font-medium">Eficiencia del Sistema</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-rose-500">Tasa de activación</span>
              <span className="text-sm font-medium">{efficiency.tasaActivacion}%</span>
            </div>
            
            {/* Activation Rate Visual */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div
                  className="h-24 w-24 rounded-full border-8"
                  style={{
                    borderColor: 'hsl(var(--muted))',
                    background: `conic-gradient(hsl(142, 76%, 36%) ${efficiency.tasaActivacion * 3.6}deg, transparent 0deg)`,
                  }}
                >
                  <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                    <span className="text-2xl font-bold text-emerald-500">
                      {efficiency.tasaActivacion}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-500">Tasa de confirmación</span>
                <span className="text-sm font-medium">{efficiency.tasaConfirmacion}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-500">Tasa de bloqueo</span>
                <span className="text-sm font-medium">{efficiency.tasaBloqueo}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-500">Retención</span>
                <span className="text-sm font-medium">{efficiency.retencion}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default UsuariosComparativeAnalysis;
