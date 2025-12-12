import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGlobalLocation } from '@/contexts/LocationContext';
import { UserLocation } from './useUserLocation';

export interface NavigationDestination {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  id?: string;
}

export interface NavigationStats {
  distanceMeters: number;
  distanceKm: number;
  estimatedTimeMinutes: number;
  bearing: number;
  bearingDirection: string;
}

export interface ReportForNavigation {
  id: string;
  nombre: string;
  descripcion?: string | null;
  latitud: number;
  longitud: number;
  direccion?: string;
  created_at?: string;
  status?: string;
  visibility?: string;
}

export interface UseRealtimeNavigationReturn {
  userLocation: UserLocation | null;
  destination: NavigationDestination | null;
  stats: NavigationStats | null;
  isTracking: boolean;
  error: GeolocationPositionError | null;
  isSupported: boolean;
  setDestination: (dest: NavigationDestination | null) => void;
  // Nuevo: navegación automática al reporte más cercano
  nearestReport: ReportForNavigation | null;
  allReportsWithDistance: Array<ReportForNavigation & { distanceMeters: number }>;
  isNavigationActive: boolean;
  setIsNavigationActive: (active: boolean) => void;
  setReports: (reports: ReportForNavigation[]) => void;
}

/**
 * Calcula la distancia en metros entre dos puntos usando la fórmula de Haversine
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcula el bearing (dirección) entre dos puntos
 */
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Convierte el bearing a una dirección cardinal
 */
function bearingToDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Estima el tiempo de llegada basado en velocidad promedio caminando
 */
function estimateWalkingTime(distanceMeters: number, currentSpeed: number | null): number {
  const avgWalkingSpeedMps = currentSpeed && currentSpeed > 0.5 ? currentSpeed : 1.4; // ~5 km/h
  return Math.round(distanceMeters / avgWalkingSpeedMps / 60);
}

/**
 * Hook para navegación en tiempo real hacia un destino.
 * Utiliza la ubicación global del contexto (tracking en segundo plano).
 * Incluye funcionalidad para detectar automáticamente el reporte más cercano.
 */
export function useRealtimeNavigation(): UseRealtimeNavigationReturn {
  const {
    location: userLocation,
    error,
    isTracking,
    isSupported,
  } = useGlobalLocation();

  const [destination, setDestination] = useState<NavigationDestination | null>(null);
  const [reports, setReports] = useState<ReportForNavigation[]>([]);
  const [isNavigationActive, setIsNavigationActive] = useState(true);

  // Calcular distancia para todos los reportes
  const allReportsWithDistance = useMemo(() => {
    if (!userLocation || reports.length === 0) return [];

    return reports
      .map((report) => {
        const distanceMeters = calculateHaversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          report.latitud,
          report.longitud
        );
        return { ...report, distanceMeters };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [userLocation, reports]);

  // Obtener el reporte más cercano
  const nearestReport = useMemo(() => {
    if (allReportsWithDistance.length === 0) return null;
    return allReportsWithDistance[0];
  }, [allReportsWithDistance]);

  // Actualizar destino automáticamente al reporte más cercano cuando la navegación está activa
  useEffect(() => {
    if (!isNavigationActive || !nearestReport) {
      if (!isNavigationActive) {
        setDestination(null);
      }
      return;
    }

    // Solo actualizar si el reporte más cercano cambió
    if (!destination || destination.id !== nearestReport.id) {
      setDestination({
        latitude: nearestReport.latitud,
        longitude: nearestReport.longitud,
        name: nearestReport.nombre,
        address: nearestReport.direccion,
        id: nearestReport.id,
      });
    }
  }, [nearestReport, isNavigationActive, destination]);

  // Calcular estadísticas de navegación
  const stats = useMemo<NavigationStats | null>(() => {
    if (!userLocation || !destination) return null;

    const distanceMeters = calculateHaversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      destination.latitude,
      destination.longitude
    );

    const bearing = calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      destination.latitude,
      destination.longitude
    );

    return {
      distanceMeters,
      distanceKm: distanceMeters / 1000,
      estimatedTimeMinutes: estimateWalkingTime(distanceMeters, userLocation.speed),
      bearing,
      bearingDirection: bearingToDirection(bearing),
    };
  }, [userLocation, destination]);

  const handleSetReports = useCallback((newReports: ReportForNavigation[]) => {
    setReports(newReports);
  }, []);

  const handleSetNavigationActive = useCallback((active: boolean) => {
    setIsNavigationActive(active);
    if (!active) {
      setDestination(null);
    }
  }, []);

  return {
    userLocation,
    destination,
    stats,
    isTracking,
    error,
    isSupported,
    setDestination,
    nearestReport,
    allReportsWithDistance,
    isNavigationActive,
    setIsNavigationActive: handleSetNavigationActive,
    setReports: handleSetReports,
  };
}
