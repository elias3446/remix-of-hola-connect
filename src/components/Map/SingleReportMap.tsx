import React, { useEffect, useRef } from 'react';
import L, { Map as LeafletMap, Marker as LeafletMarker, Icon, Polyline, Circle } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation, MapPin } from 'lucide-react';
import { useUserLocation } from '@/hooks/controlador/useUserLocation';
import { cn } from '@/lib/utils';
import {
  useOptimizedComponent,
  animationClasses,
  transitionClasses,
  hoverClasses,
} from '@/hooks/optimizacion';

// Fix for default markers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Report {
  id?: string;
  titulo?: string;
  descripcion?: string;
  latitud?: number;
  longitud?: number;
  direccion?: string;
  estado?: string;
  prioridad?: string;
}

interface SingleReportMapProps {
  report?: Report;
  className?: string;
  showDistance?: boolean;
  showUserLocation?: boolean;
}

const getStatusColor = (estado?: string): string => {
  switch (estado) {
    case 'pendiente': return '#f59e0b';
    case 'en_progreso': return '#3b82f6';
    case 'resuelto': return '#22c55e';
    case 'rechazado': return '#ef4444';
    case 'cancelado': return '#6b7280';
    default: return '#8b5cf6';
  }
};

const createReportIcon = (color: string): Icon => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="30" height="45" viewBox="0 0 30 45" xmlns="http://www.w3.org/2000/svg">
        <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M15 0C6.7 0 0 6.7 0 15c0 8.3 15 30 15 30s15-21.7 15-30C30 6.7 23.3 0 15 0z"/>
        <circle fill="#ffffff" cx="15" cy="15" r="7"/>
      </svg>
    `)}`,
    iconSize: [30, 45],
    iconAnchor: [15, 45],
    popupAnchor: [0, -40],
  });
};

const createUserIcon = (): Icon => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <circle fill="#3b82f6" cx="10" cy="10" r="8" stroke="#ffffff" stroke-width="2"/>
        <circle fill="#ffffff" cx="10" cy="10" r="3"/>
      </svg>
    `)}`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Calculate distance between two points in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

