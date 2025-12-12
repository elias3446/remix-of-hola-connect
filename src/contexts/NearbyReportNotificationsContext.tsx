import { createContext, useContext, ReactNode } from 'react';
import { useNearbyReportNotifications } from '@/hooks/controlador/useNearbyReportNotifications';

interface NearbyReportNotificationsContextValue {
  isEnabled: boolean;
  isTracking: boolean;
  hasLocation: boolean;
  notificationPermission: NotificationPermission | null;
  requestPermission: () => Promise<boolean>;
}

const NearbyReportNotificationsContext = createContext<NearbyReportNotificationsContextValue | null>(null);

interface NearbyReportNotificationsProviderProps {
  children: ReactNode;
}

/**
 * Provider global para notificaciones push de reportes cercanos.
 * Debe estar dentro de LocationProvider y AuthProvider.
 */
export function NearbyReportNotificationsProvider({ children }: NearbyReportNotificationsProviderProps) {
  const state = useNearbyReportNotifications();

  return (
    <NearbyReportNotificationsContext.Provider value={state}>
      {children}
    </NearbyReportNotificationsContext.Provider>
  );
}

/**
 * Hook para acceder al estado de notificaciones push de reportes cercanos.
 */
export function useNearbyReportNotificationsContext(): NearbyReportNotificationsContextValue {
  const context = useContext(NearbyReportNotificationsContext);
  if (!context) {
    throw new Error('useNearbyReportNotificationsContext debe usarse dentro de NearbyReportNotificationsProvider');
  }
  return context;
}
