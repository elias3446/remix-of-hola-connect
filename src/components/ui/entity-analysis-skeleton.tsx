import * as React from 'react';
import { LucideIcon, FileText, Clock, TrendingUp, CheckCircle, Activity, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComparisonFilters } from '@/components/ui/comparison-filters';
import { DistributionChart } from '@/components/ui/distribution-chart';
import { ActivityPeak } from '@/components/ui/activity-peak';
import {
  useEntityAnalysis,
  type EntityAnalysisConfig,
} from '@/hooks/controlador/useEntityAnalysis';
import {
  useAnimations,
  transitionClasses,
  animationClasses,
} from '@/hooks/optimizacion';
import { useResponsive } from '@/hooks/optimizacion/useResponsive';
import { cn } from '@/lib/utils';

// Configuración de tarjetas de estadísticas
interface StatCardConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  getValue: (stats: EntityStats) => number | string;
  getSubLabel: (stats: EntityStats) => string;
}

interface EntityStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  recent: number;
  recentLabel: string;
}

const defaultStatCards: StatCardConfig[] = [
  {
    key: 'total',
    label: 'Total Reportes',
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    getValue: (stats) => stats.total,
    getSubLabel: () => 'En el sistema',
  },
  {
    key: 'pending',
    label: 'Pendientes',
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    getValue: (stats) => stats.pending,
    getSubLabel: () => 'En el sistema',
  },
  {
    key: 'inProgress',
    label: 'En Proceso',
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    getValue: (stats) => stats.inProgress,
    getSubLabel: () => 'En el sistema',
  },
  {
    key: 'resolved',
    label: 'Resueltos',
    icon: CheckCircle,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    getValue: (stats) => stats.resolved,
    getSubLabel: () => 'En el sistema',
  },
  {
    key: 'recent',
    label: 'Recientes',
    icon: Activity,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    getValue: (stats) => stats.recent,
    getSubLabel: (stats) => stats.recentLabel,
  },
];

export interface EntityAnalysisSkeletonProps<T extends Record<string, unknown>>
  extends Omit<EntityAnalysisConfig<T>, 'entityName' | 'entityNamePlural'> {
  /** Entity singular name */
  entityName?: string;
  /** Entity plural name */
  entityNamePlural?: string;
  /** Title for the analysis section */
  title?: string;
  /** Description for the analysis section */
  description?: string;
  /** Custom stat cards configuration */
  statCards?: StatCardConfig[];
  /** Show activity peak section */
  showActivityPeak?: boolean;
  /** Show distribution charts */
  showDistributionCharts?: boolean;
  /** Show status summary */
  showStatusSummary?: boolean;
  /** Show temporal distribution */
  showTemporalDistribution?: boolean;
  /** Show efficiency metrics */
  showEfficiencyMetrics?: boolean;
  /** Custom charts configuration */
  charts?: {
    status?: boolean;
    priority?: boolean;
    category?: boolean;
    type?: boolean;
    visibility?: boolean;
  };
  /** Additional class name */
  className?: string;
}

