import { useMemo } from 'react';
import { useOptimizedTipoReportes } from '@/hooks/entidades/useOptimizedTipoReportes';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';

export interface TiposAnalysisStats {
  totalTipos: number;
  tipoMasUsado: string;
  usoPromedio: number;
  sinUsar: number;
}

export interface TipoDistribution {
  name: string;
  value: number;
  color: string;
}

export interface TiposPorCategoriaData {
  name: string;
  value: number;
  color: string;
}

// Colores del sistema de diseño
const CHART_COLORS = [
  'hsl(38, 92%, 50%)',   // Amber/Orange
  'hsl(217, 91%, 60%)',  // Blue
  'hsl(142, 76%, 36%)',  // Green
  'hsl(0, 84%, 60%)',    // Red
  'hsl(280, 87%, 65%)',  // Purple
  'hsl(180, 70%, 45%)',  // Cyan
  'hsl(330, 81%, 60%)',  // Pink
  'hsl(45, 93%, 47%)',   // Yellow
];

export function useTiposAnalysis() {
  const { data: tipos = [], isLoading: loadingTipos } = useOptimizedTipoReportes();
  const { data: reportes = [], isLoading: loadingReportes } = useOptimizedReportes();
  const { data: categorias = [], isLoading: loadingCategorias } = useOptimizedCategories();

  const isLoading = loadingTipos || loadingReportes || loadingCategorias;

  // Filtrar solo tipos activos
  const tiposActivos = useMemo(() => {
    return tipos.filter(t => t.activo && !t.deleted_at);
  }, [tipos]);

  // Filtrar reportes activos
  const reportesActivos = useMemo(() => {
    return reportes.filter(r => r.activo && !r.deleted_at);
  }, [reportes]);

  // Contar reportes por tipo
  const reportCountByTipo = useMemo(() => {
    const counts: Record<string, number> = {};
    tiposActivos.forEach(t => {
      counts[t.id] = 0;
    });
    reportesActivos.forEach(r => {
      if (r.tipo_reporte_id && counts[r.tipo_reporte_id] !== undefined) {
        counts[r.tipo_reporte_id]++;
      }
    });
    return counts;
  }, [tiposActivos, reportesActivos]);

  // Contar tipos por categoría
  const tipoCountByCategoria = useMemo(() => {
    const counts: Record<string, number> = {};
    categorias.filter(c => c.activo && !c.deleted_at).forEach(c => {
      counts[c.id] = 0;
    });
    tiposActivos.forEach(t => {
      if (t.category_id && counts[t.category_id] !== undefined) {
        counts[t.category_id]++;
      }
    });
    return counts;
  }, [tiposActivos, categorias]);

  // Estadísticas principales
  const stats = useMemo<TiposAnalysisStats>(() => {
    const total = tiposActivos.length;
    
    // Encontrar el tipo más usado
    let tipoMasUsado = 'Sin datos';
    let maxUso = 0;
    
    tiposActivos.forEach(t => {
      const count = reportCountByTipo[t.id] || 0;
      if (count > maxUso) {
        maxUso = count;
        tipoMasUsado = t.nombre.length > 30 ? t.nombre.substring(0, 30) + '...' : t.nombre;
      }
    });

    // Calcular uso promedio
    const totalReportesConTipo = Object.values(reportCountByTipo).reduce((a, b) => a + b, 0);
    const usoPromedio = total > 0 ? Math.round(totalReportesConTipo / total) : 0;

    // Tipos sin reportes
    const sinUsar = tiposActivos.filter(t => (reportCountByTipo[t.id] || 0) === 0).length;

    return {
      totalTipos: total,
      tipoMasUsado,
      usoPromedio,
      sinUsar,
    };
  }, [tiposActivos, reportCountByTipo]);

  // Distribución de reportes por tipo (solo tipos con reportes)
  const reportesPorTipo = useMemo<TipoDistribution[]>(() => {
    return tiposActivos
      .filter(t => (reportCountByTipo[t.id] || 0) > 0)
      .map((t, index) => ({
        name: t.nombre.length > 25 ? t.nombre.substring(0, 25) + '...' : t.nombre,
        value: reportCountByTipo[t.id] || 0,
        color: t.color || CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [tiposActivos, reportCountByTipo]);

  // Distribución de tipos por categoría (solo categorías con tipos)
  const tiposPorCategoria = useMemo<TiposPorCategoriaData[]>(() => {
    return categorias
      .filter(c => c.activo && !c.deleted_at && (tipoCountByCategoria[c.id] || 0) > 0)
      .map((c, index) => ({
        name: c.nombre.length > 25 ? c.nombre.substring(0, 25) + '...' : c.nombre,
        value: tipoCountByCategoria[c.id] || 0,
        color: c.color || 'hsl(330, 81%, 60%)', // Pink as default
      }))
      .sort((a, b) => b.value - a.value);
  }, [categorias, tipoCountByCategoria]);

  return {
    stats,
    reportesPorTipo,
    tiposPorCategoria,
    isLoading,
  };
}
