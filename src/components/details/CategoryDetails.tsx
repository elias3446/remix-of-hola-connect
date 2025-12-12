import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, 
  Calendar, 
  Clock, 
  FileText,
  AlertCircle,
  ArrowLeft,
  Edit,
  Palette,
  ClipboardList,
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
import { useOptimizedTipoReportes } from '@/hooks/entidades/useOptimizedTipoReportes';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { useOptimizedCategories, type Category } from '@/hooks/entidades/useOptimizedCategories';
import { useEntityPermissions } from '@/hooks/controlador/useEntityPermissions';
import { cn } from '@/lib/utils';
import { 
  animationClasses, 
  transitionClasses,
  useOptimizedComponent 
} from '@/hooks/optimizacion';

interface CategoryDetailsProps {
  category: Category;
}

export function CategoryDetails({ category }: CategoryDetailsProps) {
  const navigate = useNavigate();
  const { data: tipoReportes, isLoading: isLoadingTipos } = useOptimizedTipoReportes();
  const { data: reportes, isLoading: isLoadingReportes } = useOptimizedReportes();
  const { toggleStatus } = useOptimizedCategories();
  const { canEdit, canToggleStatus } = useEntityPermissions({ entityKey: 'categorias' });
  const [auditTab, setAuditTab] = useState<'actividades' | 'historial'>('actividades');
  
  // Filtrar auditoría por registro_id de la categoría
  const { data: auditData, isLoading: isLoadingAudit } = useAuditFilter({
    registroId: category.id
  });

  // Optimización del componente
  useOptimizedComponent(
    { categoryId: category.id, auditTab },
    { componentName: 'CategoryDetails' }
  );

  // Tipos de reporte relacionados
  const relatedTipos = useMemo<EntityListItem[]>(() => {
    return tipoReportes
      .filter(tr => tr.category_id === category.id)
      .map(tr => ({
        id: tr.id,
        nombre: tr.nombre,
        descripcion: tr.descripcion,
        status: tr.activo ? 'activo' : 'inactivo',
        created_at: tr.created_at,
      }));
  }, [tipoReportes, category.id]);

  // Reportes asociados a la categoría (con distancia)
  const relatedReports = useMemo<EntityListItem[]>(() => {
    return reportes
      .filter(r => r.categoria_id === category.id)
      .map(r => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        status: r.status,
        priority: r.priority,
        created_at: r.created_at,
        distancia_metros: r.distancia_metros,
      }));
  }, [reportes, category.id]);

  // Datos del panel de detalles
  const detailsData = useMemo(() => {
    const createdDate = new Date(category.created_at);
    const updatedDate = new Date(category.updated_at);

    const infoItems: EntityInfoItem[] = [];

    // Descripción primero
    if (category.descripcion) {
      infoItems.push({
        icon: FileText,
        label: 'Descripción',
        value: category.descripcion,
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
        icon: FolderOpen,
        label: 'Tipos de Reportes',
        value: `${relatedTipos.length} tipo${relatedTipos.length !== 1 ? 's' : ''} asociado${relatedTipos.length !== 1 ? 's' : ''}`,
      }
    );

    return { infoItems };
  }, [category, relatedTipos.length]);

  // Handler para toggle de estado
  const handleStatusToggle = async () => {
    if (!canToggleStatus) {
      toast.error('No tienes permiso para cambiar el estado');
      return;
    }
    try {
      await toggleStatus(category.id, category.activo);
      toast.success(`Categoría ${!category.activo ? 'activada' : 'desactivada'}`);
    } catch (error) {
      toast.error('Error al cambiar el estado');
    }
  };

  // Switch actions para el estado - siempre visible
  const switchActions = [
    {
      label: category.activo ? 'Activo' : 'Inactivo',
      description: 'Estado de la Categoría',
      checked: category.activo,
      onCheckedChange: (_checked: boolean) => handleStatusToggle(),
      indicatorColor: category.activo ? 'green' as const : 'red' as const,
    }
  ];

  // Secondary info para apariencia - siempre visible
  const secondaryInfo: EntityInfoItem[] = [
    {
      icon: Palette,
      label: 'Apariencia',
      value: (
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-5 rounded border border-border shadow-sm" 
            style={{ backgroundColor: category.color || '#6B7280' }}
          />
          <span className="font-mono text-xs">{category.color || 'Sin color'}</span>
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
            description={`Reportes con la categoría "${category.nombre}"`}
            icon={FileText}
            entityKey="reportes"
            showCreate={false}
            showBulkUpload={false}
          />
          <EntityListCard
            title=""
            items={relatedReports}
            detailRoute="/reportes"
            emptyMessage="No hay reportes asociados a esta categoría"
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
            description={`Registro de actividades para "${category.nombre}"`}
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
                  description="No hay actividades de auditoría para esta categoría"
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
                  description="No hay cambios registrados para esta categoría"
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      ),
    },
    {
      value: 'tipos',
      label: 'Tipos de Reporte',
      icon: FolderOpen,
      badge: relatedTipos.length,
      content: (
        <div className={cn("space-y-4", animationClasses.fadeIn)}>
          <EntityPageHeader
            title={`Tipos de Reporte (${relatedTipos.length})`}
            description={`Tipos de reporte asociados a "${category.nombre}"`}
            icon={FolderOpen}
            entityKey="tipo-reportes"
            showCreate={false}
            showBulkUpload={false}
          />
          <EntityListCard
            title=""
            items={relatedTipos}
            detailRoute="/tipo-reportes"
            emptyMessage="Sin tipos de reporte"
            emptySubMessage="Esta categoría no tiene tipos de reporte asociados"
            maxHeight="400px"
            isLoading={isLoadingTipos}
            showBadges={true}
            statusConfig={{
              activo: { label: 'Activo', className: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
              inactivo: { label: 'Inactivo', className: 'bg-muted text-muted-foreground border-border' },
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className={cn("space-y-6 p-4 md:p-6", animationClasses.fadeIn)}>
      <EntityPageHeader
        title={category.nombre}
        description="Detalles de la categoría"
        icon={FolderOpen}
        entityKey="categorias"
        showCreate={false}
        showBulkUpload={false}
        rightContent={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/categorias')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => navigate(`/categorias/${category.id}/editar`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        }
      />

      <EntityDetailsPanel
        title={category.nombre}
        avatar={{
          fallback: category.nombre.substring(0, 2).toUpperCase(),
          icon: FolderOpen,
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
