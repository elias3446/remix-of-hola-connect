import React, { useCallback, useEffect, useRef } from 'react';
import L, { Map as LeafletMap, Marker as LeafletMarker, Icon, Circle } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';
import { useGlobalLocation } from '@/contexts/LocationContext';
import { cn } from '@/lib/utils';
import {
  useOptimizedComponent,
  animationClasses,
  transitionClasses,
  hoverClasses,
} from '@/hooks/optimizacion';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  reference?: string;
}

// Fix for default markers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ReportFormMapProps {
  selectedLocation?: LocationData | null;
  onLocationSelect: (location: LocationData) => void;
  className?: string;
}

export const ReportFormMap: React.FC<ReportFormMapProps> = ({
  selectedLocation,
  onLocationSelect,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const selectedMarkerRef = useRef<LeafletMarker | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const accuracyCircleRef = useRef<Circle | null>(null);
  const prevAccuracyRef = useRef<number | null>(null);
  
  // Usar el contexto global de ubicación en lugar de un hook local
  const { location, isTracking, isSupported, startTracking } = useGlobalLocation();
  const hasInitialCentered = useRef(false);

  // Optimización del componente
  useOptimizedComponent(
    { hasSelectedLocation: !!selectedLocation, hasUserLocation: !!location },
    { componentName: 'ReportFormMap' }
  );

  const getMapCenter = (): [number, number] => {
    if (selectedLocation?.latitude && selectedLocation?.longitude) {
      return [selectedLocation.latitude, selectedLocation.longitude];
    }
    if (location) {
      return [location.latitude, location.longitude];
    }
    return [-0.1807, -78.4678]; // Quito, Ecuador
  };

  // Center map on user location when first obtained
  useEffect(() => {
    if (location && mapRef.current && !hasInitialCentered.current && !selectedLocation) {
      mapRef.current.setView([location.latitude, location.longitude], 15);
      hasInitialCentered.current = true;
    }
  }, [location, selectedLocation]);

  // Initialize map once
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

    // Click handler for selecting location
    const onClick = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`
        );
        const data = await response.json();
        // Always prioritize the readable address from the API
        const address = (data.display_name && data.display_name.trim()) 
          ? data.display_name 
          : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        const locationData: LocationData = {
          latitude: lat,
          longitude: lng,
          address: address,
        };
        onLocationSelect(locationData);
      } catch (_err) {
        // Only use coordinates as fallback if API call fails
        const fallback: LocationData = {
          latitude: lat,
          longitude: lng,
          address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        };
        onLocationSelect(fallback);
      }
    };

    map.on('click', onClick);
    mapRef.current = map;

    return () => {
      map.off('click', onClick);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep map centered when selectedLocation changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(getMapCenter(), 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]);

  // Ref para almacenar onLocationSelect y evitar recrear efectos
  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

  // Update selected location marker - SIN cleanup para evitar que desaparezca
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Limpiar marcador anterior SOLO al crear uno nuevo
    if (selectedMarkerRef.current) {
      try {
        if (map.hasLayer(selectedMarkerRef.current)) {
          map.removeLayer(selectedMarkerRef.current);
        }
      } catch {
        // Ignorar errores
      }
      selectedMarkerRef.current = null;
    }

    if (selectedLocation?.latitude && selectedLocation?.longitude) {
      const icon = new Icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(`
          <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
            <path fill="#f59e0b" stroke="#ffffff" stroke-width="2" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 6.9 12.5 28.5 12.5 28.5s12.5-21.6 12.5-28.5C25 5.6 19.4 0 12.5 0z"/>
            <circle fill="#ffffff" cx="12.5" cy="12.5" r="6"/>
          </svg>
        `)}`,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      try {
        const marker = L.marker([selectedLocation.latitude, selectedLocation.longitude], { 
          icon,
          draggable: true,
          zIndexOffset: 1000
        });
        
        marker.addTo(map);
        
        // Popup con estilo mejorado
        const popupContent = `
          <div style="min-width: 200px; padding: 4px;">
            <div style="font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 4px;">Ubicación seleccionada</div>
            <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">${selectedLocation.address}</div>
          </div>
        `;
        
        marker.bindPopup(popupContent, {
          className: 'custom-popup',
          closeButton: true,
          autoPan: true,
          maxWidth: 300
        });
        
        // Abrir popup automáticamente al crear el marcador
        marker.openPopup();

        // Handle drag end to update location
        marker.on('dragend', async () => {
          const { lat, lng } = marker.getLatLng();
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`
            );
            const data = await response.json();
            const address = (data.display_name && data.display_name.trim()) 
              ? data.display_name 
              : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            onLocationSelectRef.current({
              latitude: lat,
              longitude: lng,
              address: address,
            });
          } catch {
            onLocationSelectRef.current({
              latitude: lat, 
              longitude: lng,
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            });
          }
        });

        selectedMarkerRef.current = marker;
      } catch {
        // Ignorar errores si el mapa no está listo
      }
    }
    // NO cleanup - el marcador se limpia al inicio del próximo efecto
  }, [selectedLocation?.latitude, selectedLocation?.longitude, selectedLocation?.address]);

  // Update user location marker and accuracy circle - SIN cleanup para evitar que desaparezca
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const accuracyImproved = location && prevAccuracyRef.current !== null && location.accuracy < prevAccuracyRef.current;

    // Limpiar marcador anterior SOLO al crear uno nuevo
    if (userMarkerRef.current) {
      try {
        if (map.hasLayer(userMarkerRef.current)) {
          map.removeLayer(userMarkerRef.current);
        }
      } catch {
        // Ignorar errores
      }
      userMarkerRef.current = null;
    }

    // Limpiar círculo de precisión anterior
    if (accuracyCircleRef.current) {
      try {
        if (map.hasLayer(accuracyCircleRef.current)) {
          map.removeLayer(accuracyCircleRef.current);
        }
      } catch {
        // Ignorar errores
      }
      accuracyCircleRef.current = null;
    }

    if (location) {
      const userCoords: [number, number] = [location.latitude, location.longitude];
      const icon = new Icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(`
          <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <circle fill="#3b82f6" cx="10" cy="10" r="8" stroke="#ffffff" stroke-width="2"/>
            <circle fill="#ffffff" cx="10" cy="10" r="3"/>
          </svg>
        `)}`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      try {
        // Crear círculo de precisión
        accuracyCircleRef.current = L.circle(userCoords, {
          radius: location.accuracy,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(map);

        // Trigger pulse animation when accuracy improves
        if (accuracyImproved) {
          const element = accuracyCircleRef.current.getElement() as HTMLElement | null;
          if (element) {
            element.classList.add('accuracy-pulse');
          }
        }

        const marker = L.marker(userCoords, { 
          icon,
          zIndexOffset: 900
        });
        marker.addTo(map);
        
        // Popup con estilo mejorado para ubicación del usuario
        const userPopupContent = `
          <div style="min-width: 120px; padding: 4px;">
            <div style="font-weight: 600; font-size: 14px; color: #1f2937; text-align: center;">Tu ubicación</div>
            <div style="font-size: 11px; color: #6b7280; text-align: center; margin-top: 2px;">Precisión: ${location.accuracy.toFixed(0)}m</div>
          </div>
        `;
        
        marker.bindPopup(userPopupContent, {
          className: 'custom-popup',
          closeButton: true,
          autoPan: true
        });
        
        // El popup se abre automáticamente al hacer clic (comportamiento por defecto de Leaflet)
        // No cambiamos la ubicación seleccionada al hacer clic en el marcador azul

        userMarkerRef.current = marker;
      } catch {
        // Ignorar errores si el mapa no está listo
      }

      prevAccuracyRef.current = location.accuracy;
    }
    // NO cleanup - el marcador se limpia al inicio del próximo efecto
  }, [location?.latitude, location?.longitude, location?.accuracy]);

  const handleGetLocation = useCallback(() => {
    if (!isTracking && isSupported) {
      startTracking();
    }
    
    if (location && mapRef.current) {
      mapRef.current.setView([location.latitude, location.longitude], 15);
    }
  }, [location, isTracking, isSupported, startTracking]);

  return (
    <div className={cn('relative h-96', animationClasses.fadeIn, className)} style={{ isolation: 'isolate' }}>
      {/* Map container - CSS para forzar z-index de marcadores */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 rounded-lg w-full h-full [&_.leaflet-marker-pane]:!z-[600] [&_.leaflet-marker-icon]:!z-[600]"
        style={{ zIndex: 0 }}
      />

      {/* Controls - use z-20 which is above leaflet's reset z-index but below sidebar (z-50) */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto">
        <Button
          type="button"
          onClick={handleGetLocation}
          size="sm"
          variant="outline"
          className={cn(
            'bg-background/90 backdrop-blur-sm shadow-lg border',
            transitionClasses.button,
            hoverClasses.scale
          )}
          disabled={isTracking && !location}
        >
          {isTracking && !location ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              Obteniendo...
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4 mr-2" />
              Mi ubicación
            </>
          )}
        </Button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto">
        <Card className={cn(
          'bg-background/90 backdrop-blur-sm shadow-lg border',
          transitionClasses.card
        )}>
          <CardContent className="p-3">
            <p className="text-sm text-muted-foreground flex items-center justify-center">
              <MapPin className="h-4 w-4 mr-2" />
              Haz clic en el mapa para seleccionar la ubicación
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
