import { useState, useMemo, useCallback } from 'react';
import { format, getYear, getMonth, getDate, getHours, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos para el drill-down
export type DrillLevel = 'all' | 'year' | 'month';

export interface DrillState {
  level: DrillLevel;
  year: number | null;
  month: number | null;
}

export interface ActivityPeakStats {
  total: number;
  peakHour: string;
  peakHourCount: number;
  peakDay: string;
  peakDayCount: number;
  period: string;
}

export interface YearlyTrendData {
  year: number;
  label: string;
  value: number;
}

export interface MonthlyDistributionData {
  month: number;
  label: string;
  value: number;
}

export interface DailyDistributionData {
  day: number;
  label: string;
  value: number;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  value: number;
  dayLabel: string;
}

export interface UseActivityPeakConfig<T> {
  data: T[];
  dateField: keyof T;
  entityName: string;
  entityNamePlural: string;
  color?: string;
}

export interface UseActivityPeakReturn {
  // Estado del drill-down
  drillState: DrillState;
  setDrillState: (state: DrillState) => void;
  
  // Navegación
  drillDown: (year?: number, month?: number) => void;
  drillUp: () => void;
  resetDrill: () => void;
  breadcrumbs: { label: string; level: DrillLevel; year?: number; month?: number }[];
  
  // Años disponibles para el selector
  availableYears: number[];
  
  // Estadísticas filtradas
  stats: ActivityPeakStats;
  
  // Datos para gráficos
  yearlyTrend: YearlyTrendData[];
  monthlyDistribution: MonthlyDistributionData[];
  dailyDistribution: DailyDistributionData[];
  heatmapData: HeatmapCell[];
  
  // Títulos dinámicos
  trendTitle: string;
  trendSubtitle: string;
  distributionTitle: string;
  distributionSubtitle: string;
  
  // Estado
  isFiltered: boolean;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_NAMES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function useActivityPeak<T extends Record<string, unknown>>({
  data,
  dateField,
  entityName,
  entityNamePlural,
}: UseActivityPeakConfig<T>): UseActivityPeakReturn {
  const [drillState, setDrillState] = useState<DrillState>({
    level: 'all',
    year: null,
    month: null,
  });

  // Extraer años disponibles
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    data.forEach((item) => {
      const dateValue = item[dateField];
      if (dateValue && typeof dateValue === 'string') {
        years.add(getYear(new Date(dateValue)));
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [data, dateField]);

  // Filtrar datos según el nivel de drill
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const dateValue = item[dateField];
      if (!dateValue || typeof dateValue !== 'string') return false;
      
      const date = new Date(dateValue);
      
      if (drillState.level === 'all') return true;
      if (drillState.level === 'year' && drillState.year !== null) {
        return getYear(date) === drillState.year;
      }
      if (drillState.level === 'month' && drillState.year !== null && drillState.month !== null) {
        return getYear(date) === drillState.year && getMonth(date) === drillState.month;
      }
      return true;
    });
  }, [data, dateField, drillState]);

  // Calcular estadísticas
  const stats = useMemo<ActivityPeakStats>(() => {
    const total = filteredData.length;
    
    // Calcular hora pico
    const hourCounts: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;
    
    // Calcular día pico
    const dayCounts: Record<number, number> = {};
    for (let i = 0; i < 7; i++) dayCounts[i] = 0;
    
    filteredData.forEach((item) => {
      const dateValue = item[dateField];
      if (dateValue && typeof dateValue === 'string') {
        const date = new Date(dateValue);
        const hour = getHours(date);
        const day = getDay(date);
        hourCounts[hour]++;
        dayCounts[day]++;
      }
    });
    
    // Encontrar máximos
    let peakHour = 0;
    let peakHourCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > peakHourCount) {
        peakHour = parseInt(hour);
        peakHourCount = count;
      }
    });
    
    let peakDay = 0;
    let peakDayCount = 0;
    Object.entries(dayCounts).forEach(([day, count]) => {
      if (count > peakDayCount) {
        peakDay = parseInt(day);
        peakDayCount = count;
      }
    });
    
    // Determinar periodo
    let period = 'Todos los años';
    if (drillState.level === 'year' && drillState.year !== null) {
      period = `${drillState.year}`;
    } else if (drillState.level === 'month' && drillState.year !== null && drillState.month !== null) {
      period = `${MONTH_NAMES_FULL[drillState.month]} ${drillState.year}`;
    }
    
    return {
      total,
      peakHour: `${peakHour.toString().padStart(2, '0')}:00`,
      peakHourCount,
      peakDay: DAY_NAMES[peakDay],
      peakDayCount,
      period,
    };
  }, [filteredData, dateField, drillState]);

  // Tendencia anual
  const yearlyTrend = useMemo<YearlyTrendData[]>(() => {
    const yearCounts: Record<number, number> = {};
    
    data.forEach((item) => {
      const dateValue = item[dateField];
      if (dateValue && typeof dateValue === 'string') {
        const year = getYear(new Date(dateValue));
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });
    
    return Object.entries(yearCounts)
      .map(([year, value]) => ({
        year: parseInt(year),
        label: year,
        value,
      }))
      .sort((a, b) => a.year - b.year);
  }, [data, dateField]);

  // Distribución mensual
  const monthlyDistribution = useMemo<MonthlyDistributionData[]>(() => {
    const monthCounts: Record<number, number> = {};
    for (let i = 0; i < 12; i++) monthCounts[i] = 0;
    
    const dataToUse = drillState.level === 'all' ? data : filteredData;
    
    dataToUse.forEach((item) => {
      const dateValue = item[dateField];
      if (dateValue && typeof dateValue === 'string') {
        const month = getMonth(new Date(dateValue));
        monthCounts[month]++;
      }
    });
    
    return Object.entries(monthCounts).map(([month, value]) => ({
      month: parseInt(month),
      label: MONTH_NAMES[parseInt(month)],
      value,
    }));
  }, [data, filteredData, dateField, drillState.level]);

  // Distribución diaria (solo cuando hay mes seleccionado)
  const dailyDistribution = useMemo<DailyDistributionData[]>(() => {
    if (drillState.level !== 'month' || drillState.year === null || drillState.month === null) {
      return [];
    }
    
    const daysInMonth = new Date(drillState.year, drillState.month + 1, 0).getDate();
    const dayCounts: Record<number, number> = {};
    for (let i = 1; i <= daysInMonth; i++) dayCounts[i] = 0;
    
    filteredData.forEach((item) => {
      const dateValue = item[dateField];
      if (dateValue && typeof dateValue === 'string') {
        const day = getDate(new Date(dateValue));
        dayCounts[day]++;
      }
    });
    
    return Object.entries(dayCounts).map(([day, value]) => ({
      day: parseInt(day),
      label: day,
      value,
    }));
  }, [filteredData, dateField, drillState]);

  // Datos del heatmap
  const heatmapData = useMemo<HeatmapCell[]>(() => {
    const cells: HeatmapCell[] = [];
    const heatmap: Record<string, number> = {};
    
    // Inicializar todas las celdas
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmap[`${day}-${hour}`] = 0;
      }
    }
    
    filteredData.forEach((item) => {
      const dateValue = item[dateField];
      if (dateValue && typeof dateValue === 'string') {
        const date = new Date(dateValue);
        const day = getDay(date);
        const hour = getHours(date);
        heatmap[`${day}-${hour}`]++;
      }
    });
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        cells.push({
          day,
          hour,
          value: heatmap[`${day}-${hour}`],
          dayLabel: DAY_NAMES[day],
        });
      }
    }
    
    return cells;
  }, [filteredData, dateField]);

  // Títulos dinámicos
  const trendTitle = useMemo(() => {
    if (drillState.level === 'all') return 'Tendencia Anual';
    if (drillState.level === 'year') return `Tendencia Mensual - ${drillState.year}`;
    return `Tendencia Mensual - ${drillState.year}`;
  }, [drillState]);

  const trendSubtitle = useMemo(() => {
    if (drillState.level === 'all') return `Haz clic en un año para ver detalle mensual`;
    return `Haz clic en un mes para ver detalle diario`;
  }, [drillState.level]);

  const distributionTitle = useMemo(() => {
    if (drillState.level === 'all') return 'Distribución Mensual Global';
    if (drillState.level === 'year') return `Distribución Mensual - ${drillState.year}`;
    if (drillState.level === 'month' && drillState.month !== null) {
      return `Distribución Diaria - ${MONTH_NAMES[drillState.month]} ${drillState.year}`;
    }
    return 'Distribución';
  }, [drillState]);

  const distributionSubtitle = useMemo(() => {
    if (drillState.level === 'month') return `${entityNamePlural} por día del mes`;
    return `${entityNamePlural} por mes`;
  }, [drillState.level, entityNamePlural]);

  // Navegación
  const drillDown = useCallback((year?: number, month?: number) => {
    if (drillState.level === 'all' && year !== undefined) {
      setDrillState({ level: 'year', year, month: null });
    } else if (drillState.level === 'year' && month !== undefined) {
      setDrillState({ level: 'month', year: drillState.year, month });
    }
  }, [drillState]);

  const drillUp = useCallback(() => {
    if (drillState.level === 'month') {
      setDrillState({ level: 'year', year: drillState.year, month: null });
    } else if (drillState.level === 'year') {
      setDrillState({ level: 'all', year: null, month: null });
    }
  }, [drillState]);

  const resetDrill = useCallback(() => {
    setDrillState({ level: 'all', year: null, month: null });
  }, []);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; level: DrillLevel; year?: number; month?: number }[] = [
      { label: 'Todos los años', level: 'all' },
    ];
    
    if (drillState.level === 'year' || drillState.level === 'month') {
      crumbs.push({ label: `${drillState.year}`, level: 'year', year: drillState.year! });
    }
    
    if (drillState.level === 'month' && drillState.month !== null) {
      crumbs.push({
        label: `${MONTH_NAMES[drillState.month]} ${drillState.year}`,
        level: 'month',
        year: drillState.year!,
        month: drillState.month,
      });
    }
    
    return crumbs;
  }, [drillState]);

  return {
    drillState,
    setDrillState,
    drillDown,
    drillUp,
    resetDrill,
    breadcrumbs,
    availableYears,
    stats,
    yearlyTrend,
    monthlyDistribution,
    dailyDistribution,
    heatmapData,
    trendTitle,
    trendSubtitle,
    distributionTitle,
    distributionSubtitle,
    isFiltered: drillState.level !== 'all',
  };
}
