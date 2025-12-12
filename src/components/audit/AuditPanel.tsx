import { useState, useMemo } from 'react';
import { ClipboardList, Activity, History, X } from 'lucide-react';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActividadesTable } from '@/components/table/ActividadesTable';
import { HistorialCambiosTable } from '@/components/table/HistorialCambiosTable';
import { useOptimizedUserAudit } from '@/hooks/entidades/useOptimizedUserAudit';
import { useAuditFilter, AuditFilterOptions } from '@/hooks/controlador/useAuditFilter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useOptimizedComponent,
  transitionClasses,
  animationClasses,
} from '@/hooks/optimizacion';

interface AuditPanelProps {
  /** Filtros iniciales opcionales (muestra UI de filtros) */
  initialFilters?: AuditFilterOptions;
  /** Buscar por user_id (sin UI de filtros) */
  searchByUserId?: string;
  /** Buscar por registro_id (sin UI de filtros) */
  searchByRegistroId?: string;
  /** Título personalizado */
  title?: string;
  /** Descripción personalizada */
  description?: string;
  /** Clase CSS adicional */
  className?: string;
}

export function AuditPanel({ 
  initialFilters, 
  searchByUserId,
  searchByRegistroId,
  title = "Auditoría del Sistema",
  description = "Visualiza las actividades y el historial de cambios del sistema",
  className 
}: AuditPanelProps) {
  const [activeTab, setActiveTab] = useState<'actividades' | 'historial'>('actividades');
  
  // Usar datos directos cuando se busca por userId o registroId (sin UI de filtros)
  const { data: allAuditData, isLoading: directLoading } = useOptimizedUserAudit();
  
  // Usar hook de filtros cuando se pasan initialFilters
  const { 
    data: filteredData, 
    isLoading: filterLoading, 
    filters, 
    clearFilters, 
    hasActiveFilters 
  } = useAuditFilter(initialFilters);

  // Si se pasa searchByUserId, filtrar directamente por user_id
  const dataByUserId = useMemo(() => {
    if (!searchByUserId) return [];
    return allAuditData.filter(record => record.user_id === searchByUserId);
  }, [allAuditData, searchByUserId]);

  // Si se pasa searchByRegistroId, filtrar directamente por registro_id
  const dataByRegistroId = useMemo(() => {
    if (!searchByRegistroId) return [];
    return allAuditData.filter(record => record.registro_id === searchByRegistroId);
  }, [allAuditData, searchByRegistroId]);

  // Determinar qué datos y loading usar
  const isDirectSearch = !!searchByUserId || !!searchByRegistroId;
  const data = searchByUserId ? dataByUserId : searchByRegistroId ? dataByRegistroId : filteredData;
  const isLoading = isDirectSearch ? directLoading : filterLoading;

  // Optimización del componente
  useOptimizedComponent(
    { activeTab, filters, dataLength: data.length },
    { componentName: 'AuditPanel' }
  );

  return (
    <div className={cn(
      'flex flex-col gap-4 p-4 md:p-6 w-full max-w-full',
      animationClasses.fadeIn,
      className
    )}>
      <EntityPageHeader
        title={title}
        description={description}
        icon={ClipboardList}
        entityKey="auditoria"
        showCreate={false}
        showBulkUpload={false}
      />

      {/* Indicador de filtros activos (solo cuando se usan initialFilters) */}
      {!isDirectSearch && hasActiveFilters && (
        <div className={cn(
          'flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border',
          transitionClasses.normal
        )}>
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          <div className="flex flex-wrap gap-2">
            {filters.userId && (
              <Badge variant="secondary" className="gap-1">
                Usuario: {filters.userId.slice(0, 8)}...
              </Badge>
            )}
            {filters.registroId && (
              <Badge variant="secondary" className="gap-1">
                Registro: {filters.registroId.slice(0, 8)}...
              </Badge>
            )}
            {filters.performedBy && (
              <Badge variant="secondary" className="gap-1">
                Realizado por: {filters.performedBy.slice(0, 8)}...
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto gap-1"
          >
            <X className="h-3 w-3" />
            Limpiar filtros
          </Button>
        </div>
      )}

      {/* Tabs para cambiar entre tablas */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'actividades' | 'historial')}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="actividades" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Actividades Realizadas</span>
            <span className="sm:hidden">Actividades</span>
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historial de Cambios</span>
            <span className="sm:hidden">Historial</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actividades" className={transitionClasses.normal}>
          <ActividadesTable 
            externalData={isDirectSearch ? data : undefined} 
            isExternalLoading={isDirectSearch ? isLoading : undefined} 
          />
        </TabsContent>

        <TabsContent value="historial" className={transitionClasses.normal}>
          <HistorialCambiosTable 
            externalData={isDirectSearch ? data : undefined} 
            isExternalLoading={isDirectSearch ? isLoading : undefined} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