export function EntityAnalysisSkeleton<T extends Record<string, unknown>>({
  data,
  dateField,
  entityName = 'Reporte',
  entityNamePlural = 'Reportes',
  statusField,
  priorityField,
  categoryField,
  typeField,
  visibilityField,
  title,
  description,
  statCards = defaultStatCards,
  showActivityPeak = true,
  showDistributionCharts = true,
  showStatusSummary = true,
  showTemporalDistribution = true,
  showEfficiencyMetrics = true,
  charts = { status: true, priority: true, category: true, type: true, visibility: true },
  className,
  ...filtersConfig
}: EntityAnalysisSkeletonProps<T>) {
  const { getTransition } = useAnimations();
  const { isMobile, isTablet } = useResponsive();

  // Análisis de la entidad
  const analysis = useEntityAnalysis({
    data,
    dateField,
    entityName,
    entityNamePlural,
    statusField,
    priorityField,
    categoryField,
    typeField,
    visibilityField,
    ...filtersConfig,
  });

  const {
    filteredData,
    stats,
    statusDistribution,
    priorityDistribution,
    categoryDistribution,
    typeDistribution,
    visibilityDistribution,
    statusSummary,
    temporalDistribution,
    efficiency,
    filtersController,
  } = analysis;

  return (
    <div className={cn('space-y-6', animationClasses.fadeIn, className)}>
      {/* Filtros de comparación */}
      <ComparisonFilters controller={filtersController} />

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
      {showActivityPeak && (
        <ActivityPeak
          data={filteredData}
          dateField={dateField as string}
          entityName={entityName}
          entityNamePlural={entityNamePlural}
          title={title || `Pico de Actividad - Análisis Interactivo`}
          description={description || `Explora patrones de actividad con drill-down desde año hasta hora`}
        />
      )}

      {/* Distribution Charts */}
      {showDistributionCharts && (
        <div className="grid gap-4 md:grid-cols-2">
          {charts.status && statusField && (
            <DistributionChart
              title="Estado de los Reportes"
              description={`Distribución de ${entityNamePlural.toLowerCase()} por su estado actual: Pendiente, En Proceso, Resuelto, rechazado y cancelado`}
              data={statusDistribution}
              emptyMessage={`No hay ${entityNamePlural.toLowerCase()} disponibles`}
            />
          )}

          {charts.type && typeField && (
            <DistributionChart
              title="Distribución por tipo de reporte"
              description={`Todos los ${entityNamePlural.toLowerCase()} clasificados según su tipo de reporte`}
              data={typeDistribution}
              emptyMessage="No hay categorías disponibles"
              emptySubMessage="Para crear un tipo de reporte, primero debes crear al menos una catego"
            />
          )}

          {charts.category && categoryField && (
            <DistributionChart
              title="Distribución por Categoría"
              description={`Todos los ${entityNamePlural.toLowerCase()} clasificados según su categoría`}
              data={categoryDistribution}
              emptyMessage="No hay categorías disponibles"
              emptySubMessage="Para crear un tipo de reporte, primero debes crear al menos una catego"
            />
          )}

          {charts.priority && priorityField && (
            <DistributionChart
              title="Distribución por Prioridad"
              description={`Todos los ${entityNamePlural.toLowerCase()} clasificados según su nivel de prioridad (urgente, alto, medio, bajo)`}
              data={priorityDistribution}
              emptyMessage={`No hay ${entityNamePlural.toLowerCase()} disponibles`}
            />
          )}

          {charts.visibility && visibilityField && (
            <DistributionChart
              title="Distribución por Visibilidad (Público, Privado)"
              description="Clasificación según nivel de acceso"
              data={visibilityDistribution}
              emptyMessage={`No hay ${entityNamePlural.toLowerCase()} disponibles`}
            />
          )}
        </div>
      )}

      {/* Priority by Status Analysis */}
      {showStatusSummary && priorityDistribution.length > 0 && (
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Análisis de Prioridades por Estado</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Análisis detallado de prioridades basado en el estado actual de todos los {entityNamePlural.toLowerCase()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {priorityDistribution.map((priority, index) => {
              const total = stats.total;
              const percentage = total > 0 ? Math.round((priority.value / total) * 100) : 0;
              const pending = (priority as any).pending ?? 0;
              const inProgress = (priority as any).inProgress ?? 0;
              const resolved = (priority as any).resolved ?? 0;

              return (
                <div key={index} className="space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: priority.color }}
                      />
                      <span className="text-sm font-semibold text-foreground">{priority.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {percentage}% del total
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {priority.value} {entityNamePlural.toLowerCase()}
                    </span>
                  </div>
                  
                  {/* Status boxes */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Pendientes */}
                    <div 
                      className="rounded-lg p-3 border-l-4"
                      style={{ 
                        backgroundColor: 'hsl(38, 92%, 95%)',
                        borderLeftColor: 'hsl(38, 92%, 50%)'
                      }}
                    >
                      <span className="text-lg font-bold text-amber-600 block">
                        {pending}
                      </span>
                      <span className="text-xs text-amber-700">
                        Pendientes
                      </span>
                    </div>
                    
                    {/* En Proceso */}
                    <div 
                      className="rounded-lg p-3 border-l-4"
                      style={{ 
                        backgroundColor: 'hsl(195, 80%, 95%)',
                        borderLeftColor: 'hsl(195, 80%, 45%)'
                      }}
                    >
                      <span className="text-lg font-bold text-cyan-600 block">
                        {inProgress}
                      </span>
                      <span className="text-xs text-cyan-700">
                        En Proceso
                      </span>
                    </div>
                    
                    {/* Resueltos */}
                    <div 
                      className="rounded-lg p-3 border-l-4"
                      style={{ 
                        backgroundColor: 'hsl(142, 76%, 95%)',
                        borderLeftColor: 'hsl(142, 76%, 40%)'
                      }}
                    >
                      <span className="text-lg font-bold text-emerald-600 block">
                        {resolved}
                      </span>
                      <span className="text-xs text-emerald-700">
                        Resueltos
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Bottom Stats Row */}
      {(showStatusSummary || showTemporalDistribution || showEfficiencyMetrics) && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Status Summary */}
          {showStatusSummary && (
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
          )}

          {/* Temporal Distribution */}
          {showTemporalDistribution && (
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
                  <span className="text-sm text-emerald-500">Promedio diario ({temporalDistribution.daysInRange} días)</span>
                  <span className="text-sm font-medium">{temporalDistribution.dailyAverage}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-500">Total filtrado</span>
                  <span className="text-sm font-medium">{temporalDistribution.total}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Efficiency Metrics */}
          {showEfficiencyMetrics && (
            <Card className={getTransition('normal')}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-sm font-medium">Eficiencia del Sistema</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-rose-500">Tasa de resolución</span>
                  <span className="text-sm font-medium">{efficiency.resolutionRate}%</span>
                </div>
                
                {/* Resolution Rate Visual */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div
                      className="h-24 w-24 rounded-full border-8"
                      style={{
                        borderColor: 'hsl(var(--muted))',
                        background: `conic-gradient(hsl(142, 76%, 36%) ${efficiency.resolutionRate * 3.6}deg, transparent 0deg)`,
                      }}
                    >
                      <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                        <span className="text-2xl font-bold text-emerald-500">
                          {efficiency.resolutionRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground mt-2">
                    Tasa de resolución
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {entityNamePlural} por categoría
                    </span>
                    <span className="text-sm font-medium">{efficiency.perCategory}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {entityNamePlural} por tipo
                    </span>
                    <span className="text-sm font-medium">{efficiency.perType}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default EntityAnalysisSkeleton;
