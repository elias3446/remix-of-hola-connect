/**
 * RadarChart - Gráfico de radar reutilizable
 * Para visualizar múltiples métricas en un solo gráfico
 */
import { memo, useMemo } from 'react';
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';

export interface RadarDataPoint {
  name: string;
  value: number;
  fullMark?: number;
}

export interface RadarChartProps {
  /** Título del gráfico */
  title: string;
  /** Descripción del gráfico */
  description?: string;
  /** Datos del radar */
  data: RadarDataPoint[];
  /** Color del fill */
  fillColor?: string;
  /** Color del stroke */
  strokeColor?: string;
  /** Opacidad del fill */
  fillOpacity?: number;
  /** Altura del gráfico */
  height?: number;
  /** Mostrar eje de radio */
  showRadiusAxis?: boolean;
  /** Mensaje cuando no hay datos */
  emptyMessage?: string;
  /** Delay de animación */
  delay?: number;
  /** Clase adicional */
  className?: string;
}

export const RadarChartComponent = memo(function RadarChartComponent({
  title,
  description,
  data,
  fillColor = 'hsl(217, 91%, 60%)',
  strokeColor = 'hsl(217, 91%, 50%)',
  fillOpacity = 0.3,
  height = 250,
  showRadiusAxis = false,
  emptyMessage = 'Sin datos disponibles',
  delay = 0,
  className,
}: RadarChartProps) {
  const hasData = data.some(d => d.value > 0);

  const processedData = useMemo(() => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return data.map(d => ({
      ...d,
      fullMark: d.fullMark || maxValue,
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: RadarDataPoint }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
          <p className="font-medium text-foreground text-sm">{item.name}</p>
          <p className="text-xs text-muted-foreground">Valor: {item.value}</p>
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
              <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={processedData}>
                <PolarGrid className="stroke-border" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                {showRadiusAxis && (
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 'auto']}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                )}
                <Radar
                  name="Engagement"
                  dataKey="value"
                  stroke={strokeColor}
                  fill={fillColor}
                  fillOpacity={fillOpacity}
                  strokeWidth={2}
                />
                <Tooltip content={<CustomTooltip />} />
              </RechartsRadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export { RadarChartComponent as RadarChart };
