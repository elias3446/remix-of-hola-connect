import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  Clock, 
  FolderOpen,
  ClipboardList,
  ArrowLeft,
  Edit,
  Palette,
  Activity,
  History
} from 'lucide-react';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { 
  EntityDetailsPanel, 
  EntityInfoItem,
  EmptyTabContent
} from '@/components/ui/entity-details-panel';
import { EntityListCard, EntityListItem } from '@/components/ui/entity-list-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActividadesTable } from '@/components/table/ActividadesTable';
import { HistorialCambiosTable } from '@/components/table/HistorialCambiosTable';
import { useAuditFilter } from '@/hooks/controlador/useAuditFilter';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { useOptimizedTipoReportes, type TipoReporte } from '@/hooks/entidades/useOptimizedTipoReportes';
import { useEntityPermissions } from '@/hooks/controlador/useEntityPermissions';
import { cn } from '@/lib/utils';
import { 
  animationClasses, 
  transitionClasses,
  useOptimizedComponent 
} from '@/hooks/optimizacion';

interface TipoReporteDetailsProps {
  tipoReporte: TipoReporte;
}

export function TipoReporteDetails({ tipoReporte }: TipoReporteDetailsProps) {
  const navigate = useNavigate();
  const { data: categories } = useOptimizedCategories();
  const { data: reportes, isLoading: isLoadingReportes } = useOptimizedReportes();
  const { toggleStatus } = useOptimizedTipoReportes();
  const { canEdit, canToggleStatus } = useEntityPermissions({ entityKey: 'tipo-reportes' });
  const [auditTab, setAuditTab] = useState<'actividades' | 'historial'>('actividades');

  // Filtrar auditoría por registro_id del tipo de reporte
  const { data: auditData, isLoading: isLoadingAudit } = useAuditFilter({
    registroId: tipoReporte.id
  });

  // Optimización del componente
  useOptimizedComponent(
    { tipoReporteId: tipoReporte.id, auditTab },
    { componentName: 'TipoReporteDetails' }
  );

  // Categoría padre
  const parentCategory = useMemo(() => {
    if (!tipoReporte.category_id) return null;
    return categories.find(c => c.id === tipoReporte.category_id) || null;
  }, [categories, tipoReporte.category_id]);

  // Reportes asociados al tipo de reporte
  const relatedReports = useMemo<EntityListItem[]>(() => {
    return reportes
      .filter(r => r.tipo_reporte_id === tipoReporte.id)
      .map(r => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        status: r.status,
        priority: r.priority,
        created_at: r.created_at,
        distancia_metros: r.distancia_metros,
      }));
  }, [reportes, tipoReporte.id]);

  // Datos del panel de detalles
  const detailsData = useMemo(() => {
    const createdDate = new Date(tipoReporte.created_at);
    const updatedDate = new Date(tipoReporte.updated_at);

    const infoItems: EntityInfoItem[] = [];

    // Descripción primero
    if (tipoReporte.descripcion) {
      infoItems.push({
        icon: FileText,
        label: 'Descripción',
        value: tipoReporte.descripcion,
      });
    }

    // Categoría padre
    if (parentCategory) {
      infoItems.push({
        icon: FolderOpen,
        label: 'Categoría',
        value: parentCategory.nombre,
        variant: 'primary',
      });
    }

    // Fechas
    infoItems.push(
      {
        icon: Calendar,
        label: 'Creado',
        value: format(createdDate, "dd/MM/yyyy", { locale: es }),
      },
      {
        icon: Clock,
        label: 'Actualizado',
        value: format(updatedDate, "dd/MM/yyyy", { locale: es }),
      },
      {
        icon: ClipboardList,
        label: 'Reportes',
        value: `${relatedReports.length} reporte${relatedReports.length !== 1 ? 's' : ''} asociado${relatedReports.length !== 1 ? 's' : ''}`,
      }
    );

    return { infoItems };
  }, [tipoReporte, parentCategory, relatedReports.length]);

  // Handler para toggle de estado
  const handleStatusToggle = async () => {
    if (!canToggleStatus) {
      toast.error('No tienes permiso para cambiar el estado');
      return;
    }
    try {
      await toggleStatus(tipoReporte.id, tipoReporte.activo);
      toast.success(`Tipo de reporte ${!tipoReporte.activo ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error('Error al cambiar el estado');
    }
  };

  // Switch actions para el estado
  const switchActions = [
    {
      label: tipoReporte.activo ? 'Activo' : 'Inactivo',
      description: 'Estado del Tipo de Reporte',
      checked: tipoReporte.activo,
      onCheckedChange: (_checked: boolean) => handleStatusToggle(),
      indicatorColor: tipoReporte.activo ? 'green' as const : 'red' as const,
    }
  ];

  // Secondary info para apariencia
  const secondaryInfo: EntityInfoItem[] = [
    {
      icon: Palette,
      label: 'Apariencia',
      value: (
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-5 rounded border border-border shadow-sm" 
            style={{ backgroundColor: tipoReporte.color || '#6B7280' }}
          />
          <span className="font-mono text-xs">{tipoReporte.color || 'Sin color'}</span>
        </div>
      ),
    }
  ];

  // Tabs del panel
  const tabs = [
    {
      value: 'reportes',
      label: 'Reportes',
      icon: FileText,
      badge: relatedReports.length,
      content: (
        <div className={cn("space-y-4", animationClasses.fadeIn)}>
          <EntityPageHeader
            title={`Reportes Asociados (${relatedReports.length})`}
            description={`Reportes del tipo "${tipoReporte.nombre}"`}
            icon={FileText}
            entityKey="reportes"
            showCreate={false}
            showBulkUpload={false}
          />
          <EntityListCard
            title=""
            items={relatedReports}
            detailRoute="/reportes"
            emptyMessage="No hay reportes asociados a este tipo"
            maxHeight="400px"
            isLoading={isLoadingReportes}
            showDistance={true}
          />
        </div>
      ),
    },
    {
      value: 'auditoria',
      label: 'Auditoría',
      icon: ClipboardList,
      badge: auditData.length,
      content: (
        <div className={cn("space-y-4", animationClasses.fadeIn)}>
          <EntityPageHeader
            title={`Auditoría (${auditData.length})`}
            description={`Registro de actividades para "${tipoReporte.nombre}"`}
            icon={ClipboardList}
            entityKey="auditoria"
            showCreate={false}
            showBulkUpload={false}
          />
          <Tabs
            value={auditTab}
            onValueChange={(v) => setAuditTab(v as 'actividades' | 'historial')}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
              <TabsTrigger value="actividades" className="gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Actividades</span>
              </TabsTrigger>
              <TabsTrigger value="historial" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Historial</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="actividades" className={transitionClasses.normal}>
              {auditData.length > 0 ? (
                <ActividadesTable 
                  externalData={auditData} 
                  isExternalLoading={isLoadingAudit} 
                />
              ) : (
                <EmptyTabContent
                  icon={Activity}
                  title="Sin actividades registradas"
                  description="No hay actividades de auditoría para este tipo de reporte"
                />
              )}
            </TabsContent>

            <TabsContent value="historial" className={transitionClasses.normal}>
              {auditData.length > 0 ? (
                <HistorialCambiosTable 
                  externalData={auditData} 
                  isExternalLoading={isLoadingAudit} 
                />
              ) : (
                <EmptyTabContent
                  icon={History}
                  title="Sin historial de cambios"
                  description="No hay cambios registrados para este tipo de reporte"
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      ),
    },
  ];

  return (
    <div className={cn("space-y-6 p-4 md:p-6", animationClasses.fadeIn)}>
      <EntityPageHeader
        title={tipoReporte.nombre}
        description="Detalles del tipo de reporte"
        icon={FileText}
        entityKey="tipo-reportes"
        showCreate={false}
        showBulkUpload={false}
        rightContent={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/tipo-reportes')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => navigate(`/tipo-reportes/${tipoReporte.id}/editar`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        }
      />

      <EntityDetailsPanel
        title={tipoReporte.nombre}
        avatar={{
          fallback: tipoReporte.nombre.substring(0, 2).toUpperCase(),
          icon: FileText,
        }}
        infoItems={detailsData.infoItems}
        secondaryInfo={secondaryInfo}
        switchActions={switchActions}
        tabs={tabs}
        defaultTab="reportes"
      />
    </div>
  );
}
