import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
} from 'recharts';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import type { ChartDataPoint, StatusDistribution, PriorityDistribution, RoleDistribution } from '@/hooks/controlador/useDashboardStats';

interface DashboardChartsProps {
  reportesTrend: ChartDataPoint[];
  statusDistribution: StatusDistribution[];
  priorityDistribution: PriorityDistribution[];
  socialActivityTrend: ChartDataPoint[];
  rolesDistribution: RoleDistribution[];
}

export const DashboardCharts = memo(function DashboardCharts({
  reportesTrend,
  statusDistribution,
  priorityDistribution,
  socialActivityTrend,
  rolesDistribution,
}: DashboardChartsProps) {
  const hasStatusData = statusDistribution.some(s => s.value > 0);
  const hasPriorityData = priorityDistribution.length > 0;
  const hasRolesData = rolesDistribution.length > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Fila 1: Tendencia de reportes y distribución por estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Reportes últimos 7 días */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Reportes - Últimos 7 días</CardTitle>
            <CardDescription>Tendencia de reportes creados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportesTrend} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
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
                            <p className="text-sm text-muted-foreground">Reportes: {data.value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribución por estado */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Distribución por Estado</CardTitle>
            <CardDescription>Reportes según su estado actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              {hasStatusData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
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
                              <p className="text-sm font-medium">{data.name}</p>
                              <p className="text-sm text-muted-foreground">Cantidad: {data.value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">Sin datos disponibles</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fila 2: Prioridad y actividad social */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Reportes por prioridad */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Reportes por Prioridad</CardTitle>
            <CardDescription>Distribución según nivel de prioridad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {hasPriorityData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityDistribution} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
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
                              <p className="text-sm text-muted-foreground">Cantidad: {data.value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Sin datos disponibles</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actividad social */}
        <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Actividad Social - Últimos 7 días</CardTitle>
            <CardDescription>Publicaciones creadas por día</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={socialActivityTrend} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
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
                            <p className="text-sm text-muted-foreground">Publicaciones: {data.value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fila 3: Usuarios por rol */}
      <Card className={cn(animationClasses.fadeIn, transitionClasses.normal)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Usuarios por Rol</CardTitle>
          <CardDescription>Distribución de usuarios según su rol en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            {hasRolesData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rolesDistribution}
                    cx="30%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {rolesDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                            <p className="text-sm font-medium">{data.name}</p>
                            <p className="text-sm text-muted-foreground">Cantidad: {data.value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value, entry) => {
                      const item = rolesDistribution.find(r => r.name === value);
                      return (
                        <span className="text-sm text-foreground">
                          {value} <span className="font-bold ml-2">{item?.value}</span>
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">Sin datos disponibles</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
