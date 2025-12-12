import { useMemo } from 'react';
import { format, subDays, startOfDay, isToday, isThisWeek, isThisMonth, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Activity,
  Mail,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useOptimizedUserAudit, UserAudit } from '@/hooks/entidades/useOptimizedUserAudit';
import { useOptimizedComponent } from '@/hooks/optimizacion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ActivityDashboardProps {
  /** ID del usuario o entidad para filtrar */
  entityId: string;
  /** Tipo de filtro: 'user_id' busca por quién hizo la acción, 'registro_id' busca modificaciones sobre la entidad */
  filterType: 'user_id' | 'registro_id';
  /** Email del usuario (opcional, para mostrar en info) */
  email?: string;
  /** Nombre del usuario/entidad */
  entityName?: string;
  /** Fecha de creación de la entidad */
  createdAt?: string;
  /** Clases adicionales */
  className?: string;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}

const StatCard = ({ title, value, icon, className }: StatCardProps) => (
  <Card className={cn("min-w-0 overflow-hidden", className)}>
    <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-bold">{value}</p>
      </div>
      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
    </CardContent>
  </Card>
);

const COLORS = ['#3b82f6', '#6b7280', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const ACTION_LABELS: Record<string, string> = {
  'UPDATE': 'Actualizar',
  'INSERT': 'Crear',
  'DELETE': 'Eliminar',
  'LOGIN': 'Inicio de sesión',
  'LOGOUT': 'Cierre de sesión',
  'PASSWORD_CHANGE': 'Cambio de contraseña',
  'ROLE_CHANGE': 'Cambio de rol',
  'STATUS_CHANGE': 'Cambio de estado',
};

export function ActivityDashboard({ 
  entityId, 
  filterType,
  email,
  entityName,
  createdAt,
  className 
}: ActivityDashboardProps) {
  const { data: allAuditData, isLoading } = useOptimizedUserAudit();
  
  // Aplicar optimización del componente
  const { stableProps } = useOptimizedComponent(
    { entityId, filterType },
    { componentName: 'ActivityDashboard' }
  );

  // Filtrar datos según el tipo de filtro
  const filteredData = useMemo(() => {
    if (!allAuditData) return [];
    
    if (stableProps.filterType === 'user_id') {
      return allAuditData.filter(record => record.user_id === stableProps.entityId);
    }
    return allAuditData.filter(record => record.registro_id === stableProps.entityId);
  }, [allAuditData, stableProps.entityId, stableProps.filterType]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = filteredData.length;
    const today = filteredData.filter(r => isToday(new Date(r.created_at))).length;
    const thisWeek = filteredData.filter(r => isThisWeek(new Date(r.created_at), { weekStartsOn: 1 })).length;
    const thisMonth = filteredData.filter(r => isThisMonth(new Date(r.created_at))).length;

    return { total, today, thisWeek, thisMonth };
  }, [filteredData]);

  // Datos para gráfico de barras (últimos 7 días)
  const barChartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dayLabel = format(date, 'dd/MM', { locale: es });
      const count = filteredData.filter(r => {
        const recordDate = startOfDay(new Date(r.created_at));
        return recordDate.getTime() === date.getTime();
      }).length;
      
      days.push({ name: dayLabel, actividades: count });
    }
    return days;
  }, [filteredData]);

  // Datos para gráfico de pie (tipos de actividad)
  const pieChartData = useMemo(() => {
    const actionCounts: Record<string, number> = {};
    
    filteredData.forEach(record => {
      const action = record.action || 'UNKNOWN';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });

    return Object.entries(actionCounts).map(([name, value]) => ({
      name: ACTION_LABELS[name] || name,
      value,
      percentage: filteredData.length > 0 
        ? Math.round((value / filteredData.length) * 100) 
        : 0
    }));
  }, [filteredData]);

  // Calcular promedio diario
  const dailyAverage = useMemo(() => {
    if (!createdAt || filteredData.length === 0) return { average: 0, days: 0 };
    
    const daysSinceCreation = Math.max(1, differenceInDays(new Date(), new Date(createdAt)));
    const average = (filteredData.length / daysSinceCreation).toFixed(1);
    
    return { 
      average: parseFloat(average), 
      days: daysSinceCreation 
    };
  }, [filteredData, createdAt]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Actividades"
          value={stats.total}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Hoy"
          value={stats.today}
          icon={<Calendar className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Esta Semana"
          value={stats.thisWeek}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Este Mes"
          value={stats.thisMonth}
          icon={<Clock className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Gráfico de barras */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Actividades por Día (Últimos 7 días)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="w-full h-[180px] sm:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="actividades" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de pie */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Tipos de Actividad</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            {pieChartData.length > 0 ? (
              <div className="w-full h-[180px] sm:h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value, name) => [`${value}`, name]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={40}
                      wrapperStyle={{ fontSize: '10px' }}
                      formatter={(value) => <span className="text-[10px] sm:text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Sin actividades registradas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Información {filterType === 'user_id' ? 'del Usuario' : 'de la Entidad'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email:</p>
                  <p className="text-sm font-medium">{email}</p>
                </div>
              </div>
            )}
            {createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {filterType === 'user_id' ? 'Usuario desde:' : 'Creado:'}
                  </p>
                  <p className="text-sm font-medium">
                    {format(new Date(createdAt), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Promedio diario:</p>
                <p className="text-sm font-medium">
                  {dailyAverage.average} actividades ({dailyAverage.days} {dailyAverage.days === 1 ? 'día' : 'días'} activo)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
