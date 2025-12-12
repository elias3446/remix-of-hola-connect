import { useState, useEffect, useCallback, useRef } from 'react';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface UseUserLocationReturn {
  location: UserLocation | null;
  error: GeolocationPositionError | null;
  isTracking: boolean;
  isSupported: boolean;
  startTracking: () => void;
  stopTracking: () => void;
}

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const { coords, timestamp } = position;
    setLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
      timestamp,
    });
    setError(null);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(err);
    console.error('Error de geolocalización:', err.message);
  }, []);

  const startTracking = useCallback(() => {
    if (!isSupported) {
      console.warn('Geolocalización no soportada en este navegador');
      return;
    }

    if (watchIdRef.current !== null) {
      return; // Ya está rastreando
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 segundos para dar más tiempo
      maximumAge: 5000, // Permite caché de 5 segundos para evitar timeouts
    };

    // Obtener ubicación inicial inmediatamente (con caché permitido)
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (err) => {
        // Solo log, no bloquear - watchPosition seguirá intentando
        console.log('Ubicación inicial no disponible inmediatamente:', err.message);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );
    setIsTracking(true);
  }, [isSupported, handleSuccess, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
      setLocation(null);
      setError(null);
    }
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    location,
    error,
    isTracking,
    isSupported,
    startTracking,
    stopTracking,
  };
}
