import { memo, useMemo } from 'react';
import { 
  Layers, 
  CheckCircle, 
  TrendingUp, 
  User, 
  Activity,
  BarChart3,
  FolderOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { ComparisonFilters } from '@/components/ui/comparison-filters';
import { DistributionChart } from '@/components/ui/distribution-chart';
import { ActivityPeak } from '@/components/ui/activity-peak';
import { Skeleton } from '@/components/ui/skeleton';
import { useOptimizedTipoReportes } from '@/hooks/entidades/useOptimizedTipoReportes';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { useOptimizedUsers } from '@/hooks/entidades/useOptimizedUsers';
import { useComparisonFilters, type FilterOption, type FilterTab } from '@/hooks/controlador/useComparisonFilters';
import { useAnimations, animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { useResponsive } from '@/hooks/optimizacion/useResponsive';
import { cn } from '@/lib/utils';

// Skeleton de carga
const AnalysisSkeleton = memo(function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    </div>
  );
});

// Configuración de tarjetas de estadísticas
interface StatCardConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  getValue: (stats: TipoStats) => number | string;
  getSubLabel: (stats: TipoStats) => string;
}

interface TipoStats {
  totalTipos: number;
  activos: number;
  inactivos: number;
  enUso: number;
  sinUso: number;
  totalReportes: number;
  tipoMasUsado: string;
  topCreador: string;
  topCreadorCount: number;
  promedioReportesPorTipo: number;
  creadoresUnicos: number;
}

interface TipoWithCreator extends Record<string, unknown> {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  user_id: string;
  category_id?: string | null;
  color?: string | null;
  descripcion?: string | null;
  creador_nombre?: string;
  categoria_nombre?: string;
}

