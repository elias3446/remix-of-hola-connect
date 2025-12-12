/**
 * BarChart - Gráfico de barras reutilizable
 * Para comparar valores entre categorías
 */
import { memo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';

export interface BarDataPoint {
  name: string;
  value: number;
  value2?: number;
  color?: string;
}

export interface BarChartProps {
  /** Título del gráfico */
  title: string;
  /** Descripción del gráfico */
  description?: string;
  /** Datos de las barras */
  data: BarDataPoint[];
  /** Color primario de las barras */
  barColor?: string;
  /** Color secundario (para comparación) */
  barColor2?: string;
  /** Altura del gráfico */
  height?: number;
  /** Mostrar grid */
  showGrid?: boolean;
  /** Mostrar leyenda */
  showLegend?: boolean;
  /** Labels para leyenda */
  legendLabels?: [string, string];
  /** Layout horizontal o vertical */
  layout?: 'horizontal' | 'vertical';
  /** Mensaje cuando no hay datos */
  emptyMessage?: string;
  /** Delay de animación */
  delay?: number;
  /** Clase adicional */
  className?: string;
}

const DEFAULT_COLORS = [
  'hsl(0, 84%, 60%)',
  'hsl(217, 91%, 60%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
];

export const BarChartComponent = memo(function BarChartComponent({
  title,
  description,
  data,
  barColor = 'hsl(0, 84%, 60%)',
  barColor2 = 'hsl(217, 91%, 60%)',
  height = 200,
  showGrid = true,
  showLegend = false,
  legendLabels = ['Me gusta', 'Comentarios'],
  layout = 'horizontal',
  emptyMessage = 'Sin datos disponibles',
  delay = 0,
  className,
}: BarChartProps) {
  const hasData = data.length > 0 && data.some(d => d.value > 0 || (d.value2 && d.value2 > 0));
  const hasMultipleBars = data.some(d => d.value2 !== undefined);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
          <p className="font-medium text-foreground text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.dataKey === 'value' ? legendLabels[0] : legendLabels[1]}: {entry.value}
            </p>
          ))}
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
          <>
            <div style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={data}
                  layout={layout === 'vertical' ? 'vertical' : 'horizontal'}
                  margin={{ top: 10, right: 10, bottom: 10, left: layout === 'vertical' ? 80 : 0 }}
                >
                  {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
                  {layout === 'vertical' ? (
                    <>
                      <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        width={75}
                      />
                    </>
                  ) : (
                    <>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                    </>
                  )}
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} name={legendLabels[0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || barColor} />
                    ))}
                  </Bar>
                  {hasMultipleBars && (
                    <Bar dataKey="value2" fill={barColor2} radius={[4, 4, 0, 0]} name={legendLabels[1]} />
                  )}
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            {showLegend && hasMultipleBars && (
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: barColor }} />
                  <span className="text-xs text-muted-foreground">{legendLabels[0]}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: barColor2 }} />
                  <span className="text-xs text-muted-foreground">{legendLabels[1]}</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

export { BarChartComponent as BarChart };