export const SingleReportMap: React.FC<SingleReportMapProps> = ({
  report,
  className = '',
  showDistance = true,
  showUserLocation = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const reportMarkerRef = useRef<LeafletMarker | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const routeLineRef = useRef<Polyline | null>(null);
  const accuracyCircleRef = useRef<Circle | null>(null);
  const prevAccuracyRef = useRef<number | null>(null);
  
  const { location, isSupported, startTracking, isTracking } = useUserLocation();

  const hasReportLocation = report?.latitud && report?.longitud;

  // Optimización del componente
  useOptimizedComponent(
    { hasReportLocation, hasUserLocation: !!location, isTracking },
    { componentName: 'SingleReportMap' }
  );

  const getMapCenter = (): [number, number] => {
    if (hasReportLocation) {
      return [report.latitud!, report.longitud!];
    }
    if (location) {
      return [location.latitude, location.longitude];
    }
    return [-0.1807, -78.4678]; // Quito, Ecuador default
  };

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: getMapCenter(),
      zoom: 16,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update report marker when report changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing report marker
    if (reportMarkerRef.current) {
      reportMarkerRef.current.remove();
      reportMarkerRef.current = null;
    }

    if (hasReportLocation) {
      const coords: [number, number] = [report.latitud!, report.longitud!];
      const color = getStatusColor(report.estado);
      
      reportMarkerRef.current = L.marker(coords, { icon: createReportIcon(color) })
        .addTo(mapRef.current)
        .bindPopup(`
          <div class="min-w-[200px]">
            <strong class="text-base">${report.titulo || 'Sin título'}</strong>
            ${report.descripcion ? `<p class="text-sm mt-1 text-gray-600">${report.descripcion.substring(0, 100)}${report.descripcion.length > 100 ? '...' : ''}</p>` : ''}
            ${report.direccion ? `<p class="text-xs mt-1"><strong>Dirección:</strong> ${report.direccion}</p>` : ''}
            <div class="flex gap-2 mt-2 text-xs">
              <span class="px-2 py-0.5 rounded" style="background-color: ${color}20; color: ${color}">
                ${report.estado || 'N/A'}
              </span>
              ${report.prioridad ? `<span class="px-2 py-0.5 rounded bg-gray-100">${report.prioridad}</span>` : ''}
            </div>
          </div>
        `)
        .openPopup();

      mapRef.current.setView(coords, 16);
    }
  }, [report, hasReportLocation]);

  // Update user marker, accuracy circle and route line
  useEffect(() => {
    if (!mapRef.current) return;

    const accuracyImproved = location && prevAccuracyRef.current !== null && location.accuracy < prevAccuracyRef.current;

    // Remove existing user marker, accuracy circle and route
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove();
      accuracyCircleRef.current = null;
    }
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (showUserLocation && location) {
      const userCoords: [number, number] = [location.latitude, location.longitude];
      
      // Create accuracy circle
      accuracyCircleRef.current = L.circle(userCoords, {
        radius: location.accuracy,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(mapRef.current);

      // Trigger pulse animation when accuracy improves
      if (accuracyImproved) {
        const element = accuracyCircleRef.current.getElement() as HTMLElement | null;
        if (element) {
          element.classList.add('accuracy-pulse');
        }
      }

      userMarkerRef.current = L.marker(userCoords, { icon: createUserIcon() })
        .addTo(mapRef.current)
        .bindPopup(`<div class="text-center"><strong>Tu ubicación</strong><br/><small>Precisión: ${location.accuracy.toFixed(0)}m</small></div>`);

      // Draw route line if report location exists
      if (hasReportLocation) {
        const reportCoords: [number, number] = [report.latitud!, report.longitud!];
        
        routeLineRef.current = L.polyline([userCoords, reportCoords], {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.7,
          dashArray: '10, 10',
        }).addTo(mapRef.current);

        // Fit bounds to show both markers
        const bounds = L.latLngBounds([userCoords, reportCoords]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }

      prevAccuracyRef.current = location.accuracy;
    }
  }, [location, showUserLocation, hasReportLocation, report]);

  const handleGetLocation = () => {
    if (isSupported && !isTracking) {
      startTracking();
    }
  };

  const handleCenterOnReport = () => {
    if (mapRef.current && hasReportLocation) {
      mapRef.current.setView([report.latitud!, report.longitud!], 16);
    }
  };

  const distance = location && hasReportLocation
    ? calculateDistance(location.latitude, location.longitude, report.latitud!, report.longitud!)
    : null;

  if (!hasReportLocation) {
    return (
      <div className={cn(
        'flex items-center justify-center h-64 bg-muted rounded-lg',
        animationClasses.fadeIn,
        className
      )}>
        <div className="text-center">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Sin ubicación registrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative z-0', animationClasses.fadeIn, className)}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          type="button"
          onClick={handleCenterOnReport}
          size="sm"
          variant="outline"
          className={cn(
            'bg-background/80 backdrop-blur-sm',
            transitionClasses.button,
            hoverClasses.scale
          )}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Ver reporte
        </Button>
        
        {showUserLocation && isSupported && (
          <Button
            type="button"
            onClick={handleGetLocation}
            size="sm"
            variant="outline"
            className={cn(
              'bg-background/80 backdrop-blur-sm',
              transitionClasses.button,
              hoverClasses.scale
            )}
            disabled={isTracking}
          >
            <Navigation className="h-4 w-4 mr-2" />
            {isTracking ? 'Rastreando...' : 'Mi ubicación'}
          </Button>
        )}
      </div>

      {/* Distance indicator */}
      {showDistance && distance !== null && (
        <div className={cn(
          'absolute top-4 left-4 z-10',
          animationClasses.scaleIn
        )}>
          <Card className={cn(
            'bg-background/80 backdrop-blur-sm',
            transitionClasses.card
          )}>
            <CardContent className="p-3">
              <p className="text-sm font-medium">Distancia</p>
              <p className="text-lg font-bold text-primary">{formatDistance(distance)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report info */}
      <div className={cn(
        'absolute bottom-4 left-4 right-4 z-10',
        animationClasses.fadeIn
      )}>
        <Card className={cn(
          'bg-background/80 backdrop-blur-sm',
          transitionClasses.card
        )}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium truncate">{report.titulo || 'Sin título'}</p>
                {report.direccion && (
                  <p className="text-xs text-muted-foreground truncate">{report.direccion}</p>
                )}
              </div>
              {report.estado && (
                <span 
                  className={cn(
                    'px-2 py-1 text-xs rounded ml-2',
                    transitionClasses.colors
                  )}
                  style={{ 
                    backgroundColor: `${getStatusColor(report.estado)}20`,
                    color: getStatusColor(report.estado)
                  }}
                >
                  {report.estado}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div ref={containerRef} className="rounded-lg h-64 w-full" />
    </div>
  );
};
