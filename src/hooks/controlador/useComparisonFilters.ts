import { useState, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/optimizacion/useOptimizedComponent';

export type FilterTab = 'busqueda' | 'fechas' | 'prioridad' | 'tipo' | 'categoria' | 'estado' | 'confirmacion' | 'roles' | 'permisos';

export interface DateRange {
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export interface ComparisonFiltersState {
  selectedItems: string[];
  dateRange: DateRange;
  priorities: string[];
  types: string[];
  categories: string[];
  statuses: string[];
  confirmations: string[];
  roles: string[];
  permissions: string[];
  searchQuery: string;
}

export interface FilterOption {
  id: string;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface ComparisonFiltersConfig {
  enabledTabs?: FilterTab[];
  minItems?: number;
  maxItems?: number;
  priorityOptions?: FilterOption[];
  typeOptions?: FilterOption[];
  categoryOptions?: FilterOption[];
  statusOptions?: FilterOption[];
  confirmationOptions?: FilterOption[];
  roleOptions?: FilterOption[];
  permissionOptions?: FilterOption[];
  searchableItems?: FilterOption[];
}

const defaultPriorityOptions: FilterOption[] = [
  { id: 'urgente', label: 'Urgente', color: 'hsl(0, 84%, 60%)' },
  { id: 'alto', label: 'Alto', color: 'hsl(25, 95%, 53%)' },
  { id: 'medio', label: 'Medio', color: 'hsl(48, 96%, 53%)' },
  { id: 'bajo', label: 'Bajo', color: 'hsl(142, 71%, 45%)' },
];

const defaultStatusOptions: FilterOption[] = [
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'en_proceso', label: 'En Proceso' },
  { id: 'resuelto', label: 'Resuelto' },
  { id: 'cancelado', label: 'Cancelado' },
];

const defaultConfirmationOptions: FilterOption[] = [
  { id: 'confirmado', label: 'Confirmado' },
  { id: 'no_confirmado', label: 'No Confirmado' },
];

const defaultEnabledTabs: FilterTab[] = ['busqueda', 'fechas', 'prioridad', 'tipo', 'categoria', 'estado'];

const initialState: ComparisonFiltersState = {
  selectedItems: [],
  dateRange: { startDate: undefined, endDate: undefined },
  priorities: [],
  types: [],
  categories: [],
  statuses: [],
  confirmations: [],
  roles: [],
  permissions: [],
  searchQuery: '',
};

/**
 * Hook universal para manejar filtros de comparación en gráficas y estadísticas
 */
export function useComparisonFilters(config: ComparisonFiltersConfig = {}) {
  const {
    enabledTabs = defaultEnabledTabs,
    minItems = 2,
    maxItems = 10,
    priorityOptions = defaultPriorityOptions,
    typeOptions = [],
    categoryOptions = [],
    statusOptions = defaultStatusOptions,
    confirmationOptions = defaultConfirmationOptions,
    roleOptions = [],
    permissionOptions = [],
    searchableItems = [],
  } = config;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>(enabledTabs[0] || 'busqueda');
  const [filters, setFilters] = useState<ComparisonFiltersState>(initialState);
  
  // Debounce search query for performance
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);

  // Toggle panel visibility
  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(initialState);
  }, []);

  // Close panel
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Update search query
  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  // Toggle item selection
  const toggleItem = useCallback((itemId: string) => {
    setFilters((prev) => {
      const isSelected = prev.selectedItems.includes(itemId);
      if (isSelected) {
        return { ...prev, selectedItems: prev.selectedItems.filter((id) => id !== itemId) };
      }
      if (prev.selectedItems.length >= maxItems) {
        return prev;
      }
      return { ...prev, selectedItems: [...prev.selectedItems, itemId] };
    });
  }, [maxItems]);

  // Remove specific item
  const removeItem = useCallback((itemId: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedItems: prev.selectedItems.filter((id) => id !== itemId),
    }));
  }, []);

  // Set date range
  const setDateRange = useCallback((range: DateRange) => {
    setFilters((prev) => ({ ...prev, dateRange: range }));
  }, []);

  // Toggle filter option in a specific category
  const toggleFilterOption = useCallback((category: keyof Omit<ComparisonFiltersState, 'selectedItems' | 'dateRange' | 'searchQuery'>, optionId: string) => {
    setFilters((prev) => {
      const current = prev[category] as string[];
      const isSelected = current.includes(optionId);
      return {
        ...prev,
        [category]: isSelected
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  }, []);

  // Remove specific filter
  const removeFilter = useCallback((category: keyof Omit<ComparisonFiltersState, 'selectedItems' | 'dateRange' | 'searchQuery'>, optionId: string) => {
    setFilters((prev) => ({
      ...prev,
      [category]: (prev[category] as string[]).filter((id) => id !== optionId),
    }));
  }, []);

  // Clear date range
  const clearDateRange = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { startDate: undefined, endDate: undefined },
    }));
  }, []);

  // Get active filters summary
  const activeFiltersSummary = useMemo(() => {
    const summary: { key: string; label: string; count: number }[] = [];
    
    if (filters.selectedItems.length > 0) {
      summary.push({ key: 'items', label: 'reportes seleccionados', count: filters.selectedItems.length });
    }
    if (filters.priorities.length > 0) {
      summary.push({ key: 'priorities', label: 'prioridades', count: filters.priorities.length });
    }
    if (filters.types.length > 0) {
      summary.push({ key: 'types', label: 'tipos', count: filters.types.length });
    }
    if (filters.categories.length > 0) {
      summary.push({ key: 'categories', label: 'categorías', count: filters.categories.length });
    }
    if (filters.statuses.length > 0) {
      summary.push({ key: 'statuses', label: 'estados', count: filters.statuses.length });
    }
    if (filters.confirmations.length > 0) {
      summary.push({ key: 'confirmations', label: 'confirmaciones', count: filters.confirmations.length });
    }
    if (filters.roles.length > 0) {
      summary.push({ key: 'roles', label: 'roles', count: filters.roles.length });
    }
    if (filters.permissions.length > 0) {
      summary.push({ key: 'permissions', label: 'permisos', count: filters.permissions.length });
    }
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      summary.push({ key: 'dateRange', label: 'rango de fechas', count: 1 });
    }
    
    return summary;
  }, [filters]);

  // Check if filters are valid (minimum items selected)
  const hasValidSelection = useMemo(() => {
    return filters.selectedItems.length >= minItems;
  }, [filters.selectedItems.length, minItems]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return activeFiltersSummary.length > 0;
  }, [activeFiltersSummary]);

  // Filter searchable items based on query
  const filteredSearchableItems = useMemo(() => {
    if (!debouncedSearchQuery) return searchableItems;
    const query = debouncedSearchQuery.toLowerCase();
    return searchableItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    );
  }, [searchableItems, debouncedSearchQuery]);

  return {
    // State
    isOpen,
    activeTab,
    filters,
    debouncedSearchQuery,
    
    // Computed
    activeFiltersSummary,
    hasValidSelection,
    hasActiveFilters,
    filteredSearchableItems,
    
    // Actions
    toggleOpen,
    close,
    clearFilters,
    setActiveTab,
    setSearchQuery,
    toggleItem,
    removeItem,
    setDateRange,
    toggleFilterOption,
    removeFilter,
    clearDateRange,
    
    // Config
    enabledTabs,
    minItems,
    maxItems,
    priorityOptions,
    typeOptions,
    categoryOptions,
    statusOptions,
    confirmationOptions,
    roleOptions,
    permissionOptions,
  };
}

export type UseComparisonFiltersReturn = ReturnType<typeof useComparisonFilters>;
