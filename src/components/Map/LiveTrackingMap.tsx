import React, { useEffect, useRef, useState } from 'react';
import L, { Map as LeafletMap, Marker as LeafletMarker, Icon, Circle } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation, Play, Square, MapPin, Activity } from 'lucide-react';
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
  id: string;
  titulo?: string;
  latitud?: number;
  longitud?: number;
  estado?: string;
  prioridad?: string;
}

interface TrackingStats {
  isTracking: boolean;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
}

interface LiveTrackingMapProps {
  reports?: Report[];
  className?: string;
  onTrackingChange?: (tracking: boolean) => void;
  onStatsChange?: (stats: TrackingStats) => void;
  autoStartTracking?: boolean;
  initialCenter?: [number, number] | null;
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
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 6.9 12.5 28.5 12.5 28.5s12.5-21.6 12.5-28.5C25 5.6 19.4 0 12.5 0z"/>
        <circle fill="#ffffff" cx="12.5" cy="12.5" r="6"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

const createUserIcon = (): Icon => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle fill="#3b82f6" cx="12" cy="12" r="10" stroke="#ffffff" stroke-width="3"/>
        <circle fill="#ffffff" cx="12" cy="12" r="4"/>
      </svg>
    `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  reports = [],
  className = '',
  onTrackingChange,
  onStatsChange,
  autoStartTracking = false,
  initialCenter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const accuracyCircleRef = useRef<Circle | null>(null);
  const prevAccuracyRef = useRef<number | null>(null);
  const reportMarkersRef = useRef<LeafletMarker[]>([]);
  
  const { location, error, isTracking, isSupported, startTracking, stopTracking } = useUserLocation();
  const [stats, setStats] = useState<TrackingStats>({
    isTracking: false,
    accuracy: null,
    speed: null,
    heading: null,
    altitude: null,
  });

  // Optimización del componente
  useOptimizedComponent(
    { isTracking, reportsCount: reports.length, hasLocation: !!location },
    { componentName: 'LiveTrackingMap' }
  );

  const getMapCenter = (): [number, number] => {
    if (location) {
      return [location.latitude, location.longitude];
    }
    if (initialCenter) {
      return initialCenter;
    }
    return [-0.1807, -78.4678]; // Quito, Ecuador default
  };

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: getMapCenter(),
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (autoStartTracking && isSupported && !isTracking) {
      startTracking();
    }
  }, [autoStartTracking, isSupported, isTracking, startTracking]);

  // Update user marker and accuracy circle when location changes
  useEffect(() => {
    if (!mapRef.current || !location) return;

    const coords: [number, number] = [location.latitude, location.longitude];
    const accuracyImproved = prevAccuracyRef.current !== null && location.accuracy < prevAccuracyRef.current;

    // Update or create user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(coords);
    } else {
      userMarkerRef.current = L.marker(coords, { icon: createUserIcon() })
        .addTo(mapRef.current)
        .bindPopup('<div class="text-center"><strong>Tu ubicación</strong></div>');
    }

    // Update or create accuracy circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(coords);
      accuracyCircleRef.current.setRadius(location.accuracy);
      
      // Trigger pulse animation when accuracy improves
      if (accuracyImproved) {
        const element = accuracyCircleRef.current.getElement() as HTMLElement | null;
        if (element) {
          element.classList.remove('accuracy-pulse');
          void element.offsetWidth;
          element.classList.add('accuracy-pulse');
        }
      }
    } else {
      accuracyCircleRef.current = L.circle(coords, {
        radius: location.accuracy,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(mapRef.current);
    }

    // Center map on user
    mapRef.current.setView(coords, mapRef.current.getZoom());

    // Update stats
    const newStats: TrackingStats = {
      isTracking: true,
      accuracy: location.accuracy,
      speed: location.speed,
      heading: location.heading,
      altitude: location.altitude,
    };
    setStats(newStats);
    onStatsChange?.(newStats);

    prevAccuracyRef.current = location.accuracy;
  }, [location, onStatsChange]);

  // Update tracking state
  useEffect(() => {
    onTrackingChange?.(isTracking);
    if (!isTracking) {
      setStats(prev => ({ ...prev, isTracking: false }));
      onStatsChange?.({ ...stats, isTracking: false });
    }
  }, [isTracking, onTrackingChange]);

  // Update report markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing report markers
    reportMarkersRef.current.forEach(marker => marker.remove());
    reportMarkersRef.current = [];

    // Add new report markers
    reports.forEach(report => {
      if (report.latitud && report.longitud) {
        const marker = L.marker([report.latitud, report.longitud], {
          icon: createReportIcon(getStatusColor(report.estado)),
        })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div>
              <strong>${report.titulo || 'Sin título'}</strong>
              <br/>
              <small>Estado: ${report.estado || 'N/A'}</small>
              <br/>
              <small>Prioridad: ${report.prioridad || 'N/A'}</small>
            </div>
          `);
        reportMarkersRef.current.push(marker);
      }
    });
  }, [reports]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [isTracking, stopTracking]);

  const handleToggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const handleCenterOnUser = () => {
    if (mapRef.current && location) {
      mapRef.current.setView([location.latitude, location.longitude], 16);
    }
  };

  return (
    <div className={cn('relative z-0', animationClasses.fadeIn, className)}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          type="button"
          onClick={handleToggleTracking}
          size="sm"
          variant={isTracking ? 'destructive' : 'default'}
          className={cn(
            'bg-background/80 backdrop-blur-sm',
            transitionClasses.button
          )}
          disabled={!isSupported}
        >
          {isTracking ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              Detener
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Rastrear
            </>
          )}
        </Button>
        
        {isTracking && location && (
          <Button
            type="button"
            onClick={handleCenterOnUser}
            size="sm"
            variant="outline"
            className={cn(
              'bg-background/80 backdrop-blur-sm',
              transitionClasses.button,
              hoverClasses.scale
            )}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Centrar
          </Button>
        )}
      </div>

      {/* Stats panel */}
      {isTracking && (
        <div className={cn(
          'absolute top-4 left-4 z-10',
          animationClasses.scaleIn
        )}>
          <Card className="bg-background/80 backdrop-blur-sm">
            <CardContent className="p-3 space-y-1">
              <p className="text-sm font-medium flex items-center">
                <Activity className="h-4 w-4 mr-2 text-green-500 animate-pulse" />
                Rastreo activo
              </p>
              {stats.accuracy !== null && (
                <p className="text-xs text-muted-foreground">
                  Precisión: {stats.accuracy.toFixed(0)}m
                </p>
              )}
              {stats.speed !== null && stats.speed > 0 && (
                <p className="text-xs text-muted-foreground">
                  Velocidad: {(stats.speed * 3.6).toFixed(1)} km/h
                </p>
              )}
              {stats.altitude !== null && (
                <p className="text-xs text-muted-foreground">
                  Altitud: {stats.altitude.toFixed(0)}m
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className={cn(
          'absolute bottom-4 left-4 right-4 z-10',
          animationClasses.fadeIn
        )}>
          <Card className="bg-destructive/80 backdrop-blur-sm">
            <CardContent className="p-3">
              <p className="text-sm text-destructive-foreground">
                Error: {error.message}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports indicator */}
      {reports.length > 0 && (
        <div className={cn(
          'absolute bottom-4 right-4 z-10',
          animationClasses.fadeIn
        )}>
          <Card className={cn(
            'bg-background/80 backdrop-blur-sm',
            transitionClasses.card
          )}>
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {reports.length} reporte{reports.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div ref={containerRef} className="rounded-lg h-96 w-full" />
    </div>
  );
};
