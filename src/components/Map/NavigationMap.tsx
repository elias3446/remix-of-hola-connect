import React, { useEffect, useRef, useState, useCallback } from 'react';
import L, { Map as LeafletMap, Marker as LeafletMarker, Icon, Circle, Polyline } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Activity, Navigation } from 'lucide-react';
import { useRealtimeNavigation, NavigationDestination } from '@/hooks/controlador/useRealtimeNavigation';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses, hoverClasses } from '@/hooks/optimizacion';

// Fix for default markers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface NavigationMapProps {
  destination: NavigationDestination;
  destinationName?: string;
  destinationAddress?: string;
  className?: string;
  autoStart?: boolean;
  onArrival?: () => void;
  arrivalThresholdMeters?: number;
}

const createUserIcon = (): Icon => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle fill="#3b82f6" cx="16" cy="16" r="14" stroke="#ffffff" stroke-width="3"/>
        <circle fill="#ffffff" cx="16" cy="16" r="5"/>
        <polygon fill="#3b82f6" points="16,2 20,10 16,8 12,10" transform="rotate(0,16,16)"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createDestinationIcon = (): Icon => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="30" height="45" viewBox="0 0 30 45" xmlns="http://www.w3.org/2000/svg">
        <path fill="#ef4444" stroke="#ffffff" stroke-width="2" d="M15 0C6.7 0 0 6.7 0 15c0 8.3 15 30 15 30s15-21.7 15-30C30 6.7 23.3 0 15 0z"/>
        <circle fill="#ffffff" cx="15" cy="15" r="7"/>
        <circle fill="#ef4444" cx="15" cy="15" r="3"/>
      </svg>
    `)}`,
    iconSize: [30, 45],
    iconAnchor: [15, 45],
    popupAnchor: [0, -40],
  });
};

