import { useMemo } from 'react';
import { Activity, Calendar, Clock, TrendingUp, ChevronRight, RotateCcw } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAnimations } from '@/hooks/optimizacion/useAnimations';
import { useResponsive } from '@/hooks/optimizacion/useResponsive';
import {
  useActivityPeak,
  type UseActivityPeakConfig,
  type DrillLevel,
} from '@/hooks/controlador/useActivityPeak';
import { cn } from '@/lib/utils';

interface ActivityPeakProps<T> extends UseActivityPeakConfig<T> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  trendColor?: string;
  distributionColor?: string;
  heatmapColor?: string;
  showHeatmap?: boolean;
  className?: string;
}

export function ActivityPeak<T extends Record<string, unknown>>({
  data,
  dateField,
  entityName,
  entityNamePlural,
  title,
  description,
  icon,
  trendColor = 'hsl(var(--primary))',
  distributionColor = 'hsl(var(--accent))',
  heatmapColor = 'hsl(var(--primary))',
  showHeatmap = true,
  className,
}: ActivityPeakProps<T>) {
  const { getTransition } = useAnimations();
  const { isMobile, isTablet } = useResponsive();
  
  const {
    drillState,
    setDrillState,
    drillDown,
    resetDrill,
    breadcrumbs,
    availableYears,
    stats,
    yearlyTrend,
    monthlyDistribution,
    dailyDistribution,
    heatmapData,
    trendTitle,
    trendSubtitle,
    distributionTitle,
    distributionSubtitle,
    isFiltered,
  } = useActivityPeak({
    data,
    dateField,
    entityName,
    entityNamePlural,
  });

  // Determinar qué datos mostrar en el gráfico de tendencia
  const trendData = useMemo(() => {
    if (drillState.level === 'all') return yearlyTrend;
    return monthlyDistribution;
  }, [drillState.level, yearlyTrend, monthlyDistribution]);

  // Determinar qué datos mostrar en el gráfico de distribución
  const distributionData = useMemo(() => {
    if (drillState.level === 'month') return dailyDistribution;
    return monthlyDistribution;
  }, [drillState.level, monthlyDistribution, dailyDistribution]);

  // Manejar clic en el gráfico de tendencia
  const handleTrendClick = (data: { year?: number; month?: number }) => {
    if (drillState.level === 'all' && data.year) {
      drillDown(data.year);
    } else if (drillState.level === 'year' && data.month !== undefined) {
      drillDown(undefined, data.month);
    }
  };

  // Manejar clic en el gráfico de distribución
  const handleDistributionClick = (data: { month?: number }) => {
    if (drillState.level === 'year' && data.month !== undefined) {
      drillDown(undefined, data.month);
    }
  };

  // Manejar cambio de año en el selector
  const handleYearChange = (value: string) => {
    if (value === 'all') {
      resetDrill();
    } else {
      const year = parseInt(value);
      setDrillState({ level: 'year', year, month: null });
    }
  };

  // Manejar clic en breadcrumb
  const handleBreadcrumbClick = (crumb: { level: DrillLevel; year?: number; month?: number }) => {
    if (crumb.level === 'all') {
      resetDrill();
    } else if (crumb.level === 'year' && crumb.year) {
      setDrillState({ level: 'year', year: crumb.year, month: null });
    }
  };

  // Calcular intensidad del heatmap
  const maxHeatmapValue = useMemo(() => {
    return Math.max(...heatmapData.map(cell => cell.value), 1);
  }, [heatmapData]);

  const getHeatmapIntensity = (value: number) => {
    if (value === 0) return 0.05;
    return 0.1 + (value / maxHeatmapValue) * 0.9;
  };

  // Stats cards config
  const statsCards = [
    {
      label: `Total ${entityNamePlural}`,
      value: stats.total.toString(),
      color: 'text-primary',
    },
    {
      label: 'Hora Pico',
      value: stats.peakHour,
      subValue: stats.peakHourCount > 0 ? `${stats.peakHourCount} ${entityNamePlural.toLowerCase()}` : undefined,
      color: 'text-amber-500',
    },
    {
      label: 'Día Pico',
      value: stats.peakDay,
      subValue: stats.peakDayCount > 0 ? `${stats.peakDayCount} ${entityNamePlural.toLowerCase()}` : undefined,
      color: 'text-emerald-500',
    },
    {
      label: 'Periodo',
      value: stats.period,
      color: 'text-foreground',
    },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card className={cn('border-l-4 border-l-primary', getTransition('normal'))}>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                {icon || <Activity className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <CardTitle className="text-lg">
                  {title || `Pico de Actividad de ${entityNamePlural}`}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {description || `Explora patrones de actividad con drill-down desde año hasta hora`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Selector de año */}
              <Select
                value={drillState.year?.toString() || 'all'}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[120px]">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Selector de mes (solo si hay año seleccionado) */}
              {drillState.level !== 'all' && (
                <Select
                  value={drillState.month?.toString() || 'all-months'}
                  onValueChange={(value) => {
                    if (value === 'all-months') {
                      setDrillState({ ...drillState, level: 'year', month: null });
                    } else {
                      setDrillState({ ...drillState, level: 'month', month: parseInt(value) });
                    }
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-months">Todos</SelectItem>
                    {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Botón reset */}
              {isFiltered && (
                <Button variant="outline" size="sm" onClick={resetDrill}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Resetear
                </Button>
              )}
            </div>
          </div>
          
          {/* Breadcrumbs */}
          <div className="mt-3 flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground" />}
                <Button
                  variant={index === breadcrumbs.length - 1 ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleBreadcrumbClick(crumb)}
                  disabled={index === breadcrumbs.length - 1}
                >
                  {crumb.label}
                </Button>
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className={cn('border-t-2', getTransition('normal'))}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
              {stat.subValue && (
                <p className="text-xs text-muted-foreground">{stat.subValue}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Trend Chart */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{trendTitle}</CardTitle>
            <p className="text-xs text-muted-foreground">{trendSubtitle}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                {drillState.level === 'all' ? (
                  <BarChart
                    data={trendData}
                    onClick={(e) => e?.activePayload?.[0]?.payload && handleTrendClick(e.activePayload[0].payload)}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill={trendColor}
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                  </BarChart>
                ) : (
                  <LineChart
                    data={monthlyDistribution}
                    onClick={(e) => e?.activePayload?.[0]?.payload && handleTrendClick(e.activePayload[0].payload)}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={trendColor}
                      strokeWidth={2}
                      dot={{ r: 4, fill: trendColor }}
                      activeDot={{ r: 6, cursor: 'pointer' }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Chart */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{distributionTitle}</CardTitle>
            <p className="text-xs text-muted-foreground">{distributionSubtitle}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={distributionData}
                  onClick={(e) => e?.activePayload?.[0]?.payload && handleDistributionClick(e.activePayload[0].payload)}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    className="text-muted-foreground"
                    interval={drillState.level === 'month' ? 2 : 0}
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill={distributionColor}
                    radius={[4, 4, 0, 0]}
                    cursor={drillState.level !== 'month' ? 'pointer' : 'default'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      {showHeatmap && (
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Mapa de Calor Semanal (Horas x Días)</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Intensidad de actividad por hora y día de la semana
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Header de horas */}
                <div className="mb-2 flex">
                  <div className="w-12 shrink-0" />
                  {Array.from({ length: 24 }, (_, i) => (
                    <div
                      key={i}
                      className="flex-1 text-center text-xs text-muted-foreground"
                    >
                      {i.toString().padStart(2, '0')}
                    </div>
                  ))}
                </div>
                
                {/* Filas de días */}
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, dayIndex) => {
                  // Ajustar índice para que Lunes sea 1 y Domingo sea 0
                  const adjustedIndex = dayIndex === 6 ? 0 : dayIndex + 1;
                  
                  return (
                    <div key={day} className="mb-1 flex items-center">
                      <div className="w-12 shrink-0 text-sm font-medium text-primary">
                        {day}
                      </div>
                      <div className="flex flex-1 gap-0.5">
                        {Array.from({ length: 24 }, (_, hour) => {
                          const cell = heatmapData.find(
                            (c) => c.day === adjustedIndex && c.hour === hour
                          );
                          const value = cell?.value || 0;
                          const intensity = getHeatmapIntensity(value);
                          
                          return (
                            <div
                              key={hour}
                              className={cn(
                                'aspect-square flex-1 rounded-sm transition-colors',
                                getTransition('fast')
                              )}
                              style={{
                                backgroundColor: `hsl(var(--primary) / ${intensity})`,
                              }}
                              title={`${day} ${hour}:00 - ${value} ${entityNamePlural.toLowerCase()}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {/* Leyenda */}
                <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  <span>Menos</span>
                  <div className="flex gap-0.5">
                    {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1].map((opacity, i) => (
                      <div
                        key={i}
                        className="h-4 w-4 rounded-sm"
                        style={{
                          backgroundColor: `hsl(var(--primary) / ${opacity})`,
                        }}
                      />
                    ))}
                  </div>
                  <span>Más</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ActivityPeak;