export const TiposComparativeAnalysis = memo(function TiposComparativeAnalysis() {
  const { data: tipoReportes = [], isLoading: isLoadingTipos } = useOptimizedTipoReportes();
  const { data: categories = [], isLoading: isLoadingCategories } = useOptimizedCategories();
  const { data: reportes = [], isLoading: isLoadingReportes } = useOptimizedReportes();
  const { data: users = [], isLoading: isLoadingUsers } = useOptimizedUsers();
  
  const { getTransition } = useAnimations();
  const { isMobile, isTablet } = useResponsive();

  const isLoading = isLoadingTipos || isLoadingCategories || isLoadingReportes || isLoadingUsers;

  // Mapeo de usuarios
  const usersMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach(u => {
      if (u.id && u.name) {
        map.set(u.id, u.name);
      }
    });
    return map;
  }, [users]);

  // Mapeo de categorías
  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => {
      if (c.id) {
        map.set(c.id, c.nombre);
      }
    });
    return map;
  }, [categories]);

  // Tipos con nombre de creador y categoría
  const tiposWithCreator = useMemo<TipoWithCreator[]>(() => {
    return tipoReportes
      .filter(t => !t.deleted_at)
      .map(t => ({
        ...t,
        creador_nombre: usersMap.get(t.user_id) || 'Usuario desconocido',
        categoria_nombre: t.category_id ? categoriesMap.get(t.category_id) || 'Sin categoría' : 'Sin categoría',
      }));
  }, [tipoReportes, usersMap, categoriesMap]);

  // Generar opciones para filtros
  const tipoOptions = useMemo<FilterOption[]>(() => {
    return tiposWithCreator.map(t => ({
      id: t.id,
      label: t.nombre,
      description: t.descripcion || undefined,
      color: t.color || undefined,
    }));
  }, [tiposWithCreator]);

  const categoryOptions = useMemo<FilterOption[]>(() => {
    return categories
      .filter(c => c.activo && !c.deleted_at)
      .map(c => ({
        id: c.id,
        label: c.nombre,
        description: c.descripcion || undefined,
        color: c.color || undefined,
      }));
  }, [categories]);

  const creatorOptions = useMemo<FilterOption[]>(() => {
    const creatorsMap = new Map<string, { id: string; label: string; count: number }>();
    tiposWithCreator.forEach(t => {
      const existing = creatorsMap.get(t.user_id);
      if (existing) {
        existing.count++;
      } else {
        creatorsMap.set(t.user_id, {
          id: t.user_id,
          label: t.creador_nombre || 'Desconocido',
          count: 1,
        });
      }
    });
    return Array.from(creatorsMap.values()).map(c => ({
      id: c.id,
      label: c.label,
      description: `${c.count} tipos`,
    }));
  }, [tiposWithCreator]);

  const statusOptions = useMemo<FilterOption[]>(() => [
    { id: 'activo', label: 'Activos', color: 'hsl(142, 71%, 45%)' },
    { id: 'inactivo', label: 'Inactivos', color: 'hsl(33, 100%, 50%)' },
  ], []);

  const searchableItems = useMemo<FilterOption[]>(() => {
    return tiposWithCreator.map(t => ({
      id: t.id,
      label: t.nombre,
      description: t.descripcion || undefined,
    }));
  }, [tiposWithCreator]);

  // Configuración de filtros
  const enabledTabs: FilterTab[] = ['busqueda', 'categoria', 'fechas', 'estado'];
  
  const filtersController = useComparisonFilters({
    enabledTabs,
    minItems: 0,
    categoryOptions,
    statusOptions,
    searchableItems,
  });

  const { filters } = filtersController;

  // Aplicar filtros
  const filteredTipos = useMemo(() => {
    let result = [...tiposWithCreator];

    // Filtrar por rango de fechas
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      result = result.filter((tipo) => {
        const itemDate = new Date(tipo.created_at);
        if (filters.dateRange.startDate && itemDate < filters.dateRange.startDate) {
          return false;
        }
        if (filters.dateRange.endDate && itemDate > filters.dateRange.endDate) {
          return false;
        }
        return true;
      });
    }

    // Filtrar por categorías
    if (filters.categories.length > 0) {
      result = result.filter((tipo) => 
        tipo.category_id && filters.categories.includes(tipo.category_id)
      );
    }

    // Filtrar por estado
    if (filters.statuses.length > 0) {
      result = result.filter((tipo) => {
        const status = tipo.activo ? 'activo' : 'inactivo';
        return filters.statuses.includes(status);
      });
    }

    // Filtrar por items seleccionados
    if (filters.selectedItems.length > 0) {
      result = result.filter((tipo) => filters.selectedItems.includes(tipo.id));
    }

    return result;
  }, [tiposWithCreator, filters]);

  // Contar reportes por tipo
  const reportesCountByTipo = useMemo(() => {
    const counts: Record<string, number> = {};
    reportes.forEach(r => {
      if (r.tipo_reporte_id) {
        counts[r.tipo_reporte_id] = (counts[r.tipo_reporte_id] || 0) + 1;
      }
    });
    return counts;
  }, [reportes]);

  // Calcular estadísticas
  const stats = useMemo<TipoStats>(() => {
    const activos = filteredTipos.filter(t => t.activo).length;
    const inactivos = filteredTipos.filter(t => !t.activo).length;
    
    // Tipos en uso (con reportes)
    const enUso = filteredTipos.filter(t => (reportesCountByTipo[t.id] || 0) > 0).length;
    const sinUso = filteredTipos.length - enUso;

    // Total de reportes en tipos filtrados
    let totalReportes = 0;
    filteredTipos.forEach(t => {
      totalReportes += reportesCountByTipo[t.id] || 0;
    });

    // Tipo más usado
    let tipoMasUsado = 'Sin datos';
    let maxReportes = 0;
    filteredTipos.forEach(t => {
      const count = reportesCountByTipo[t.id] || 0;
      if (count > maxReportes) {
        maxReportes = count;
        tipoMasUsado = t.nombre;
      }
    });

    // Top creador
    const creatorCounts: Record<string, { name: string; count: number }> = {};
    filteredTipos.forEach(t => {
      if (!creatorCounts[t.user_id]) {
        creatorCounts[t.user_id] = { name: t.creador_nombre || 'Desconocido', count: 0 };
      }
      creatorCounts[t.user_id].count++;
    });

    let topCreador = 'Sin datos';
    let topCreadorCount = 0;
    Object.values(creatorCounts).forEach(c => {
      if (c.count > topCreadorCount) {
        topCreadorCount = c.count;
        topCreador = c.name;
      }
    });

    // Promedio de reportes por tipo
    const promedioReportesPorTipo = filteredTipos.length > 0
      ? Math.round((totalReportes / filteredTipos.length) * 10) / 10
      : 0;

    return {
      totalTipos: filteredTipos.length,
      activos,
      inactivos,
      enUso,
      sinUso,
      totalReportes,
      tipoMasUsado,
      topCreador,
      topCreadorCount,
      promedioReportesPorTipo,
      creadoresUnicos: Object.keys(creatorCounts).length,
    };
  }, [filteredTipos, reportesCountByTipo]);

  // Stat cards configuration
  const statCards: StatCardConfig[] = [
    {
      key: 'total',
      label: 'Total Tipos',
      icon: Layers,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      getValue: (s) => s.totalTipos,
      getSubLabel: (s) => `${s.activos} activos, ${s.inactivos} inactivos`,
    },
    {
      key: 'enUso',
      label: 'En Uso',
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      getValue: (s) => s.enUso,
      getSubLabel: (s) => `Con ${s.totalReportes} reportes asociados`,
    },
    {
      key: 'masUsado',
      label: 'Más Usado',
      icon: TrendingUp,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      getValue: (s) => s.tipoMasUsado.length > 30 ? s.tipoMasUsado.substring(0, 30) + '...' : s.tipoMasUsado,
      getSubLabel: () => 'Tipo más popular',
    },
    {
      key: 'topCreador',
      label: 'Top Creador',
      icon: User,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      getValue: (s) => s.topCreador,
      getSubLabel: (s) => `${s.topCreadorCount} tipos creados`,
    },
  ];

  // Distribución por estado
  const estadoDistribution = useMemo(() => {
    return [
      { name: 'Activos', value: stats.activos, color: 'hsl(142, 71%, 45%)' },
      { name: 'Inactivos', value: stats.inactivos, color: 'hsl(33, 100%, 50%)' },
    ];
  }, [stats]);

  // Reportes por tipo (para gráfico de barras)
  const reportesPorTipo = useMemo(() => {
    return filteredTipos
      .map(t => ({
        name: t.nombre.length > 30 ? t.nombre.substring(0, 30) + '...' : t.nombre,
        value: reportesCountByTipo[t.id] || 0,
        color: t.color || 'hsl(var(--primary))',
      }))
      .filter(t => t.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredTipos, reportesCountByTipo]);

  // Análisis de creadores (para gráfico de donut)
  const creatorDistribution = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    filteredTipos.forEach(t => {
      if (!counts[t.user_id]) {
        counts[t.user_id] = { name: t.creador_nombre || 'Desconocido', count: 0 };
      }
      counts[t.user_id].count++;
    });

    const colors = [
      'hsl(217, 91%, 60%)',
      'hsl(142, 71%, 45%)',
      'hsl(33, 100%, 50%)',
      'hsl(280, 65%, 60%)',
      'hsl(350, 89%, 60%)',
      'hsl(180, 65%, 50%)',
    ];

    return Object.values(counts)
      .map((c, index) => ({
        name: c.name,
        value: c.count,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTipos]);

  // Tipos por categoría (para gráfico de barras)
  const tiposPorCategoria = useMemo(() => {
    const counts: Record<string, { name: string; count: number; color: string }> = {};
    
    filteredTipos.forEach(t => {
      const catId = t.category_id || 'sin-categoria';
      const catName = t.categoria_nombre || 'Sin categoría';
      const cat = categories.find(c => c.id === catId);
      
      if (!counts[catId]) {
        counts[catId] = { 
          name: catName, 
          count: 0, 
          color: cat?.color || 'hsl(var(--primary))' 
        };
      }
      counts[catId].count++;
    });

    return Object.values(counts)
      .map(c => ({
        name: c.name.length > 30 ? c.name.substring(0, 30) + '...' : c.name,
        value: c.count,
        color: c.color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTipos, categories]);

  // Tasa de utilización
  const utilizationRate = useMemo(() => {
    if (stats.totalTipos === 0) return 0;
    return Math.round((stats.enUso / stats.totalTipos) * 100);
  }, [stats]);

  if (isLoading) {
    return <AnalysisSkeleton />;
  }

  return (
    <div className={cn('space-y-6', animationClasses.fadeIn)}>
      <EntityPageHeader
        title="Análisis de Tipos de Reporte"
        description="Análisis comparativo detallado de tipos con filtros avanzados"
        icon={BarChart3}
        entityKey="tipo-reportes"
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
        isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-2' : 'grid-cols-4'
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
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {card.label}
                    </p>
                    <p className={cn('text-2xl font-bold truncate', card.color)}>
                      {value}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{subLabel}</p>
                  </div>
                  <div className={cn('rounded-lg p-2 shrink-0', card.bgColor)}>
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
        data={filteredTipos}
        dateField="created_at"
        entityName="Tipo"
        entityNamePlural="Tipos"
        title="Pico de Actividad de Creación de Tipos"
        description="Explora patrones de creación de tipos con drill-down"
      />

      {/* Distribution Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <DistributionChart
          title="Distribución por Estado"
          description="Tipos activos vs inactivos"
          data={estadoDistribution}
          emptyMessage="No hay tipos disponibles"
        />

        <DistributionChart
          title="Reportes por Tipo"
          description="Distribución de reportes en tipos"
          data={reportesPorTipo}
          emptyMessage="No hay tipos con reportes"
          emptySubMessage="Los tipos aún no tienen reportes asociados"
        />
      </div>

      {/* Creator Analysis */}
      <DistributionChart
        title="Análisis de Creadores"
        description="Usuarios que más tipos han creado"
        data={creatorDistribution}
        emptyMessage="No hay datos de creadores"
      />

      {/* Types by Category */}
      <DistributionChart
        title="Tipos por Categoría"
        description="Distribución de tipos en categorías"
        data={tiposPorCategoria}
        emptyMessage="No hay tipos con categoría asignada"
      />

      {/* Bottom Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Resumen General */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Resumen General</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total tipos</span>
              <span className="text-sm font-medium">{stats.totalTipos}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-500">Tipos activos</span>
              <span className="text-sm font-medium">{stats.activos}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-500">Tipos inactivos</span>
              <span className="text-sm font-medium">{stats.inactivos}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary">Con reportes</span>
              <span className="text-sm font-medium">{stats.enUso}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sin reportes</span>
              <span className="text-sm font-medium">{stats.sinUso}</span>
            </div>
          </CardContent>
        </Card>

        {/* Distribución de Uso */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm font-medium">Distribución de Uso</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-500">En uso</span>
              <span className="text-sm font-medium">
                {stats.totalTipos > 0 ? Math.round((stats.enUso / stats.totalTipos) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-500">Sin uso</span>
              <span className="text-sm font-medium">
                {stats.totalTipos > 0 ? Math.round((stats.sinUso / stats.totalTipos) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary">Activos</span>
              <span className="text-sm font-medium">
                {stats.totalTipos > 0 ? Math.round((stats.activos / stats.totalTipos) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Eficiencia de Tipos */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm font-medium">Eficiencia de Tipos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-rose-500">Tasa de utilización</span>
              <span className="text-sm font-medium">{utilizationRate}%</span>
            </div>
            
            {/* Utilization Rate Visual */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div
                  className="h-20 w-20 rounded-full border-8"
                  style={{
                    borderColor: 'hsl(var(--muted))',
                    background: `conic-gradient(hsl(142, 76%, 36%) ${utilizationRate * 3.6}deg, transparent 0deg)`,
                  }}
                >
                  <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                    <span className="text-lg font-bold text-emerald-500">
                      {utilizationRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Promedio reportes/tipo</span>
              <span className="text-sm font-medium">{stats.promedioReportesPorTipo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Creadores únicos</span>
              <span className="text-sm font-medium">{stats.creadoresUnicos}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default TiposComparativeAnalysis;
