import { useState, useEffect, useCallback } from 'react';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface PushNotificationState {
  permission: NotificationPermissionState;
  isSupported: boolean;
  isSubscribed: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface UsePushNotificationsReturn extends PushNotificationState {
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => Promise<boolean>;
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;
}

/**
 * Hook para manejar notificaciones push con Service Worker
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationState>({
    permission: 'default',
    isSupported: false,
    isSubscribed: false,
    registration: null,
  });

  // Verificar soporte de notificaciones y Service Worker
  const checkSupport = useCallback(() => {
    const notificationSupported = 'Notification' in window;
    const serviceWorkerSupported = 'serviceWorker' in navigator;
    
    return notificationSupported && serviceWorkerSupported;
  }, []);

  // Obtener estado actual del permiso
  const getPermissionState = useCallback((): NotificationPermissionState => {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as NotificationPermissionState;
  }, []);

  // Registrar Service Worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] Service Worker no soportado');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[Push] Service Worker registrado:', registration.scope);

      // Esperar a que el SW esté activo
      if (registration.installing) {
        await new Promise<void>((resolve) => {
          registration.installing?.addEventListener('statechange', (e) => {
            if ((e.target as ServiceWorker).state === 'activated') {
              resolve();
            }
          });
        });
      }

      setState(prev => ({
        ...prev,
        registration,
        isSubscribed: true,
      }));

      return registration;
    } catch (error) {
      console.error('[Push] Error registrando Service Worker:', error);
      return null;
    }
  }, []);

  // Solicitar permiso de notificaciones
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('[Push] Notificaciones no soportadas');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission: permission as NotificationPermissionState,
      }));

      if (permission === 'granted') {
        console.log('[Push] Permiso concedido');
        // Registrar SW después de obtener permiso
        await registerServiceWorker();
        return true;
      }

      console.log('[Push] Permiso denegado o descartado:', permission);
      return false;
    } catch (error) {
      console.error('[Push] Error solicitando permiso:', error);
      return false;
    }
  }, [registerServiceWorker]);

  // Mostrar notificación
  const showNotification = useCallback(async (
    title: string,
    options?: NotificationOptions
  ): Promise<boolean> => {
    if (state.permission !== 'granted') {
      console.warn('[Push] No hay permiso para mostrar notificaciones');
      return false;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'unialerta-notification',
      ...options,
    };

    try {
      // Usar Service Worker si está disponible
      if (state.registration) {
        await state.registration.showNotification(title, defaultOptions);
        console.log('[Push] Notificación mostrada via SW');
        return true;
      }

      // Fallback a API de Notification directa
      new Notification(title, defaultOptions);
      console.log('[Push] Notificación mostrada directamente');
      return true;
    } catch (error) {
      console.error('[Push] Error mostrando notificación:', error);
      return false;
    }
  }, [state.permission, state.registration]);

  // Inicialización
  useEffect(() => {
    const isSupported = checkSupport();
    const permission = getPermissionState();

    setState(prev => ({
      ...prev,
      isSupported,
      permission,
    }));

    // Si ya hay permiso, registrar SW automáticamente
    if (permission === 'granted' && isSupported) {
      registerServiceWorker();
    }

    // Escuchar cambios en el SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setState(prev => ({
          ...prev,
          registration,
          isSubscribed: true,
        }));
      }).catch(() => {
        // SW no registrado aún
      });
    }
  }, [checkSupport, getPermissionState, registerServiceWorker]);

  return {
    ...state,
    requestPermission,
    showNotification,
    registerServiceWorker,
  };
}
