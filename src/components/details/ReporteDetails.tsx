import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  Clock, 
  User,
  MapPin,
  FolderOpen,
  Eye,
  EyeOff,
  ArrowLeft,
  Edit,
  Navigation,
  History,
  ClipboardList,
  Activity,
  Construction,
  Image as ImageIcon,
  UserCheck,
  ArrowRightLeft,
  CheckCircle2
} from 'lucide-react';
import { ReporteEvidencia } from '@/components/ui/ReporteEvidencia';
import { NavigationMap, ReportLocationMap } from '@/components/Map';
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
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { useReporteHistorial } from '@/hooks/entidades/useReporteHistorial';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEntityPermissions } from '@/hooks/controlador/useEntityPermissions';
import type { ReporteWithDistance } from '@/hooks/entidades/useOptimizedReportes';
import { cn } from '@/lib/utils';
import { 
  animationClasses, 
  transitionClasses,
  useOptimizedComponent 
} from '@/hooks/optimizacion';

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  resuelto: 'Resuelto',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pendiente: 'bg-amber-500 text-white',
  en_progreso: 'bg-blue-500 text-white',
  resuelto: 'bg-emerald-500 text-white',
  rechazado: 'bg-destructive text-destructive-foreground',
  cancelado: 'bg-muted text-muted-foreground',
};

const PRIORITY_LABELS: Record<string, string> = {
  bajo: 'Baja',
  medio: 'Media',
  alto: 'Alta',
  urgente: 'Urgente',
};

const PRIORITY_COLORS: Record<string, string> = {
  bajo: 'bg-emerald-500 text-white',
  medio: 'bg-amber-500 text-white',
  alto: 'bg-orange-500 text-white',
  urgente: 'bg-destructive text-destructive-foreground',
};

interface ReporteDetailsProps {
  reporte: ReporteWithDistance;
}