export const NavigationMap: React.FC<NavigationMapProps> = ({
  destination,
  destinationName,
  destinationAddress,
  className = '',
  autoStart = true, // Auto-iniciar por defecto
  onArrival,
  arrivalThresholdMeters = 20,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const destMarkerRef = useRef<LeafletMarker | null>(null);
  const accuracyCircleRef = useRef<Circle | null>(null);
  const prevAccuracyRef = useRef<number | null>(null);
  const routeLineRef = useRef<Polyline | null>(null);
  const [hasArrived, setHasArrived] = useState(false);

  const {
    userLocation,
    stats,
    isTracking,
    error,
    isSupported,
    setDestination,
  } = useRealtimeNavigation();

  // Debug log para verificar estado
  useEffect(() => {
    console.log('NavigationMap state:', { 
      userLocation: userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null, 
      isTracking, 
      error: error?.message,
      isSupported,
      destination 
    });
  }, [userLocation, isTracking, error, isSupported, destination]);

  // Establecer destino al montar
  useEffect(() => {
    setDestination(destination);
  }, [destination, setDestination]);

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = [destination.latitude, destination.longitude];

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 16,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Agregar marcador de destino (popup se abre al hacer clic)
    destMarkerRef.current = L.marker(initialCenter, { icon: createDestinationIcon() })
      .addTo(map)
      .bindPopup(createPopupContent(destinationName, null, destinationAddress), {
        maxWidth: 300,
        className: 'custom-popup',
      });

    mapRef.current = map;
    
    console.log('NavigationMap: Map initialized');

    return () => {
      console.log('NavigationMap: Cleaning up map');
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      destMarkerRef.current = null;
      accuracyCircleRef.current = null;
      routeLineRef.current = null;
    };
  }, [destination.latitude, destination.longitude, destinationName, destinationAddress]);

  // Funciones de formato
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes} min`;
  };

  // Función para crear el contenido del popup
  const createPopupContent = (name?: string, distanceMeters?: number | null, address?: string): string => {
    const distanceText = distanceMeters !== null && distanceMeters !== undefined
      ? `<p style="color: #3b82f6; font-size: 14px; margin: 8px 0;">Distancia: ${formatDistance(distanceMeters)}</p>`
      : '';
    const addressText = address
      ? `<p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.4; word-break: break-word;">${address}</p>`
      : '';
    
    return `
      <div style="padding: 4px; max-width: 280px; word-wrap: break-word; overflow-wrap: break-word;">
        <strong style="font-size: 14px; color: #1f2937; display: block; word-break: break-word;">${name || 'Destino'}</strong>
        ${distanceText}
        ${addressText}
      </div>
    `;
  };

  // Actualizar popup con la distancia en tiempo real
  useEffect(() => {
    if (!destMarkerRef.current) return;
    
    const newContent = createPopupContent(
      destinationName,
      stats?.distanceMeters ?? null,
      destinationAddress
    );
    destMarkerRef.current.setPopupContent(newContent);
  }, [stats?.distanceMeters, destinationName, destinationAddress]);

  // Actualizar marcador de usuario y línea de ruta
  useEffect(() => {
    console.log('NavigationMap update effect:', { 
      hasMap: !!mapRef.current, 
      hasUserLocation: !!userLocation,
      userLocation: userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null
    });
    
    if (!mapRef.current || !userLocation) return;

    const userCoords: [number, number] = [userLocation.latitude, userLocation.longitude];
    const destCoords: [number, number] = [destination.latitude, destination.longitude];
    const accuracyImproved = prevAccuracyRef.current !== null && userLocation.accuracy < prevAccuracyRef.current;

    console.log('NavigationMap: Creating/updating markers', { userCoords, destCoords });

    // Actualizar o crear marcador de usuario
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userCoords);
    } else {
      userMarkerRef.current = L.marker(userCoords, { icon: createUserIcon() })
        .addTo(mapRef.current)
        .bindPopup('<div class="text-center"><strong>Tu ubicación</strong></div>');
      console.log('NavigationMap: User marker created');
    }

    // Actualizar o crear círculo de precisión
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(userCoords);
      accuracyCircleRef.current.setRadius(userLocation.accuracy);
      
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
      accuracyCircleRef.current = L.circle(userCoords, {
        radius: userLocation.accuracy,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(mapRef.current);
      console.log('NavigationMap: Accuracy circle created');
    }

    // Actualizar o crear línea de ruta
    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs([userCoords, destCoords]);
    } else {
      routeLineRef.current = L.polyline([userCoords, destCoords], {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
      }).addTo(mapRef.current);
      console.log('NavigationMap: Route line created');
    }

    // Ajustar vista para mostrar ambos puntos
    const bounds = L.latLngBounds([userCoords, destCoords]);
    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    console.log('NavigationMap: Bounds fitted');

    // Verificar llegada - solo si tenemos buena precisión de ubicación
    if (
      stats && 
      stats.distanceMeters <= arrivalThresholdMeters && 
      userLocation.accuracy <= 50 && // Solo marcar llegada con buena precisión
      !hasArrived
    ) {
      setHasArrived(true);
      onArrival?.();
    }

    prevAccuracyRef.current = userLocation.accuracy;
  }, [userLocation, destination, stats, arrivalThresholdMeters, hasArrived, onArrival]);

  const handleCenterOnUser = useCallback(() => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.setView([userLocation.latitude, userLocation.longitude], 17);
  }, [userLocation]);

  return (
    <div className={cn('relative z-0', animationClasses.fadeIn, className)}>
      {/* Botón Mi ubicación */}
      {userLocation && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            type="button"
            onClick={handleCenterOnUser}
            size="sm"
            variant="outline"
            className={cn(
              'bg-background/90 backdrop-blur-sm shadow-md',
              transitionClasses.button,
              hoverClasses.scale
            )}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Mi ubicación
          </Button>
        </div>
      )}

      {/* Estado de carga - cuando está rastreando pero aún no hay ubicación */}
      {isTracking && !userLocation && !error && (
        <div className={cn(
          'absolute bottom-0 left-0 right-0 z-10',
          animationClasses.fadeIn
        )}>
          <div className="bg-primary/90 backdrop-blur-sm px-3 py-2 text-xs text-primary-foreground flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            Obteniendo tu ubicación...
          </div>
        </div>
      )}

      {/* Mensaje de llegada */}
      {hasArrived && (
        <div className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20',
          animationClasses.scaleIn
        )}>
          <Card className="bg-green-500/90 backdrop-blur-sm shadow-lg">
            <CardContent className="p-4 text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-white" />
              <p className="text-lg font-bold text-white">¡Has llegado!</p>
              <p className="text-sm text-white/90">{destinationName || 'Destino alcanzado'}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error de ubicación */}
      {error && !userLocation && (
        <div className={cn(
          'absolute bottom-0 left-0 right-0 z-10',
          animationClasses.fadeIn
        )}>
          <div className="bg-destructive/90 backdrop-blur-sm px-3 py-2 text-xs text-destructive-foreground flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            {error.code === 1 ? 'Permiso de ubicación denegado' : 
             error.code === 2 ? 'No se puede obtener ubicación' : 
             'Reintentando obtener ubicación...'}
          </div>
        </div>
      )}

      {/* Geolocalización no soportada */}
      {!isSupported && (
        <div className={cn(
          'absolute bottom-0 left-0 right-0 z-10',
          animationClasses.fadeIn
        )}>
          <div className="bg-destructive/90 backdrop-blur-sm px-3 py-2 text-xs text-destructive-foreground">
            Tu navegador no soporta geolocalización
          </div>
        </div>
      )}

      <div ref={containerRef} className="rounded-lg h-[400px] w-full" />
    </div>
  );
};
