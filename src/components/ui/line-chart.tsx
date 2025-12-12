/**
 * LineChart - Gráfico de línea reutilizable
 * Para visualizar tendencias a lo largo del tiempo
 */
import { memo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';

export interface LineDataPoint {
  name: string;
  value: number;
  label?: string;
}

export interface LineChartProps {
  /** Título del gráfico */
  title: string;
  /** Descripción del gráfico */
  description?: string;
  /** Datos de la línea */
  data: LineDataPoint[];
  /** Color de la línea */
  lineColor?: string;
  /** Color del punto */
  dotColor?: string;
  /** Altura del gráfico */
  height?: number;
  /** Mostrar puntos */
  showDots?: boolean;
  /** Mostrar grid */
  showGrid?: boolean;
  /** Tipo de curva */
  curveType?: 'linear' | 'monotone' | 'step';
  /** Mensaje cuando no hay datos */
  emptyMessage?: string;
  /** Delay de animación */
  delay?: number;
  /** Clase adicional */
  className?: string;
  /** Label eje X */
  xAxisLabel?: string;
  /** Label eje Y */
  yAxisLabel?: string;
}

export const LineChartComponent = memo(function LineChartComponent({
  title,
  description,
  data,
  lineColor = 'hsl(217, 91%, 60%)',
  dotColor = 'hsl(0, 84%, 60%)',
  height = 200,
  showDots = true,
  showGrid = true,
  curveType = 'monotone',
  emptyMessage = 'Sin datos disponibles',
  delay = 0,
  className,
  xAxisLabel,
  yAxisLabel,
}: LineChartProps) {
  const hasData = data.length > 0 && data.some(d => d.value > 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: LineDataPoint }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
          <p className="font-medium text-foreground text-sm">{item.label || item.name}</p>
          <p className="text-xs text-muted-foreground">Puntuación: {item.value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      className={cn(animationClasses.fadeIn, transitionClasses.normal, className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', fontSize: 11, fill: 'hsl(var(--primary))' } : undefined}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 11 } : undefined}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type={curveType}
                  dataKey="value"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={showDots ? { r: 4, fill: dotColor, stroke: dotColor } : false}
                  activeDot={{ r: 6, fill: dotColor }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export { LineChartComponent as LineChart };