export function ReporteDetails({ reporte }: ReporteDetailsProps) {
  const navigate = useNavigate();
  const { toggleStatus } = useOptimizedReportes();
  const { canEdit, canToggleStatus } = useEntityPermissions({ entityKey: 'reportes' });
  const [auditTab, setAuditTab] = useState<'actividades' | 'historial'>('actividades');

  // Filtrar auditoría por registro_id del reporte
  const { data: auditData, isLoading: isLoadingAudit } = useAuditFilter({
    registroId: reporte.id
  });

  // Historial de asignaciones del reporte
  const { data: historialData = [], isLoading: isLoadingHistorial } = useReporteHistorial(reporte.id);

  // Transformar historial a formato EntityListItem
  const historialItems: EntityListItem[] = useMemo(() => {
    return historialData.map((item) => {
      const assignedTo = item.assigned_to_profile?.name || 'Sin asignar';
      const assignedFrom = item.assigned_from_profile?.name;
      const assignedBy = item.assigned_by_profile?.name || 'Sistema';
      
      let descripcion = item.comentario || '';
      if (assignedFrom) {
        descripcion = `Reasignado de ${assignedFrom} a ${assignedTo} por ${assignedBy}. ${descripcion}`;
      } else {
        descripcion = `Asignado a ${assignedTo} por ${assignedBy}. ${descripcion}`;
      }

      return {
        id: item.id,
        nombre: assignedFrom ? `Reasignación a ${assignedTo}` : `Asignación a ${assignedTo}`,
        descripcion: descripcion.trim(),
        created_at: item.fecha_asignacion,
      };
    });
  }, [historialData]);

  // Extraer coordenadas y dirección del reporte desde geolocation o location
  const reporteLocation = useMemo(() => {
    let coords: { lat: number; lng: number } | null = null;
    let address: string | undefined;
    let puntoReferencia: string | undefined;
    let edificio: string | undefined;
    let piso: string | undefined;
    let aulaSala: string | undefined;
    let infoAdicional: string | undefined;

    // Intentar obtener desde location (JSON)
    if (reporte.location && typeof reporte.location === 'object') {
      const loc = reporte.location as { 
        lat?: number; 
        lng?: number; 
        latitude?: number; 
        longitude?: number;
        address?: string;
        direccion?: string;
        puntoReferencia?: string;
        reference?: string;
        edificio?: string;
        building?: string;
        piso?: string;
        floor?: string;
        aulaSala?: string;
        room?: string;
        infoAdicional?: string;
        additional_info?: string;
      };
      if (loc.lat && loc.lng) {
        coords = { lat: loc.lat, lng: loc.lng };
      }
      if (loc.latitude && loc.longitude) {
        coords = { lat: loc.latitude, lng: loc.longitude };
      }
      // Extraer dirección y campos adicionales (soportar ambos formatos de nombres)
      address = loc.address || loc.direccion;
      puntoReferencia = loc.puntoReferencia || loc.reference;
      edificio = loc.edificio || loc.building;
      piso = loc.piso || loc.floor;
      aulaSala = loc.aulaSala || loc.room;
      infoAdicional = loc.infoAdicional || loc.additional_info;
    }
    
    // geolocation es un tipo PostGIS, puede estar como string "POINT(lng lat)"
    if (!coords && reporte.geolocation) {
      const geoStr = String(reporte.geolocation);
      const match = geoStr.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
      if (match) {
        coords = { lat: parseFloat(match[2]), lng: parseFloat(match[1]) };
      }
    }
    
    return { coords, address, puntoReferencia, edificio, piso, aulaSala, infoAdicional };
  }, [reporte.location, reporte.geolocation]);

  // Optimización del componente
  useOptimizedComponent(
    { reporteId: reporte.id, auditTab },
    { componentName: 'ReporteDetails' }
  );

  const detailsData = useMemo(() => {
    const createdDate = new Date(reporte.created_at);
    const updatedDate = new Date(reporte.updated_at);

    const infoItems: EntityInfoItem[] = [];

    // Descripción primero
    if (reporte.descripcion) {
      infoItems.push({
        icon: FileText,
        label: 'Descripción',
        value: reporte.descripcion,
      });
    }

    // Categoría
    if (reporte.categories) {
      infoItems.push({
        icon: FolderOpen,
        label: 'Categoría',
        value: reporte.categories.nombre,
        variant: 'primary',
      });
    }

    // Tipo de reporte
    if (reporte.tipo_categories) {
      infoItems.push({
        icon: FileText,
        label: 'Tipo de Reporte',
        value: reporte.tipo_categories.nombre,
      });
    }

    // Fechas
    infoItems.push(
      {
        icon: Calendar,
        label: 'Creado',
        value: format(createdDate, "dd/MM/yyyy HH:mm", { locale: es }),
      },
      {
        icon: Clock,
        label: 'Actualizado',
        value: format(updatedDate, "dd/MM/yyyy HH:mm", { locale: es }),
      }
    );

    // Creado por
    infoItems.push({
      icon: User,
      label: 'Creado por',
      value: reporte.profiles?.name || 'Desconocido',
    });

    // Asignado a (siempre mostrar)
    infoItems.push({
      icon: UserCheck,
      label: 'Asignado a',
      value: reporte.assigned_profiles?.name || 'Sin asignación',
      variant: reporte.assigned_profiles ? 'primary' : undefined,
    });

    // Ubicación
    if (reporteLocation.address || reporteLocation.coords) {
      infoItems.push({
        icon: MapPin,
        label: 'Ubicación',
        value: reporteLocation.address || 
          (reporteLocation.coords 
            ? `(${reporteLocation.coords.lat.toFixed(6)}, ${reporteLocation.coords.lng.toFixed(6)})`
            : 'Sin ubicación'),
      });
    }

    return { infoItems };
  }, [reporte, reporteLocation]);

  const { update } = useOptimizedReportes();

  // Handler para toggle de estado activo
  const handleStatusToggle = async () => {
    if (!canToggleStatus) {
      toast.error('No tienes permiso para cambiar el estado');
      return;
    }
    try {
      await toggleStatus(reporte.id, reporte.activo);
      toast.success(`Reporte ${!reporte.activo ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error('Error al cambiar el estado');
    }
  };

  // Handler para cambiar visibilidad
  const handleVisibilityToggle = async () => {
    if (!canEdit) {
      toast.error('No tienes permiso para cambiar la visibilidad');
      return;
    }
    try {
      const newVisibility = reporte.visibility === 'publico' ? 'privado' : 'publico';
      await update({ id: reporte.id, updates: { visibility: newVisibility } });
      toast.success(`Visibilidad cambiada a ${newVisibility === 'publico' ? 'Público' : 'Privado'}`);
    } catch (error) {
      toast.error('Error al cambiar la visibilidad');
    }
  };

  // Handler para marcar como resuelto
  const handleMarkAsResolved = async () => {
    if (!canEdit) {
      toast.error('No tienes permiso para cambiar el estado del reporte');
      return;
    }
    try {
      // Al marcar como resuelto, también se desactiva el reporte
      await update({ id: reporte.id, updates: { status: 'resuelto', activo: false } });
      toast.success('Reporte marcado como resuelto');
    } catch (error) {
      toast.error('Error al marcar como resuelto');
    }
  };

  // Switch actions para el estado activo, visibilidad y resolución
  const switchActions = [
    {
      label: reporte.activo ? 'Activo' : 'Inactivo',
      description: 'Estado del Reporte',
      checked: reporte.activo,
      onCheckedChange: (_checked: boolean) => handleStatusToggle(),
      indicatorColor: reporte.activo ? 'green' as const : 'red' as const,
    },
    {
      label: reporte.visibility === 'publico' ? 'Público' : 'Privado',
      description: 'Visibilidad',
      checked: reporte.visibility === 'publico',
      onCheckedChange: (_checked: boolean) => handleVisibilityToggle(),
      indicatorColor: reporte.visibility === 'publico' ? 'green' as const : 'yellow' as const,
      icon: reporte.visibility === 'publico' ? Eye : EyeOff,
      disabled: !canEdit,
    },
    ...(reporte.status !== 'resuelto' ? [{
      label: 'Marcar Resuelto',
      description: 'Resolver reporte',
      checked: false,
      onCheckedChange: (_checked: boolean) => handleMarkAsResolved(),
      indicatorColor: 'blue' as const,
      icon: CheckCircle2,
      disabled: !canEdit,
    }] : []),
  ];

  // Secondary info con estado, prioridad y visibilidad
  const secondaryInfo: EntityInfoItem[] = [
    {
      icon: FileText,
      label: 'Estado',
      value: (
        <span className={cn("px-2 py-1 rounded text-xs font-medium", STATUS_COLORS[reporte.status] || STATUS_COLORS.pendiente)}>
          {STATUS_LABELS[reporte.status] || reporte.status}
        </span>
      ),
    },
    {
      icon: FileText,
      label: 'Prioridad',
      value: (
        <span className={cn("px-2 py-1 rounded text-xs font-medium", PRIORITY_COLORS[reporte.priority] || PRIORITY_COLORS.medio)}>
          {PRIORITY_LABELS[reporte.priority] || reporte.priority}
        </span>
      ),
    },
    {
      icon: Eye,
      label: 'Visibilidad',
      value: (
        <span className={cn(
          "px-2 py-1 rounded text-xs font-medium",
          reporte.visibility === 'publico' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground'
        )}>
          {reporte.visibility === 'publico' ? 'Público' : 'Privado'}
        </span>
      ),
    },
  ];

  // Componente para tabs en desarrollo
  const InDevelopmentContent = ({ title }: { title: string }) => (
    <EmptyTabContent
      icon={Construction}
      title="En desarrollo"
      description={`La sección "${title}" está actualmente en desarrollo`}
    />
  );

  // Tabs del panel
  const tabs = [
    {
      value: 'ubicacion',
      label: 'Ubicación',
      icon: MapPin,
      content: (
        <div className={cn("space-y-4", animationClasses.fadeIn)}>
          <EntityPageHeader
            title="Ubicación"
            description={`Ubicación del reporte "${reporte.nombre}"`}
            icon={MapPin}
            entityKey="reportes"
            showCreate={false}
            showBulkUpload={false}
          />
          {reporteLocation.coords ? (
            <>
              <ReportLocationMap
                latitude={reporteLocation.coords.lat}
                longitude={reporteLocation.coords.lng}
                title={reporte.nombre}
                address={reporteLocation.address}
                createdAt={reporte.created_at}
                className="rounded-lg overflow-hidden"
              />
              {/* Detalles de ubicación */}
              <div className="bg-card border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-foreground">Detalles de ubicación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Dirección:</p>
                    <p className="text-sm text-muted-foreground">
                      {reporteLocation.address || 'Sin dirección registrada'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Referencia:</p>
                    <p className="text-sm text-muted-foreground">
                      {reporteLocation.puntoReferencia || 'Sin referencia'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Coordenadas:</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      ({reporteLocation.coords.lat.toFixed(6)}, {reporteLocation.coords.lng.toFixed(6)})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Edificio:</p>
                    <p className="text-sm text-muted-foreground">
                      {reporteLocation.edificio || 'Sin edificio'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Piso:</p>
                    <p className="text-sm text-muted-foreground">
                      {reporteLocation.piso || 'Sin piso'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Sala/Oficina:</p>
                    <p className="text-sm text-muted-foreground">
                      {reporteLocation.aulaSala || 'Sin sala/oficina'}
                    </p>
                  </div>
                </div>
                {reporteLocation.infoAdicional && (
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Información adicional:</p>
                    <p className="text-sm text-muted-foreground">
                      {reporteLocation.infoAdicional}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyTabContent
              icon={MapPin}
              title="Sin ubicación"
              description="Este reporte no tiene coordenadas de ubicación registradas"
            />
          )}
        </div>
      ),
    },
    {
      value: 'rastreo',
      label: 'Rastreo',
      icon: Navigation,
      content: (
        <div className={cn("space-y-4", animationClasses.fadeIn)}>
          <EntityPageHeader
            title="Rastreo"
            description={`Navegación en tiempo real hacia "${reporte.nombre}"`}
            icon={Navigation}
            entityKey="reportes"
            showCreate={false}
            showBulkUpload={false}
          />
          {reporteLocation.coords ? (
            <NavigationMap
              destination={{
                latitude: reporteLocation.coords.lat,
                longitude: reporteLocation.coords.lng,
                name: reporte.nombre,
              }}
              destinationName={reporte.nombre}
              destinationAddress={reporteLocation.address}
              className="rounded-lg overflow-hidden"
              onArrival={() => toast.success('¡Has llegado al reporte!')}
            />
          ) : (
            <EmptyTabContent
              icon={MapPin}
              title="Sin ubicación"
              description="Este reporte no tiene coordenadas de ubicación registradas"
            />
          )}
        </div>
      ),
    },
    {
      value: 'evidencia',
      label: 'Evidencia',
      icon: ImageIcon,
      badge: reporte.imagenes?.length || 0,
      content: (
        <div className={cn("space-y-4", animationClasses.fadeIn)}>
          <EntityPageHeader
            title={`Evidencia (${reporte.imagenes?.length || 0})`}
            description={`Evidencia del reporte "${reporte.nombre}"`}
            icon={ImageIcon}
            entityKey="reportes"
            showCreate={false}
            showBulkUpload={false}
          />
          <ReporteEvidencia imagenes={reporte.imagenes || []} />
        </div>
      ),
    },
    {
      value: 'historial',
      label: 'Historial',
      icon: History,
      badge: historialItems.length,
      content: (
        <div className={cn("space-y-4", animationClasses.fadeIn)}>
          <EntityPageHeader
            title={`Historial (${historialItems.length})`}
            description={`Historial de asignaciones del reporte "${reporte.nombre}"`}
            icon={History}
            entityKey="reportes"
            showCreate={false}
            showBulkUpload={false}
          />
          <EntityListCard
            title=""
            items={historialItems}
            detailRoute="/usuarios"
            emptyMessage="Sin historial de asignaciones"
            emptySubMessage="Las asignaciones del reporte aparecerán aquí"
            icon={<ArrowRightLeft className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoadingHistorial}
            showBadges={false}
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
            description={`Registro de actividades para "${reporte.nombre}"`}
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
                  description="No hay actividades de auditoría para este reporte"
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
                  description="No hay cambios registrados para este reporte"
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
        title={reporte.nombre}
        description="Detalles del reporte"
        icon={FileText}
        entityKey="reportes"
        showCreate={false}
        showBulkUpload={false}
        rightContent={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/reportes')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => navigate(`/reportes/${reporte.id}/editar`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        }
      />

      <EntityDetailsPanel
        title={reporte.nombre}
        avatar={{
          fallback: reporte.nombre.substring(0, 2).toUpperCase(),
          icon: FileText,
        }}
        infoItems={detailsData.infoItems}
        secondaryInfo={secondaryInfo}
        switchActions={switchActions}
        tabs={tabs}
        defaultTab="ubicacion"
      />
    </div>
  );
}
