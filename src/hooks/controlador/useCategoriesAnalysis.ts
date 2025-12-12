import { useMemo } from 'react';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { format, subDays, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface CategoryStats {
  totalCategorias: number;
  categoriaMasUsada: string;
  usoPromedio: number;
  sinUsar: number;
}

interface CategoryDistribution {
  name: string;
  value: number;
  color: string;
}

interface CategoryTrendData {
  date: string;
  label: string;
  [key: string]: string | number;
}

export function useCategoriesAnalysis() {
  const { data: categories, isLoading: loadingCategories } = useOptimizedCategories();
  const { data: reportes, isLoading: loadingReportes } = useOptimizedReportes();

  const analysis = useMemo(() => {
    if (!categories || !reportes) {
      return {
        stats: {
          totalCategorias: 0,
          categoriaMasUsada: 'Sin datos',
          usoPromedio: 0,
          sinUsar: 0,
        },
        reportesPorCategoria: [],
        estadoDistribution: [],
        trendData: [],
        categoryNames: [],
      };
    }

    // Count reports per category
    const reportCountByCategory: Record<string, number> = {};
    categories.forEach(cat => {
      reportCountByCategory[cat.id] = 0;
    });

    reportes.forEach(reporte => {
      if (reporte.categoria_id && reportCountByCategory[reporte.categoria_id] !== undefined) {
        reportCountByCategory[reporte.categoria_id]++;
      }
    });

    // Calculate stats
    const totalCategorias = categories.filter(c => c.activo).length;
    const categoriasConReportes = categories.filter(c => reportCountByCategory[c.id] > 0);
    const categoriasSinReportes = categories.filter(c => reportCountByCategory[c.id] === 0);

    // Find most used category
    let categoriaMasUsada = 'Sin datos';
    let maxReportes = 0;
    categories.forEach(cat => {
      const count = reportCountByCategory[cat.id];
      if (count > maxReportes) {
        maxReportes = count;
        categoriaMasUsada = cat.nombre;
      }
    });

    // Average usage
    const totalReportesCategorias = Object.values(reportCountByCategory).reduce((a, b) => a + b, 0);
    const usoPromedio = categories.length > 0 
      ? Math.round(totalReportesCategorias / categories.length) 
      : 0;

    // Reports per category for bar chart - only categories with reports
    const reportesPorCategoria: CategoryDistribution[] = categories
      .filter(cat => reportCountByCategory[cat.id] > 0)
      .map(cat => ({
        name: cat.nombre.length > 50 ? cat.nombre.substring(0, 50) + '...' : cat.nombre,
        value: reportCountByCategory[cat.id],
        color: cat.color || 'hsl(217, 91%, 60%)',
      }));

    // Estado distribution (activas vs inactivas)
    const activas = categories.filter(c => c.activo).length;
    const inactivas = categories.filter(c => !c.activo).length;
    const estadoDistribution: CategoryDistribution[] = [
      { name: 'Activas', value: activas, color: 'hsl(142, 71%, 45%)' },
      { name: 'Inactivas', value: inactivas, color: 'hsl(33, 100%, 50%)' },
    ];

    // Trend data for last 30 days
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return {
        date: format(date, 'yyyy-MM-dd'),
        label: format(date, 'd MMM', { locale: es }),
      };
    });

    const trendData: CategoryTrendData[] = last30Days.map(day => {
      const dayData: CategoryTrendData = { date: day.date, label: day.label };
      
      categories.forEach(cat => {
        const count = reportes.filter(r => {
          if (r.categoria_id !== cat.id) return false;
          const reportDate = parseISO(r.created_at);
          return format(reportDate, 'yyyy-MM-dd') === day.date;
        }).length;
        dayData[cat.nombre] = count;
      });

      return dayData;
    });

    // Category names for legend
    const categoryNames = categories.map(c => c.nombre);

    return {
      stats: {
        totalCategorias,
        categoriaMasUsada,
        usoPromedio,
        sinUsar: categoriasSinReportes.length,
      },
      reportesPorCategoria,
      estadoDistribution,
      trendData,
      categoryNames,
    };
  }, [categories, reportes]);

  return {
    ...analysis,
    isLoading: loadingCategories || loadingReportes,
  };
}
