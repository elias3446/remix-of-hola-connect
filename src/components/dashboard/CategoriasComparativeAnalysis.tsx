import { memo, useMemo } from 'react';
import { 
  FolderOpen, 
  CheckCircle, 
  TrendingUp, 
  User, 
  Activity,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { ComparisonFilters } from '@/components/ui/comparison-filters';
import { DistributionChart } from '@/components/ui/distribution-chart';
import { ActivityPeak } from '@/components/ui/activity-peak';
import { Skeleton } from '@/components/ui/skeleton';
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
  getValue: (stats: CategoryStats) => number | string;
  getSubLabel: (stats: CategoryStats) => string;
}

interface CategoryStats {
  totalCategorias: number;
  activas: number;
  inactivas: number;
  enUso: number;
  sinUso: number;
  totalReportes: number;
  categoriaMasUsada: string;
  topCreador: string;
  topCreadorCount: number;
  promedioReportesPorCategoria: number;
  creadoresUnicos: number;
}

interface CategoryWithCreator extends Record<string, unknown> {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  user_id: string;
  color?: string | null;
  descripcion?: string | null;
  creador_nombre?: string;
}

export const CategoriasComparativeAnalysis = memo(function CategoriasComparativeAnalysis() {
  const { data: categories = [], isLoading: isLoadingCategories } = useOptimizedCategories();
  const { data: reportes = [], isLoading: isLoadingReportes } = useOptimizedReportes();
  const { data: users = [], isLoading: isLoadingUsers } = useOptimizedUsers();
  
  const { getTransition } = useAnimations();
  const { isMobile, isTablet } = useResponsive();

  const isLoading = isLoadingCategories || isLoadingReportes || isLoadingUsers;

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

  // Categorías con nombre de creador
  const categoriesWithCreator = useMemo<CategoryWithCreator[]>(() => {
    return categories
      .filter(c => !c.deleted_at)
      .map(c => ({
        ...c,
        creador_nombre: usersMap.get(c.user_id) || 'Usuario desconocido',
      }));
  }, [categories, usersMap]);

  // Generar opciones para filtros
  const categoryOptions = useMemo<FilterOption[]>(() => {
    return categoriesWithCreator.map(c => ({
      id: c.id,
      label: c.nombre,
      description: c.descripcion || undefined,
      color: c.color || undefined,
    }));
  }, [categoriesWithCreator]);

  const creatorOptions = useMemo<FilterOption[]>(() => {
    const creatorsMap = new Map<string, { id: string; label: string; count: number }>();
    categoriesWithCreator.forEach(c => {
      const existing = creatorsMap.get(c.user_id);
      if (existing) {
        existing.count++;
      } else {
        creatorsMap.set(c.user_id, {
          id: c.user_id,
          label: c.creador_nombre || 'Desconocido',
          count: 1,
        });
      }
    });
    return Array.from(creatorsMap.values()).map(c => ({
      id: c.id,
      label: c.label,
      description: `${c.count} categorías`,
    }));
  }, [categoriesWithCreator]);

  const statusOptions = useMemo<FilterOption[]>(() => [
    { id: 'activo', label: 'Activas', color: 'hsl(142, 71%, 45%)' },
    { id: 'inactivo', label: 'Inactivas', color: 'hsl(33, 100%, 50%)' },
  ], []);

  const searchableItems = useMemo<FilterOption[]>(() => {
    return categoriesWithCreator.map(c => ({
      id: c.id,
      label: c.nombre,
      description: c.descripcion || undefined,
    }));
  }, [categoriesWithCreator]);

  // Configuración de filtros
  const enabledTabs: FilterTab[] = ['busqueda', 'categoria', 'fechas', 'estado'];
  
  const filtersController = useComparisonFilters({
    enabledTabs,
    minItems: 0,
    categoryOptions,
    statusOptions,
    searchableItems,
  });

  const { filters, hasActiveFilters } = filtersController;

  // Aplicar filtros
  const filteredCategories = useMemo(() => {
    let result = [...categoriesWithCreator];

    // Filtrar por rango de fechas
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      result = result.filter((cat) => {
        const itemDate = new Date(cat.created_at);
        if (filters.dateRange.startDate && itemDate < filters.dateRange.startDate) {
          return false;
        }
        if (filters.dateRange.endDate && itemDate > filters.dateRange.endDate) {
          return false;
        }
        return true;
      });
    }

    // Filtrar por categorías seleccionadas
    if (filters.categories.length > 0) {
      result = result.filter((cat) => filters.categories.includes(cat.id));
    }

    // Filtrar por estado
    if (filters.statuses.length > 0) {
      result = result.filter((cat) => {
        const status = cat.activo ? 'activo' : 'inactivo';
        return filters.statuses.includes(status);
      });
    }

    // Filtrar por items seleccionados
    if (filters.selectedItems.length > 0) {
      result = result.filter((cat) => filters.selectedItems.includes(cat.id));
    }

    return result;
  }, [categoriesWithCreator, filters]);

  // Contar reportes por categoría
  const reportesCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    reportes.forEach(r => {
      if (r.categoria_id) {
        counts[r.categoria_id] = (counts[r.categoria_id] || 0) + 1;
      }
    });
    return counts;
  }, [reportes]);

  // Calcular estadísticas
  const stats = useMemo<CategoryStats>(() => {
    const activas = filteredCategories.filter(c => c.activo).length;
    const inactivas = filteredCategories.filter(c => !c.activo).length;
    
    // Categorías en uso (con reportes)
    const enUso = filteredCategories.filter(c => (reportesCountByCategory[c.id] || 0) > 0).length;
    const sinUso = filteredCategories.length - enUso;

    // Total de reportes en categorías filtradas
    let totalReportes = 0;
    filteredCategories.forEach(c => {
      totalReportes += reportesCountByCategory[c.id] || 0;
    });

    // Categoría más usada
    let categoriaMasUsada = 'Sin datos';
    let maxReportes = 0;
    filteredCategories.forEach(c => {
      const count = reportesCountByCategory[c.id] || 0;
      if (count > maxReportes) {
        maxReportes = count;
        categoriaMasUsada = c.nombre;
      }
    });

    // Top creador
    const creatorCounts: Record<string, { name: string; count: number }> = {};
    filteredCategories.forEach(c => {
      if (!creatorCounts[c.user_id]) {
        creatorCounts[c.user_id] = { name: c.creador_nombre || 'Desconocido', count: 0 };
      }
      creatorCounts[c.user_id].count++;
    });

    let topCreador = 'Sin datos';
    let topCreadorCount = 0;
    Object.values(creatorCounts).forEach(c => {
      if (c.count > topCreadorCount) {
        topCreadorCount = c.count;
        topCreador = c.name;
      }
    });

    // Promedio de reportes por categoría
    const promedioReportesPorCategoria = filteredCategories.length > 0
      ? Math.round((totalReportes / filteredCategories.length) * 10) / 10
      : 0;

    return {
      totalCategorias: filteredCategories.length,
      activas,
      inactivas,
      enUso,
      sinUso,
      totalReportes,
      categoriaMasUsada,
      topCreador,
      topCreadorCount,
      promedioReportesPorCategoria,
      creadoresUnicos: Object.keys(creatorCounts).length,
    };
  }, [filteredCategories, reportesCountByCategory]);

  // Stat cards configuration
  const statCards: StatCardConfig[] = [
    {
      key: 'total',
      label: 'Total Categorías',
      icon: FolderOpen,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      getValue: (s) => s.totalCategorias,
      getSubLabel: (s) => `${s.activas} activas, ${s.inactivas} inactivas`,
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
      key: 'masUsada',
      label: 'Más Usada',
      icon: TrendingUp,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      getValue: (s) => s.categoriaMasUsada.length > 30 ? s.categoriaMasUsada.substring(0, 30) + '...' : s.categoriaMasUsada,
      getSubLabel: () => 'Categoría más popular',
    },
    {
      key: 'topCreador',
      label: 'Top Creador',
      icon: User,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      getValue: (s) => s.topCreador,
      getSubLabel: (s) => `${s.topCreadorCount} categorías creadas`,
    },
  ];

  // Distribución por estado
  const estadoDistribution = useMemo(() => {
    return [
      { name: 'Activas', value: stats.activas, color: 'hsl(142, 71%, 45%)' },
      { name: 'Inactivas', value: stats.inactivas, color: 'hsl(33, 100%, 50%)' },
    ];
  }, [stats]);

  // Reportes por categoría (para gráfico de barras)
  const reportesPorCategoria = useMemo(() => {
    return filteredCategories
      .map(c => ({
        name: c.nombre.length > 30 ? c.nombre.substring(0, 30) + '...' : c.nombre,
        value: reportesCountByCategory[c.id] || 0,
        color: c.color || 'hsl(var(--primary))',
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredCategories, reportesCountByCategory]);

  // Análisis de creadores (para gráfico de donut)
  const creatorDistribution = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    filteredCategories.forEach(c => {
      if (!counts[c.user_id]) {
        counts[c.user_id] = { name: c.creador_nombre || 'Desconocido', count: 0 };
      }
      counts[c.user_id].count++;
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
  }, [filteredCategories]);

  // Tasa de utilización
  const utilizationRate = useMemo(() => {
    if (stats.totalCategorias === 0) return 0;
    return Math.round((stats.enUso / stats.totalCategorias) * 100);
  }, [stats]);

  if (isLoading) {
    return <AnalysisSkeleton />;
  }

  return (
    <div className={cn('space-y-6', animationClasses.fadeIn)}>
      <EntityPageHeader
        title="Análisis de Categorías"
        description="Análisis comparativo detallado de categorías con filtros avanzados"
        icon={BarChart3}
        entityKey="categorias"
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
        data={filteredCategories}
        dateField="created_at"
        entityName="Categoría"
        entityNamePlural="Categorías"
        title="Pico de Actividad de Creación de Categorías"
        description="Explora patrones de creación de categorías con drill-down"
      />

      {/* Distribution Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <DistributionChart
          title="Distribución por Estado"
          description="Categorías activas vs inactivas"
          data={estadoDistribution}
          emptyMessage="No hay categorías disponibles"
        />

        <DistributionChart
          title="Reportes por Categoría"
          description="Distribución de reportes en categorías"
          data={reportesPorCategoria}
          emptyMessage="No hay categorías con reportes"
          emptySubMessage="Las categorías aún no tienen reportes asociados"
        />
      </div>

      {/* Creator Analysis */}
      <DistributionChart
        title="Análisis de Creadores"
        description="Usuarios que más categorías han creado"
        data={creatorDistribution}
        emptyMessage="No hay datos de creadores"
      />

      {/* Bottom Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Resumen General */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Resumen General</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total categorías</span>
              <span className="text-sm font-medium">{stats.totalCategorias}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-500">Categorías activas</span>
              <span className="text-sm font-medium">{stats.activas}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-500">Categorías inactivas</span>
              <span className="text-sm font-medium">{stats.inactivas}</span>
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
                {stats.totalCategorias > 0 ? Math.round((stats.enUso / stats.totalCategorias) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-500">Sin uso</span>
              <span className="text-sm font-medium">
                {stats.totalCategorias > 0 ? Math.round((stats.sinUso / stats.totalCategorias) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary">Activas</span>
              <span className="text-sm font-medium">
                {stats.totalCategorias > 0 ? Math.round((stats.activas / stats.totalCategorias) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Eficiencia de Categorías */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm font-medium">Eficiencia de Categorías</CardTitle>
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
              <span className="text-sm text-muted-foreground">Promedio reportes/categoría</span>
              <span className="text-sm font-medium">{stats.promedioReportesPorCategoria}</span>
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

export default CategoriasComparativeAnalysis;
