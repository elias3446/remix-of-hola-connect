import React, { useEffect, useRef } from 'react';
import L, { Map as LeafletMap, Marker as LeafletMarker, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses, hoverClasses } from '@/hooks/optimizacion';
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

interface ReportLocationMapProps {
  latitude: number;
  longitude: number;
  title: string;
  address?: string;
  createdAt?: string;
  className?: string;
}

const createReportIcon = (): Icon => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="30" height="45" viewBox="0 0 30 45" xmlns="http://www.w3.org/2000/svg">
        <path fill="#3b82f6" stroke="#ffffff" stroke-width="2" d="M15 0C6.7 0 0 6.7 0 15c0 8.3 15 30 15 30s15-21.7 15-30C30 6.7 23.3 0 15 0z"/>
        <circle fill="#ffffff" cx="15" cy="15" r="7"/>
        <circle fill="#3b82f6" cx="15" cy="15" r="3"/>
      </svg>
    `)}`,
    iconSize: [30, 45],
    iconAnchor: [15, 45],
    popupAnchor: [0, -40],
  });
};

export const ReportLocationMap: React.FC<ReportLocationMapProps> = ({
  latitude,
  longitude,
  title,
  address,
  createdAt,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  // Crear contenido del popup
  const createPopupContent = (): string => {
    const formattedDate = createdAt 
      ? format(new Date(createdAt), "d/MM/yyyy, HH:mm:ss", { locale: es })
      : '';
    
    return `
      <div style="padding: 4px; max-width: 280px; word-wrap: break-word; overflow-wrap: break-word;">
        <strong style="font-size: 14px; color: #1f2937; display: block; word-break: break-word; margin-bottom: 4px;">${title}</strong>
        ${address ? `<p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0; line-height: 1.4; word-break: break-word;">${address}</p>` : ''}
        ${formattedDate ? `<p style="color: #9ca3af; font-size: 11px; margin: 0;">${formattedDate}</p>` : ''}
      </div>
    `;
  };

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const coords: [number, number] = [latitude, longitude];

    const map = L.map(containerRef.current, {
      center: coords,
      zoom: 16,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Agregar marcador del reporte
    markerRef.current = L.marker(coords, { icon: createReportIcon() })
      .addTo(map)
      .bindPopup(createPopupContent(), {
        maxWidth: 300,
        className: 'custom-popup',
      });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [latitude, longitude, title, address, createdAt]);

  // Actualizar popup cuando cambian los datos
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setPopupContent(createPopupContent());
    }
  }, [title, address, createdAt]);

  return (
    <div className={cn('relative z-0', animationClasses.fadeIn, className)}>
      {/* Botón Google Maps */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          type="button"
          onClick={handleOpenGoogleMaps}
          size="sm"
          variant="outline"
          className={cn(
            'bg-background/90 backdrop-blur-sm shadow-md',
            transitionClasses.button,
            hoverClasses.scale
          )}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Google Maps
        </Button>
      </div>

      <div ref={containerRef} className="rounded-lg h-[400px] w-full" />
    </div>
  );
};
