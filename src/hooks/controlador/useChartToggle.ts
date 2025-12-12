import { useState, useCallback, useMemo } from 'react';

export type ChartType = 'pie' | 'bar';

export interface ChartDataItem {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface UseChartToggleConfig {
  defaultType?: ChartType;
  data: ChartDataItem[];
}

export interface UseChartToggleReturn {
  chartType: ChartType;
  setChartType: (type: ChartType) => void;
  toggleChartType: () => void;
  isPie: boolean;
  isBar: boolean;
  
  // Datos procesados
  processedData: ChartDataItem[];
  total: number;
  hasData: boolean;
  maxValue: number;
}

/**
 * Hook para manejar el toggle entre gráfico circular y de barras
 */
export function useChartToggle({
  defaultType = 'pie',
  data,
}: UseChartToggleConfig): UseChartToggleReturn {
  const [chartType, setChartType] = useState<ChartType>(defaultType);

  const toggleChartType = useCallback(() => {
    setChartType((prev) => (prev === 'pie' ? 'bar' : 'pie'));
  }, []);

  // Calcular total
  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  // Calcular valor máximo para el eje Y del gráfico de barras
  const maxValue = useMemo(() => {
    return Math.max(...data.map((item) => item.value), 0);
  }, [data]);

  // Procesar datos con porcentajes
  const processedData = useMemo<ChartDataItem[]>(() => {
    return data.map((item) => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [data, total]);

  const hasData = useMemo(() => {
    return data.length > 0 && total > 0;
  }, [data, total]);

  return {
    chartType,
    setChartType,
    toggleChartType,
    isPie: chartType === 'pie',
    isBar: chartType === 'bar',
    processedData,
    total,
    hasData,
    maxValue,
  };
}
