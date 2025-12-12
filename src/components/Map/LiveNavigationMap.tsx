import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import L, { Map as LeafletMap, Marker as LeafletMarker, Icon, Circle, Polyline } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses, hoverClasses } from '@/hooks/optimizacion';
import { ReportForNavigation } from '@/hooks/controlador/useRealtimeNavigation';
import { UserLocation } from '@/hooks/controlador/useUserLocation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Fix for default markers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LiveNavigationMapProps {
  userLocation: UserLocation | null;
  reports: Array<ReportForNavigation & { distanceMeters: number }>;
  nearestReportId: string | null;
  isNavigationActive: boolean;
  className?: string;
  onCenterUser?: () => void;
  onReportClick?: (reportId: string) => void;
}

const createUserIcon = (): Icon => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle fill="#3b82f6" cx="16" cy="16" r="14" stroke="#ffffff" stroke-width="3"/>
        <circle fill="#ffffff" cx="16" cy="16" r="5"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createReportIcon = (isNearest: boolean): Icon => {
  const color = isNearest ? '#ef4444' : '#f59e0b';
  const size = isNearest ? 35 : 28;
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="${size}" height="${Math.round(size * 1.5)}" viewBox="0 0 30 45" xmlns="http://www.w3.org/2000/svg">
        <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M15 0C6.7 0 0 6.7 0 15c0 8.3 15 30 15 30s15-21.7 15-30C30 6.7 23.3 0 15 0z"/>
        <circle fill="#ffffff" cx="15" cy="15" r="7"/>
        ${isNearest ? '<circle fill="' + color + '" cx="15" cy="15" r="3"/>' : ''}
      </svg>
    `)}`,
    iconSize: [size, Math.round(size * 1.5)],
    iconAnchor: [size / 2, Math.round(size * 1.5)],
    popupAnchor: [0, -Math.round(size * 1.3)],
  });
};

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
};

