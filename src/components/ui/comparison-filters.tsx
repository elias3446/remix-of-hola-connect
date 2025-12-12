import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Filter,
  X,
  RefreshCw,
  Calendar as CalendarIcon,
  Search,
  ChevronDown,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAnimations, transitionClasses } from '@/hooks/optimizacion/useAnimations';
import type {
  FilterTab,
  FilterOption,
  UseComparisonFiltersReturn,
} from '@/hooks/controlador/useComparisonFilters';

interface ComparisonFiltersProps {
  controller: UseComparisonFiltersReturn;
  className?: string;
  title?: string;
}

interface TabConfig {
  id: FilterTab;
  label: string;
}

const allTabs: TabConfig[] = [
  { id: 'busqueda', label: 'Búsqueda' },
  { id: 'fechas', label: 'Fechas' },
  { id: 'prioridad', label: 'Prioridad' },
  { id: 'tipo', label: 'Tipo' },
  { id: 'categoria', label: 'Categoría' },
  { id: 'estado', label: 'Estado' },
  { id: 'confirmacion', label: 'Confirmación' },
  { id: 'roles', label: 'Roles' },
  { id: 'permisos', label: 'Permisos' },
];

const ComparisonFilters = React.forwardRef<HTMLDivElement, ComparisonFiltersProps>(
  ({ controller, className, title = 'Filtros de Comparación' }, ref) => {
    const { getTransition } = useAnimations();
    
    const {
      isOpen,
      activeTab,
      filters,
      activeFiltersSummary,
      filteredSearchableItems,
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
      enabledTabs,
      minItems,
      priorityOptions,
      typeOptions,
      categoryOptions,
      statusOptions,
      confirmationOptions,
      roleOptions,
      permissionOptions,
    } = controller;

    const visibleTabs = React.useMemo(
      () => allTabs.filter((tab) => enabledTabs.includes(tab.id)),
      [enabledTabs]
    );

    const renderCheckboxGroup = (
      options: FilterOption[],
      selectedValues: string[],
      category: 'priorities' | 'types' | 'categories' | 'statuses' | 'confirmations' | 'roles' | 'permissions',
      description?: string
    ) => (
      <div className="space-y-4">
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <div className="space-y-3">
          {options.map((option) => (
            <div key={option.id} className="flex items-center space-x-3">
              <Checkbox
                id={`${category}-${option.id}`}
                checked={selectedValues.includes(option.id)}
                onCheckedChange={() => toggleFilterOption(category, option.id)}
                className={getTransition('fast')}
              />
              <Label
                htmlFor={`${category}-${option.id}`}
                className="text-sm font-normal cursor-pointer flex items-center gap-2"
              >
                {option.color && (
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    );

    const renderSearchTab = () => (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            Selecciona Reportes para Comparar (mínimo {minItems})
          </p>
          <p className="text-sm text-primary mt-1">
            Reportes disponibles: {filteredSearchableItems.length}
          </p>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between text-muted-foreground font-normal"
            >
              <span>Buscar reportes para comparar...</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar reportes..."
                  value={filters.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {filters.selectedItems.length}/{filteredSearchableItems.length} reportes seleccionados
              </p>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="p-2 space-y-1">
                {filteredSearchableItems.map((item) => {
                  const isSelected = filters.selectedItems.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg cursor-pointer',
                        getTransition('fast'),
                        isSelected ? 'bg-accent/50' : 'hover:bg-muted'
                      )}
                      onClick={() => toggleItem(item.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredSearchableItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No se encontraron reportes
                  </p>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    );

    const renderDateTab = () => (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Fecha Inicial
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !filters.dateRange.startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.startDate ? (
                    format(filters.dateRange.startDate, 'dd/MM/yyyy', { locale: es })
                  ) : (
                    <span>dd/mm/aaaa</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.startDate}
                  onSelect={(date) =>
                    setDateRange({ ...filters.dateRange, startDate: date })
                  }
                  initialFocus
                  className="pointer-events-auto"
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Fecha Final
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !filters.dateRange.endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.endDate ? (
                    format(filters.dateRange.endDate, 'dd/MM/yyyy', { locale: es })
                  ) : (
                    <span>dd/mm/aaaa</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.endDate}
                  onSelect={(date) =>
                    setDateRange({ ...filters.dateRange, endDate: date })
                  }
                  disabled={(date) =>
                    filters.dateRange.startDate
                      ? date < filters.dateRange.startDate
                      : false
                  }
                  initialFocus
                  className="pointer-events-auto"
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    );

    const renderTabContent = () => {
      switch (activeTab) {
        case 'busqueda':
          return renderSearchTab();
        case 'fechas':
          return renderDateTab();
        case 'prioridad':
          return renderCheckboxGroup(
            priorityOptions,
            filters.priorities,
            'priorities',
            'Selecciona una o más prioridades'
          );
        case 'tipo':
          return typeOptions.length > 0 ? (
            renderCheckboxGroup(
              typeOptions,
              filters.types,
              'types',
              'Selecciona uno o más tipos'
            )
          ) : (
            <p className="text-sm text-muted-foreground">No hay tipos disponibles</p>
          );
        case 'categoria':
          return categoryOptions.length > 0 ? (
            renderCheckboxGroup(
              categoryOptions,
              filters.categories,
              'categories',
              'Selecciona una o más categorías'
            )
          ) : (
            <p className="text-sm text-muted-foreground">No hay categorías disponibles</p>
          );
        case 'estado':
          return renderCheckboxGroup(
            statusOptions,
            filters.statuses,
            'statuses',
            'Selecciona uno o más estados'
          );
        case 'confirmacion':
          return renderCheckboxGroup(
            confirmationOptions,
            filters.confirmations,
            'confirmations',
            'Selecciona el estado de confirmación'
          );
        case 'roles':
          return roleOptions.length > 0 ? (
            renderCheckboxGroup(
              roleOptions,
              filters.roles,
              'roles',
              'Selecciona uno o más roles'
            )
          ) : (
            <p className="text-sm text-muted-foreground">No hay roles disponibles</p>
          );
        case 'permisos':
          return permissionOptions.length > 0 ? (
            renderCheckboxGroup(
              permissionOptions,
              filters.permissions,
              'permissions',
              'Selecciona uno o más permisos'
            )
          ) : (
            <p className="text-sm text-muted-foreground">No hay permisos disponibles</p>
          );
        default:
          return null;
      }
    };

    return (
      <div ref={ref} className={cn('w-full', className)}>
        <Collapsible open={isOpen} onOpenChange={toggleOpen}>
          {!isOpen && (
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-center gap-2 border-primary/30 text-primary hover:bg-primary/5',
                  getTransition('normal')
                )}
              >
                <Filter className="h-4 w-4" />
                Mostrar {title}
              </Button>
            </CollapsibleTrigger>
          )}
          
          <CollapsibleContent className={cn('mt-4', transitionClasses.normal)}>
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground gap-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Limpiar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={close}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-1 mb-4 border-b border-border pb-2">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-t-md',
                      getTransition('fast'),
                      activeTab === tab.id
                        ? 'bg-background text-foreground border border-b-0 border-border -mb-[1px]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[150px] py-2">
                {renderTabContent()}
              </div>

              {/* Active Filters Summary */}
              {activeFiltersSummary.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border mt-4">
                  <span className="text-sm text-muted-foreground">Filtros activos:</span>
                  {activeFiltersSummary.map((filter) => (
                    <Badge
                      key={filter.key}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive/10"
                      onClick={() => {
                        if (filter.key === 'items') {
                          filters.selectedItems.forEach(removeItem);
                        } else if (filter.key === 'dateRange') {
                          clearDateRange();
                        } else {
                          const categoryMap: Record<string, keyof typeof filters> = {
                            priorities: 'priorities',
                            types: 'types',
                            categories: 'categories',
                            statuses: 'statuses',
                            confirmations: 'confirmations',
                            roles: 'roles',
                            permissions: 'permissions',
                          };
                          const category = categoryMap[filter.key];
                          if (category && Array.isArray(filters[category])) {
                            (filters[category] as string[]).forEach((id) =>
                              removeFilter(filter.key as any, id)
                            );
                          }
                        }
                      }}
                    >
                      {filter.count} {filter.label}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }
);

ComparisonFilters.displayName = 'ComparisonFilters';

export { ComparisonFilters };
