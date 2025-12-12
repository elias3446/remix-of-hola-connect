import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { LiveNavigationMap } from '@/components/Map/LiveNavigationMap';
import { ReporteSidebar } from '@/components/ui/ReporteSidebar';
import { ReportFilter, ReportFilterType, TrackingStats } from '@/components/tracking';
import { useRealtimeNavigation, ReportForNavigation } from '@/hooks/controlador/useRealtimeNavigation';
import { useOptimizedReportes, ReporteWithDistance } from '@/hooks/entidades/useOptimizedReportes';
import { 
  useOptimizedComponent, 
  animationClasses, 
  transitionClasses, 
  hoverClasses 
} from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Rastreo: React.FC = () => {
  const [filter, setFilter] = React.useState<ReportFilterType>('todos');
  const [selectedReport, setSelectedReport] = useState<ReporteWithDistance | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { data: reportes, isLoading: loadingReportes } = useOptimizedReportes();
  
  const {
    userLocation,
    stats,
    isTracking,
    error,
    isSupported,
    nearestReport,
    allReportsWithDistance,
    isNavigationActive,
    setIsNavigationActive,
    setReports,
  } = useRealtimeNavigation();

  // Optimización del componente
  useOptimizedComponent(
    { 
      filter, 
      reportsCount: reportes.length, 
      isTracking, 
      isNavigationActive,
      hasLocation: !!userLocation 
    },
    { componentName: 'Rastreo' }
  );

  // Convertir reportes de la base de datos al formato de navegación
  const reportsForNavigation = useMemo<ReportForNavigation[]>(() => {
    if (!reportes || reportes.length === 0) return [];

    return reportes
      .filter(r => {
        // Solo reportes activos y con coordenadas válidas
        if (!r.activo || r.deleted_at) return false;
        
        // Extraer coordenadas del campo location (JSON con lat/lng)
        const location = r.location as { lat?: number; lng?: number; latitude?: number; longitude?: number; address?: string } | null;
        if (!location) return false;
        
        // Soportar ambos formatos: lat/lng o latitude/longitude
        const lat = location.lat ?? location.latitude;
        const lng = location.lng ?? location.longitude;
        if (lat === undefined || lng === undefined) return false;

        // Aplicar filtro
        switch (filter) {
          case 'pendientes_publicos':
            return r.status === 'pendiente' && r.visibility === 'publico';
          case 'en_proceso_publicos':
            return r.status === 'en_progreso' && r.visibility === 'publico';
          case 'pendientes_privados':
            return r.status === 'pendiente' && r.visibility === 'privado';
          case 'en_proceso_privados':
            return r.status === 'en_progreso' && r.visibility === 'privado';
          case 'todos':
          default:
            return r.status === 'pendiente' || r.status === 'en_progreso';
        }
      })
      .map(r => {
        const location = r.location as { lat?: number; lng?: number; latitude?: number; longitude?: number; address?: string };
        const lat = location.lat ?? location.latitude ?? 0;
        const lng = location.lng ?? location.longitude ?? 0;

        return {
          id: r.id,
          nombre: r.nombre,
          descripcion: r.descripcion,
          latitud: lat,
          longitud: lng,
          direccion: location.address || undefined,
          created_at: r.created_at,
          status: r.status,
          visibility: r.visibility,
        };
      });
  }, [reportes, filter]);

  // Actualizar reportes en el hook de navegación
  useEffect(() => {
    setReports(reportsForNavigation);
  }, [reportsForNavigation, setReports]);

  // Mostrar errores de geolocalización
  useEffect(() => {
    if (error) {
      const errorMessages: Record<number, string> = {
        1: 'Permiso de ubicación denegado. Activa la ubicación para usar el rastreo.',
        2: 'No se puede obtener la ubicación. Verifica tu GPS.',
        3: 'Tiempo de espera agotado al obtener ubicación.',
      };
      toast.error(errorMessages[error.code] || 'Error de geolocalización');
    }
  }, [error]);

  const handleToggleNavigation = useCallback(() => {
    setIsNavigationActive(!isNavigationActive);
    if (isNavigationActive) {
      toast.info('Navegación detenida');
    } else {
      toast.success('Navegación iniciada');
    }
  }, [isNavigationActive, setIsNavigationActive]);

  // Handler para seleccionar un reporte del mapa
  const handleReportClick = useCallback((reportId: string) => {
    const report = reportes.find(r => r.id === reportId);
    if (report) {
      setSelectedReport(report);
      setSidebarOpen(true);
    }
  }, [reportes]);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className={cn('flex flex-col h-full p-4 md:p-6 gap-4', animationClasses.fadeIn)}>
      <EntityPageHeader
        title="Rastreo en Vivo"
        description="Navega hacia los reportes más cercanos en tiempo real"
        icon={MapPin}
        entityKey="rastreo"
        showCreate={false}
        showBulkUpload={false}
        rightContent={
          <div className="flex items-center gap-2 flex-wrap">
            <ReportFilter value={filter} onChange={setFilter} />
          </div>
        }
      />

      <div className="flex-1 relative">
        {/* Panel de estadísticas - posicionado en la base izquierda con margen */}
        <div className="absolute bottom-4 left-4 z-10 max-w-[280px]">
          <TrackingStats
            isTracking={isTracking}
            stats={stats}
            nearestReport={nearestReport}
            accuracy={userLocation?.accuracy ?? null}
            speed={userLocation?.speed ?? null}
          />
        </div>

        {/* Indicador de reportes - borde inferior derecho con margen, arriba de la atribución */}
        <div className={cn(
          'absolute bottom-8 right-4 z-10',
          animationClasses.fadeIn
        )}>
          <Card className="bg-background/90 backdrop-blur-sm shadow-md">
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {loadingReportes ? 'Cargando...' : `${allReportsWithDistance.length} reportes`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Estado: Esperando ubicación */}
        {isTracking && !userLocation && !error && (
          <div className={cn(
            'absolute bottom-6 left-6 right-6 z-10',
            animationClasses.fadeIn
          )}>
            <Card className="bg-primary/90 backdrop-blur-sm">
              <CardContent className="p-3 flex items-center gap-2 text-primary-foreground">
                <Navigation className="h-4 w-4 animate-pulse" />
                <span className="text-sm">Obteniendo tu ubicación...</span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estado: Sin soporte de geolocalización */}
        {!isSupported && (
          <div className={cn(
            'absolute bottom-6 left-6 right-6 z-10',
            animationClasses.fadeIn
          )}>
            <Card className="bg-destructive/90 backdrop-blur-sm">
              <CardContent className="p-3 text-destructive-foreground">
                <p className="text-sm">Tu navegador no soporta geolocalización</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mapa */}
        <div className="h-full rounded-lg overflow-hidden border border-border">
          <LiveNavigationMap
            userLocation={userLocation}
            reports={allReportsWithDistance}
            nearestReportId={nearestReport?.id ?? null}
            isNavigationActive={isNavigationActive}
            onReportClick={handleReportClick}
            className="h-full"
          />
        </div>
      </div>

      {/* Sidebar de detalles del reporte */}
      <ReporteSidebar
        report={selectedReport}
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
      />

      {/* Overlay cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={handleCloseSidebar}
        />
      )}
      </div>
    </div>
  );
};

export default Rastreo;
