import { useMemo } from 'react';
import { PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useChartToggle, type ChartDataItem, type ChartType } from '@/hooks/controlador/useChartToggle';
import { useAnimations, animationClasses } from '@/hooks/optimizacion/useAnimations';
import { useResponsive } from '@/hooks/optimizacion/useResponsive';
import { cn } from '@/lib/utils';

// Colores por defecto del design system
const DEFAULT_COLORS = [
  'hsl(217, 91%, 50%)',  // primary
  'hsl(142, 76%, 36%)',  // green
  'hsl(38, 92%, 50%)',   // amber
  'hsl(0, 84%, 60%)',    // red
  'hsl(262, 83%, 58%)',  // purple
  'hsl(189, 94%, 43%)',  // cyan
  'hsl(24, 95%, 53%)',   // orange
  'hsl(340, 82%, 52%)',  // pink
];

interface DistributionChartProps {
  title: string;
  description?: string;
  data: ChartDataItem[];
  emptyMessage?: string;
  emptySubMessage?: string;
  defaultChartType?: ChartType;
  showLegend?: boolean;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  className?: string;
  onItemClick?: (item: ChartDataItem) => void;
  /** If true, renders bar chart horizontally (layout="vertical") */
  horizontalBars?: boolean;
  /** Delay de animación */
  delay?: number;
}

export function DistributionChart({
  title,
  description,
  data,
  emptyMessage = 'No hay datos disponibles',
  emptySubMessage,
  defaultChartType = 'pie',
  showLegend = true,
  height = 250,
  innerRadius = 60,
  outerRadius = 90,
  className,
  onItemClick,
  horizontalBars = false,
  delay = 0,
}: DistributionChartProps) {
  const { getTransition } = useAnimations();
  const { isMobile } = useResponsive();

  const {
    chartType,
    setChartType,
    isPie,
    isBar,
    processedData,
    total,
    hasData,
  } = useChartToggle({
    defaultType: defaultChartType,
    data,
  });

  // Asignar colores a los datos si no los tienen
  const coloredData = useMemo(() => {
    return processedData.map((item, index) => ({
      ...item,
      color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));
  }, [processedData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataItem }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderLegend = () => {
    if (!showLegend) return null;
    
    return (
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {coloredData.map((item, index) => (
          <button
            key={index}
            className={cn(
              'flex items-center gap-2 text-sm transition-opacity hover:opacity-80',
              getTransition('fast')
            )}
            onClick={() => onItemClick?.(item)}
          >
            <div
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">
              {item.name} {item.percentage !== undefined && `(${item.percentage}%)`}
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn(getTransition('normal'), animationClasses.fadeIn, className)} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          
          {/* Toggle buttons */}
          <div className="flex rounded-lg border border-border p-0.5">
            <Button
              variant={isPie ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                isPie && 'bg-primary text-primary-foreground'
              )}
              onClick={() => setChartType('pie')}
              title="Gráfico circular"
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={isBar ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                isBar && 'bg-primary text-primary-foreground'
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
          // Empty state
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative mb-4">
              <div
                className="h-32 w-32 rounded-full border-8 border-primary/20"
                style={{ borderColor: 'hsl(var(--primary) / 0.2)' }}
              >
                <div
                  className="absolute inset-2 rounded-full bg-card"
                />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-primary" />
              {emptyMessage}
              {emptySubMessage && ` ${emptySubMessage}`}
            </p>
          </div>
        ) : (
          <>
            <div style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                {isPie ? (
                  <PieChart>
                    <Pie
                      data={coloredData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? innerRadius * 0.8 : innerRadius}
                      outerRadius={isMobile ? outerRadius * 0.8 : outerRadius}
                      paddingAngle={2}
                      dataKey="value"
                      onClick={(_, index) => onItemClick?.(coloredData[index])}
                      cursor={onItemClick ? 'pointer' : 'default'}
                    >
                      {coloredData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className={cn(
                            'transition-opacity',
                            onItemClick && 'hover:opacity-80'
                          )}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                ) : (
                  <BarChart 
                    data={coloredData} 
                    layout={horizontalBars ? 'vertical' : 'horizontal'}
                    margin={horizontalBars ? { left: 100 } : undefined}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    {horizontalBars ? (
                      <>
                        <XAxis 
                          type="number"
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          className="text-muted-foreground"
                          tickLine={false}
                          axisLine={false}
                          width={95}
                        />
                      </>
                    ) : (
                      <>
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          tickLine={false}
                          axisLine={false}
                        />
                      </>
                    )}
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="value"
                      radius={horizontalBars ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                      onClick={(_, index) => onItemClick?.(coloredData[index])}
                      cursor={onItemClick ? 'pointer' : 'default'}
                    >
                      {coloredData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className={cn(
                            'transition-opacity',
                            onItemClick && 'hover:opacity-80'
                          )}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            
            {renderLegend()}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default DistributionChart;
