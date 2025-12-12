import { memo, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { EntityAnalysisSkeleton } from '@/components/ui/entity-analysis-skeleton';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { useOptimizedReportes, type ReporteWithDistance } from '@/hooks/entidades/useOptimizedReportes';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';
import { useOptimizedTipoReportes } from '@/hooks/entidades/useOptimizedTipoReportes';
import { Skeleton } from '@/components/ui/skeleton';
import type { FilterOption } from '@/hooks/controlador/useComparisonFilters';

// Loading skeleton
const AnalysisSkeleton = memo(function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      {/* Activity Peak */}
      <Skeleton className="h-[400px]" />
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
      {/* Bottom Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    </div>
  );
});

export const ReportesComparativeAnalysis = memo(function ReportesComparativeAnalysis() {
  const { data: reportes = [], isLoading: isLoadingReportes } = useOptimizedReportes();
  const { data: categories = [], isLoading: isLoadingCategories } = useOptimizedCategories();
  const { data: tipoReportes = [], isLoading: isLoadingTipos } = useOptimizedTipoReportes();

  const isLoading = isLoadingReportes || isLoadingCategories || isLoadingTipos;

  // Filtrar solo reportes activos
  const reportesActivos = useMemo(() => {
    return reportes.filter(r => r.activo && !r.deleted_at);
  }, [reportes]);

  // Generar opciones de categorías desde los datos
  const categoryOptions = useMemo<FilterOption[]>(() => {
    return categories
      .filter(c => c.activo && !c.deleted_at)
      .map(c => ({
        id: c.id,
        label: c.nombre,
        description: c.descripcion || undefined,
        color: c.color || undefined,
        icon: c.icono || undefined,
      }));
  }, [categories]);

  // Generar opciones de tipos desde los datos
  const typeOptions = useMemo<FilterOption[]>(() => {
    return tipoReportes
      .filter(t => t.activo && !t.deleted_at)
      .map(t => ({
        id: t.id,
        label: t.nombre,
        description: t.descripcion || undefined,
        color: t.color || undefined,
        icon: t.icono || undefined,
      }));
  }, [tipoReportes]);

  // Generar items buscables para el filtro de búsqueda
  const searchableItems = useMemo<FilterOption[]>(() => {
    return reportesActivos.map(r => ({
      id: r.id,
      label: r.nombre,
      description: r.descripcion || undefined,
    }));
  }, [reportesActivos]);

  if (isLoading) {
    return <AnalysisSkeleton />;
  }

  return (
    <div className="space-y-6">
      <EntityPageHeader
        title="Análisis Comparativo de Reportes"
        description="Explora patrones de actividad con drill-down desde año hasta hora"
        icon={BarChart3}
        entityKey="reportes"
        showCreate={false}
        showBulkUpload={false}
      />
      
      <EntityAnalysisSkeleton<ReporteWithDistance>
      data={reportesActivos}
      dateField="created_at"
      entityName="Reporte"
      entityNamePlural="Reportes"
      statusField="status"
      priorityField="priority"
      categoryField="categoria_id"
      typeField="tipo_reporte_id"
      visibilityField="visibility"
      title="Pico de Actividad - Análisis Interactivo"
      description="Explora patrones de actividad con drill-down desde año hasta hora"
      showActivityPeak={true}
      showDistributionCharts={true}
      showStatusSummary={true}
      showTemporalDistribution={true}
      showEfficiencyMetrics={true}
      charts={{
        status: true,
        priority: true,
        category: true,
        type: true,
        visibility: true,
      }}
      categoryOptions={categoryOptions}
      typeOptions={typeOptions}
      searchableItems={searchableItems}
    />
    </div>
  );
});

export default ReportesComparativeAnalysis;