const createNearestPopupContent = (report: ReportForNavigation & { distanceMeters: number }): string => {
  return `
    <div style="padding: 4px; max-width: 280px; word-wrap: break-word;">
      <strong style="font-size: 14px; color: #1f2937; display: block; word-break: break-word;">${report.nombre}</strong>
      <p style="color: #3b82f6; font-size: 14px; margin: 8px 0; font-weight: 600;">Distancia: ${formatDistance(report.distanceMeters)}</p>
      ${report.direccion ? `<p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.4; word-break: break-word;">${report.direccion}</p>` : ''}
    </div>
  `;
};

const createOtherPopupContent = (report: ReportForNavigation & { distanceMeters: number }): string => {
  const formattedDate = report.created_at 
    ? format(new Date(report.created_at), 'dd/MM/yyyy, HH:mm:ss', { locale: es })
    : '';
  
  return `
    <div style="padding: 4px; max-width: 280px; word-wrap: break-word;">
      <strong style="font-size: 14px; color: #1f2937; display: block; word-break: break-word;">${report.nombre}</strong>
      ${report.direccion ? `<p style="color: #6b7280; font-size: 12px; margin: 8px 0; line-height: 1.4; word-break: break-word;">${report.direccion}</p>` : ''}
      ${formattedDate ? `<p style="color: #9ca3af; font-size: 11px; margin: 0;">${formattedDate}</p>` : ''}
    </div>
  `;
};

export const LiveNavigationMap: React.FC<LiveNavigationMapProps> = ({
  userLocation,
  reports,
  nearestReportId,
  isNavigationActive,
  className = '',
  onReportClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const accuracyCircleRef = useRef<Circle | null>(null);
  const prevAccuracyRef = useRef<number | null>(null);
  const reportMarkersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const routeLineRef = useRef<Polyline | null>(null);
  const onReportClickRef = useRef(onReportClick);

  // Mantener ref actualizada
  useEffect(() => {
    onReportClickRef.current = onReportClick;
  }, [onReportClick]);

  // Obtener reporte más cercano
  const nearestReport = useMemo(() => {
    return reports.find(r => r.id === nearestReportId) || null;
  }, [reports, nearestReportId]);

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = userLocation 
      ? [userLocation.latitude, userLocation.longitude]
      : [-0.1807, -78.4678]; // Quito, Ecuador default

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      accuracyCircleRef.current = null;
      reportMarkersRef.current.clear();
      routeLineRef.current = null;
    };
  }, []);

  // Actualizar marcador de usuario
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    const userCoords: [number, number] = [userLocation.latitude, userLocation.longitude];
    const accuracyImproved = prevAccuracyRef.current !== null && userLocation.accuracy < prevAccuracyRef.current;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userCoords);
    } else {
      userMarkerRef.current = L.marker(userCoords, { icon: createUserIcon() })
        .addTo(mapRef.current)
        .bindPopup('<div class="text-center"><strong>Tu ubicación</strong></div>');
    }

    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(userCoords);
      accuracyCircleRef.current.setRadius(userLocation.accuracy);
      
      // Trigger pulse animation when accuracy improves
      if (accuracyImproved) {
        const element = accuracyCircleRef.current.getElement() as HTMLElement | null;
        if (element) {
          element.classList.remove('accuracy-pulse');
          // Force reflow to restart animation
          void element.offsetWidth;
          element.classList.add('accuracy-pulse');
        }
      }
    } else {
      accuracyCircleRef.current = L.circle(userCoords, {
        radius: userLocation.accuracy,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(mapRef.current);
    }

    prevAccuracyRef.current = userLocation.accuracy;
  }, [userLocation]);

  // Actualizar marcadores de reportes
  useEffect(() => {
    if (!mapRef.current) return;

    // Limpiar todos los marcadores existentes y recrearlos para asegurar eventos
    reportMarkersRef.current.forEach(marker => marker.remove());
    reportMarkersRef.current.clear();

    // Crear marcadores
    reports.forEach(report => {
      const isNearest = report.id === nearestReportId;
      const coords: [number, number] = [report.latitud, report.longitud];

      const popupContent = isNearest 
        ? createNearestPopupContent(report)
        : createOtherPopupContent(report);

      const marker = L.marker(coords, { 
        icon: createReportIcon(isNearest),
        zIndexOffset: isNearest ? 1000 : 0,
      })
        .addTo(mapRef.current!)
        .bindPopup(popupContent, {
          maxWidth: 300,
          className: 'custom-popup',
        });
      
      // Agregar evento click para abrir sidebar
      marker.on('click', () => {
        if (onReportClickRef.current) {
          onReportClickRef.current(report.id);
        }
      });
      
      reportMarkersRef.current.set(report.id, marker);
    });
  }, [reports, nearestReportId]);

  // Actualizar línea de ruta
  useEffect(() => {
    if (!mapRef.current) return;

    // Si no hay navegación activa o no hay ubicación/reporte cercano, eliminar la línea
    if (!isNavigationActive || !userLocation || !nearestReport) {
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
      return;
    }

    const userCoords: [number, number] = [userLocation.latitude, userLocation.longitude];
    const destCoords: [number, number] = [nearestReport.latitud, nearestReport.longitud];

    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs([userCoords, destCoords]);
    } else {
      routeLineRef.current = L.polyline([userCoords, destCoords], {
        color: '#ef4444',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10',
      }).addTo(mapRef.current);
    }
  }, [userLocation, nearestReport, isNavigationActive]);

  const handleCenterOnUser = useCallback(() => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.setView([userLocation.latitude, userLocation.longitude], 17);
  }, [userLocation]);

  return (
    <div className={cn('relative z-0', animationClasses.fadeIn, className)}>
      {/* Botón Mi ubicación - borde derecho con margen */}
      {userLocation && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            type="button"
            onClick={handleCenterOnUser}
            size="sm"
            variant="outline"
            className={cn(
              'bg-background shadow-md gap-2',
              transitionClasses.button,
              hoverClasses.scale
            )}
          >
            <Navigation className="h-4 w-4" />
            Mi ubicación
          </Button>
        </div>
      )}

      <div ref={containerRef} className="rounded-lg h-full w-full min-h-[400px]" />
    </div>
  );
};
