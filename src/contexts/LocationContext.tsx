import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useUserLocation, UseUserLocationReturn } from '@/hooks/controlador/useUserLocation';
import { useSessionPersistence } from '@/hooks/controlador/useSessionPersistence';

const LocationContext = createContext<UseUserLocationReturn | null>(null);

interface LocationProviderProps {
  children: ReactNode;
}

/**
 * Provider global para la ubicación del usuario.
 * Inicia el tracking cuando el usuario está autenticado.
 * Detiene el tracking cuando cierra sesión.
 */
export function LocationProvider({ children }: LocationProviderProps) {
  const { isAuthenticated, loading } = useSessionPersistence();
  const locationState = useUserLocation();
  const { startTracking, stopTracking, isSupported, isTracking } = locationState;

  useEffect(() => {
    // Esperar a que termine de cargar la sesión
    if (loading) return;

    if (isAuthenticated && isSupported && !isTracking) {
      // Usuario autenticado: iniciar tracking
      startTracking();
    } else if (!isAuthenticated && isTracking) {
      // Usuario cerró sesión: detener tracking
      stopTracking();
    }
  }, [isAuthenticated, loading, isSupported, isTracking, startTracking, stopTracking]);

  return (
    <LocationContext.Provider value={locationState}>
      {children}
    </LocationContext.Provider>
  );
}

/**
 * Hook para acceder a la ubicación del usuario desde cualquier componente.
 */
export function useGlobalLocation(): UseUserLocationReturn {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useGlobalLocation debe usarse dentro de LocationProvider');
  }
  return context;
}
