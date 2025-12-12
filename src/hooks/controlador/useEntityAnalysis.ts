import { useMemo, useCallback } from 'react';
import { useComparisonFilters, type ComparisonFiltersConfig, type ComparisonFiltersState } from './useComparisonFilters';

export interface EntityAnalysisConfig<T> extends ComparisonFiltersConfig {
  /** Data array to analyze */
  data: T[];
  /** Date field name for temporal analysis */
  dateField: keyof T;
  /** Entity singular name */
  entityName: string;
  /** Entity plural name */
  entityNamePlural: string;
  /** Field for status distribution (optional) */
  statusField?: keyof T;
  /** Field for priority distribution (optional) */
  priorityField?: keyof T;
  /** Field for category distribution (optional) */
  categoryField?: keyof T;
  /** Field for type distribution (optional) */
  typeField?: keyof T;
  /** Field for visibility distribution (optional) */
  visibilityField?: keyof T;
}

export interface EntityStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  recent: number;
  recentLabel: string;
}

/**
 * Hook universal para análisis de cualquier entidad
 * Combina filtros, estadísticas y distribuciones
 */
export function useEntityAnalysis<T extends Record<string, unknown>>(
  config: EntityAnalysisConfig<T>
) {
  const {
    data,
    dateField,
    entityName,
    entityNamePlural,
    statusField,
    priorityField,
    categoryField,
    typeField,
    visibilityField,
    ...filtersConfig
  } = config;

  // Obtener controlador de filtros de comparación
  const filtersController = useComparisonFilters(filtersConfig);
  const { filters, hasActiveFilters } = filtersController;

  // Aplicar filtros a los datos
  const filteredData = useMemo(() => {
    let result = [...data];

    // Filtrar por rango de fechas
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      result = result.filter((item) => {
        const itemDate = new Date(item[dateField] as string);
        if (filters.dateRange.startDate && itemDate < filters.dateRange.startDate) {
          return false;
        }
        if (filters.dateRange.endDate && itemDate > filters.dateRange.endDate) {
          return false;
        }
        return true;
      });
    }

    // Filtrar por prioridades
    if (filters.priorities.length > 0 && priorityField) {
      result = result.filter((item) => 
        filters.priorities.includes(String(item[priorityField]))
      );
    }

    // Filtrar por tipos
    if (filters.types.length > 0 && typeField) {
      result = result.filter((item) => 
        filters.types.includes(String(item[typeField]))
      );
    }

    // Filtrar por categorías
    if (filters.categories.length > 0 && categoryField) {
      result = result.filter((item) => 
        filters.categories.includes(String(item[categoryField]))
      );
    }

    // Filtrar por estados
    if (filters.statuses.length > 0 && statusField) {
      result = result.filter((item) => 
        filters.statuses.includes(String(item[statusField]))
      );
    }

    // Filtrar por items seleccionados
    if (filters.selectedItems.length > 0) {
      result = result.filter((item) => 
        filters.selectedItems.includes(String((item as Record<string, unknown>).id))
      );
    }

    return result;
  }, [data, filters, dateField, priorityField, typeField, categoryField, statusField]);

  // Calcular estadísticas generales
  const stats = useMemo<EntityStats>(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let pending = 0;
    let inProgress = 0;
    let resolved = 0;
    let recent = 0;

    filteredData.forEach((item) => {
      // Contar por estado
      if (statusField) {
        const status = String(item[statusField]);
        if (status === 'pendiente') pending++;
        else if (status === 'en_proceso') inProgress++;
        else if (status === 'resuelto') resolved++;
      }

      // Contar recientes
      const itemDate = new Date(item[dateField] as string);
      if (itemDate >= sevenDaysAgo) {
        recent++;
      }
    });

    return {
      total: filteredData.length,
      pending,
      inProgress,
      resolved,
      recent,
      recentLabel: 'Últimos 7 días',
    };
  }, [filteredData, statusField, dateField]);

  // Distribución por estado
  const statusDistribution = useMemo(() => {
    if (!statusField) return [];

    const counts: Record<string, number> = {};
    const statusLabels: Record<string, string> = {
      pendiente: 'Pendientes',
      en_proceso: 'En Proceso',
      resuelto: 'Resueltos',
      rechazado: 'Rechazado',
      cancelado: 'Cancelado',
    };

    const statusColors: Record<string, string> = {
      pendiente: 'hsl(38, 92%, 50%)',
      en_proceso: 'hsl(217, 91%, 50%)',
      resuelto: 'hsl(142, 76%, 36%)',
      rechazado: 'hsl(0, 84%, 60%)',
      cancelado: 'hsl(220, 9%, 46%)',
    };

    filteredData.forEach((item) => {
      const status = String(item[statusField]);
      counts[status] = (counts[status] || 0) + 1;
    });

    return Object.entries(counts).map(([key, value]) => ({
      name: statusLabels[key] || key,
      value,
      color: statusColors[key] || 'hsl(217, 91%, 50%)',
    }));
  }, [filteredData, statusField]);

  // Distribución por prioridad con desglose por estado
  const priorityDistribution = useMemo(() => {
    if (!priorityField) return [];

    const priorityLabels: Record<string, string> = {
      bajo: 'Bajo',
      medio: 'Medio',
      alto: 'Alto',
      urgente: 'Urgente',
    };

    const priorityColors: Record<string, string> = {
      bajo: 'hsl(189, 94%, 43%)',
      medio: 'hsl(217, 91%, 50%)',
      alto: 'hsl(38, 92%, 50%)',
      urgente: 'hsl(0, 84%, 60%)',
    };

    // Agrupar por prioridad con desglose por estado
    const priorityStats: Record<string, { total: number; pending: number; inProgress: number; resolved: number }> = {};

    filteredData.forEach((item) => {
      const priority = String(item[priorityField]);
      const status = statusField ? String(item[statusField]) : '';

      if (!priorityStats[priority]) {
        priorityStats[priority] = { total: 0, pending: 0, inProgress: 0, resolved: 0 };
      }

      priorityStats[priority].total += 1;

      // Clasificar por estado
      if (status === 'pendiente' || status === 'pending') {
        priorityStats[priority].pending += 1;
      } else if (status === 'en_proceso' || status === 'in_progress') {
        priorityStats[priority].inProgress += 1;
      } else if (status === 'resuelto' || status === 'resolved') {
        priorityStats[priority].resolved += 1;
      }
    });

    return Object.entries(priorityStats).map(([key, stats]) => ({
      name: priorityLabels[key] || key,
      key,
      value: stats.total,
      pending: stats.pending,
      inProgress: stats.inProgress,
      resolved: stats.resolved,
      color: priorityColors[key] || 'hsl(217, 91%, 50%)',
    }));
  }, [filteredData, priorityField, statusField]);

  // Distribución por categoría
  const categoryDistribution = useMemo(() => {
    if (!categoryField) return [];

    const counts: Record<string, number> = {};

    filteredData.forEach((item) => {
      const category = String(item[categoryField]);
      if (category && category !== 'undefined' && category !== 'null') {
        counts[category] = (counts[category] || 0) + 1;
      }
    });

    // Buscar nombres de categoría desde categoryOptions
    const categoryOptionsMap = new Map(
      (filtersConfig.categoryOptions || []).map(opt => [opt.id, opt])
    );

    return Object.entries(counts).map(([key, value], index) => {
      const option = categoryOptionsMap.get(key);
      return {
        name: option?.label || key,
        value,
        color: option?.color || `hsl(${(index * 45) % 360}, 70%, 50%)`,
      };
    });
  }, [filteredData, categoryField, filtersConfig.categoryOptions]);

  // Distribución por tipo
  const typeDistribution = useMemo(() => {
    if (!typeField) return [];

    const counts: Record<string, number> = {};

    filteredData.forEach((item) => {
      const type = String(item[typeField]);
      if (type && type !== 'undefined' && type !== 'null') {
        counts[type] = (counts[type] || 0) + 1;
      }
    });

    // Buscar nombres de tipo desde typeOptions
    const typeOptionsMap = new Map(
      (filtersConfig.typeOptions || []).map(opt => [opt.id, opt])
    );

    return Object.entries(counts).map(([key, value], index) => {
      const option = typeOptionsMap.get(key);
      return {
        name: option?.label || key,
        value,
        color: option?.color || `hsl(${(index * 60 + 30) % 360}, 70%, 50%)`,
      };
    });
  }, [filteredData, typeField, filtersConfig.typeOptions]);

  // Distribución por visibilidad
  const visibilityDistribution = useMemo(() => {
    if (!visibilityField) return [];

    const counts: Record<string, number> = {};
    const visibilityLabels: Record<string, string> = {
      publico: 'Público',
      privado: 'Privado',
    };

    const visibilityColors: Record<string, string> = {
      publico: 'hsl(142, 76%, 36%)',
      privado: 'hsl(217, 91%, 50%)',
    };

    filteredData.forEach((item) => {
      const visibility = String(item[visibilityField] || 'publico');
      counts[visibility] = (counts[visibility] || 0) + 1;
    });

    const total = filteredData.length;
    return Object.entries(counts).map(([key, value]) => ({
      name: visibilityLabels[key] || key,
      value,
      color: visibilityColors[key] || 'hsl(217, 91%, 50%)',
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }));
  }, [filteredData, visibilityField]);

  // Resumen de estados con porcentajes
  const statusSummary = useMemo(() => {
    const total = filteredData.length;
    
    return statusDistribution.map((item) => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [statusDistribution, filteredData.length]);

  // Distribución temporal (dinámico según filtros de fecha)
  const temporalDistribution = useMemo(() => {
    const now = new Date();
    
    // Calcular el rango de días basado en filtros
    let startDate: Date;
    let endDate: Date = filters.dateRange.endDate || now;
    let daysInRange: number;
    let rangeLabel: string;

    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      // Ambas fechas definidas
      startDate = filters.dateRange.startDate;
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      daysInRange = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      rangeLabel = `Últimos ${daysInRange} días`;
    } else if (filters.dateRange.startDate) {
      // Solo fecha inicial
      startDate = filters.dateRange.startDate;
      const diffTime = Math.abs(now.getTime() - startDate.getTime());
      daysInRange = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      rangeLabel = `Últimos ${daysInRange} días`;
    } else if (filters.dateRange.endDate) {
      // Solo fecha final - usar 7 días antes
      daysInRange = 7;
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      rangeLabel = 'Últimos 7 días';
    } else {
      // Sin filtros - usar últimos 7 días
      daysInRange = 7;
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      rangeLabel = 'Últimos 7 días';
    }

    const recentCount = filteredData.filter((item) => {
      const itemDate = new Date(item[dateField] as string);
      return itemDate >= startDate && itemDate <= endDate;
    }).length;

    const dailyAverage = recentCount / daysInRange;

    return {
      recentCount,
      daysInRange,
      rangeLabel,
      dailyAverage: Math.round(dailyAverage * 10) / 10,
      total: filteredData.length,
    };
  }, [filteredData, dateField, filters.dateRange]);

  // Eficiencia del sistema
  const efficiency = useMemo(() => {
    const total = filteredData.length;
    const resolved = stats.resolved;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const categoriesCount = categoryDistribution.length || 1;
    const typesCount = typeDistribution.length || 1;

    return {
      resolutionRate,
      perCategory: Math.round((total / categoriesCount) * 10) / 10,
      perType: Math.round((total / typesCount) * 10) / 10,
    };
  }, [filteredData.length, stats.resolved, categoryDistribution.length, typeDistribution.length]);

  return {
    // Data
    filteredData,
    originalData: data,
    
    // Stats
    stats,
    statusDistribution,
    priorityDistribution,
    categoryDistribution,
    typeDistribution,
    visibilityDistribution,
    statusSummary,
    temporalDistribution,
    efficiency,
    
    // Filters
    filtersController,
    hasActiveFilters,
    
    // Meta
    entityName,
    entityNamePlural,
  };
}

export type UseEntityAnalysisReturn<T extends Record<string, unknown>> = ReturnType<typeof useEntityAnalysis<T>>;
