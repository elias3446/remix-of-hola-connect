import { useEffect, useRef, useCallback, useState, createElement } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalLocation } from '@/contexts/LocationContext';
import { useOptimizedSettings } from '@/hooks/entidades/useOptimizedSettings';
import { useUserDataReady } from '@/hooks/entidades';
import { calculateDistance } from '@/lib/distance';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { NearbyReportsGroupToast, type NearbyReportData } from '@/components/notifications/NearbyReportsGroupToast';

type Reporte = Database['public']['Tables']['reportes']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

// Radio de detección en kilómetros (100 metros = 0.1 km)
const PROXIMITY_THRESHOLD_KM = 0.1;

// Intervalo de verificación en ms (30 segundos)
const CHECK_INTERVAL_MS = 30000;

// Duración del toast en ms (15 segundos para dar tiempo a navegar)
const TOAST_DURATION_MS = 15000;

// ID único para el toast consolidado (para evitar duplicados)
const CONSOLIDATED_TOAST_ID = 'nearby-reports-consolidated';

interface NearbyReportPayload {
  id: string;
  nombre: string;
  descripcion: string | null;
  status: string;
  priority: string;
  lat: number;
  lng: number;
  distanceKm: number;
  categoryName?: string | null;
  categoryColor?: string | null;
  address?: string | null;
}

interface ReportProximityState {
  [reportId: string]: boolean; // true = dentro del radio, false = fuera
}

// Buffer para acumular reportes cercanos detectados
interface PendingReportsBuffer {
  reports: NearbyReportData[];
  lastUpdated: number;
}

/**
 * Solicita permisos de notificación al navegador
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("Este navegador no soporta notificaciones push");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

/**
 * Muestra una notificación nativa consolidada del sistema operativo
 */
const showConsolidatedNativeNotification = (
  reports: NearbyReportData[]
) => {
  if (Notification.permission !== "granted" || reports.length === 0) return;

  try {
    // Ordenar por distancia (más cercano primero)
    const sortedReports = [...reports].sort((a, b) => a.distanceKm - b.distanceKm);
    const closest = sortedReports[0];
    
    // Construir título y cuerpo según cantidad de reportes
    const title = reports.length === 1 
      ? "🚨 ¡Reporte cercano!" 
      : `🚨 ${reports.length} reportes cercanos`;
    
    const body = reports.length === 1
      ? `${closest.nombre} - ${closest.distanceText} de distancia`
      : `El más cercano: "${closest.nombre}" a ${closest.distanceText}`;

    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "reportes-cercanos-consolidated", // Mismo tag para reemplazar notificaciones anteriores
      requireInteraction: false,
      silent: false,
    });

    // Cerrar después de 15 segundos
    setTimeout(() => notification.close(), 15000);

    // Manejar click - navegar al más cercano
    notification.onclick = () => {
      window.focus();
      if (closest.lat && closest.lng) {
        window.open(
          `https://www.google.com/maps/dir/?api=1&destination=${closest.lat},${closest.lng}`,
          "_blank"
        );
      } else {
        window.location.href = `/reportes/${closest.id}`;
      }
      notification.close();
    };
  } catch (error) {
    console.error("Error mostrando notificación nativa consolidada:", error);
  }
};

/**
 * Hook que escucha reportes cercanos en tiempo real y notifica al usuario.
 * Usa notificaciones push nativas del navegador.
 * Solo actúa si real_time_tracking_enabled está habilitado en settings.
 */
export function useNearbyReportNotifications() {
  const { profile } = useUserDataReady();
  const profileId = profile?.id ?? null;

  const { data: settings, isLoading: settingsLoading } = useOptimizedSettings();
  const { location, isTracking } = useGlobalLocation();

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [isCheckingReports, setIsCheckingReports] = useState(false);

  // Estado de proximidad por reporte (para detectar transiciones)
  const proximityStateRef = useRef<ReportProximityState>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Buffer para acumular reportes cercanos y mostrar toast consolidado
  const pendingReportsRef = useRef<PendingReportsBuffer>({ reports: [], lastUpdated: 0 });
  const consolidatedToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref para la ubicación actual (para usar en callbacks sin recrearlos)
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  
  // Actualizar ref de ubicación cuando cambia
  useEffect(() => {
    if (location) {
      locationRef.current = { latitude: location.latitude, longitude: location.longitude };
    } else {
      locationRef.current = null;
    }
  }, [location]);

  // Verificar si el tracking está habilitado
  const isEnabled = settings?.real_time_tracking_enabled ?? false;

  // Verificar estado de permisos de notificación
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Solicitar permisos cuando se habilita el tracking
  const requestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted ? "granted" : "denied");
    return granted;
  }, []);

  // Crear notificación en la base de datos
  const createNotification = useCallback(
    async (payload: NearbyReportPayload) => {
      if (!profileId) return;

      try {
        const distanceText =
          payload.distanceKm < 1
            ? `${Math.round(payload.distanceKm * 1000)} metros`
            : `${payload.distanceKm.toFixed(1)} km`;

        await supabase.from("notifications").insert({
          user_id: profileId,
          type: "advertencia" as const,
          title: "🚨 ¡Reporte cercano!",
          message: `"${payload.nombre}" a ${distanceText} de tu ubicación`,
          data: {
            report_id: payload.id,
            distance_km: payload.distanceKm,
            lat: payload.lat,
            lng: payload.lng,
            priority: payload.priority,
            status: payload.status,
          },
          read: false,
        });
      } catch (error) {
        console.error("Error creating nearby report notification:", error);
      }
    },
    [profileId]
  );

  // Mostrar toast consolidado con todos los reportes cercanos
  const showConsolidatedToast = useCallback((reports: NearbyReportData[]) => {
    if (reports.length === 0) return;

    // Ordenar por distancia (más cercano primero)
    const sortedReports = [...reports].sort((a, b) => a.distanceKm - b.distanceKm);

    const handleNavigate = (report: NearbyReportData) => {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${report.lat},${report.lng}`,
        "_blank"
      );
    };

    const handleViewReport = (reportId: string) => {
      window.location.href = `/reportes/${reportId}`;
    };

    // Cerrar toast anterior si existe y mostrar el nuevo
    toast.dismiss(CONSOLIDATED_TOAST_ID);
    
    toast.warning(
      createElement(NearbyReportsGroupToast, {
        reports: sortedReports,
        onNavigate: handleNavigate,
        onViewReport: handleViewReport,
      }),
      {
        id: CONSOLIDATED_TOAST_ID,
        duration: TOAST_DURATION_MS,
        closeButton: true,
        className: "nearby-reports-consolidated-toast",
      }
    );
  }, []);

  // Agregar reporte al buffer y programar notificaciones consolidadas
  const addToPendingReports = useCallback((payload: NearbyReportPayload) => {
    const distanceText =
      payload.distanceKm < 1
        ? `${Math.round(payload.distanceKm * 1000)} m`
        : `${payload.distanceKm.toFixed(2)} km`;

    const reportData: NearbyReportData = {
      id: payload.id,
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      distanceText,
      distanceKm: payload.distanceKm,
      address: payload.address,
      lat: payload.lat,
      lng: payload.lng,
      priority: payload.priority,
      categoryName: payload.categoryName,
      categoryColor: payload.categoryColor,
    };

    // Evitar duplicados
    const exists = pendingReportsRef.current.reports.some(r => r.id === payload.id);
    if (!exists) {
      pendingReportsRef.current.reports.push(reportData);
      pendingReportsRef.current.lastUpdated = Date.now();
    }

    // Cancelar timeout anterior y programar nuevo
    if (consolidatedToastTimeoutRef.current) {
      clearTimeout(consolidatedToastTimeoutRef.current);
    }

    // Esperar 500ms para acumular más reportes antes de mostrar
    consolidatedToastTimeoutRef.current = setTimeout(() => {
      const reportsToShow = [...pendingReportsRef.current.reports];
      pendingReportsRef.current.reports = [];
      
      if (reportsToShow.length > 0) {
        // Mostrar toast consolidado
        showConsolidatedToast(reportsToShow);
        // Mostrar notificación push nativa consolidada
        showConsolidatedNativeNotification(reportsToShow);
      }
    }, 500);
  }, [showConsolidatedToast]);

  // Notificar al usuario (agregar al buffer + DB)
  const notifyUser = useCallback(
    (payload: NearbyReportPayload) => {
      // 1. Agregar al buffer para notificaciones consolidadas (toast + push)
      addToPendingReports(payload);

      // 2. Guardar en base de datos
      createNotification(payload);
    },
    [addToPendingReports, createNotification]
  );

  // Verificar reportes cercanos
  const checkNearbyReports = useCallback(
    async (userLat: number, userLng: number) => {
      if (!profileId || isCheckingReports) return;

      setIsCheckingReports(true);

      try {
        // Obtener reportes activos con información de categoría
        const { data: reportes, error } = await supabase
          .from("reportes")
          .select("*, categories(nombre, color)")
          .in("status", ["pendiente", "en_progreso"])
          .eq("activo", true)
          .is("deleted_at", null) as { 
            data: (Reporte & { categories: Pick<Category, 'nombre' | 'color'> | null })[] | null; 
            error: any 
          };

        if (error) {
          console.error("Error fetching reports:", error);
          return;
        }

        if (!reportes) return;

        reportes.forEach((reporte) => {
          // Evitar notificar reportes propios
          if (reporte.user_id === profileId) return;

          // Extraer coordenadas del reporte
          let reportLat: number | null = null;
          let reportLng: number | null = null;

          if (reporte.location && typeof reporte.location === "object") {
            const loc = reporte.location as { lat?: number; lng?: number };
            reportLat = loc.lat ?? null;
            reportLng = loc.lng ?? null;
          }

          if (reportLat === null || reportLng === null) return;

          // Calcular distancia
          const distanceKm = calculateDistance(userLat, userLng, reportLat, reportLng);
          const isInside = distanceKm <= PROXIMITY_THRESHOLD_KM;
          const wasInside = proximityStateRef.current[reporte.id] ?? false;

          // Actualizar estado de proximidad
          proximityStateRef.current[reporte.id] = isInside;

          // Solo notificar al ENTRAR al radio (transición de fuera a dentro)
          if (isInside && !wasInside) {
            // Extraer dirección del location si existe
            const locationData = reporte.location as { 
              lat?: number; 
              lng?: number; 
              address?: string 
            } | null;

            const payload: NearbyReportPayload = {
              id: reporte.id,
              nombre: reporte.nombre,
              descripcion: reporte.descripcion,
              status: reporte.status,
              priority: reporte.priority,
              lat: reportLat,
              lng: reportLng,
              distanceKm,
              categoryName: reporte.categories?.nombre ?? null,
              categoryColor: reporte.categories?.color ?? null,
              address: locationData?.address ?? null,
            };

            notifyUser(payload);
          }
        });
      } catch (error) {
        console.error("Error checking nearby reports:", error);
      } finally {
        setIsCheckingReports(false);
      }
    },
    [profileId, isCheckingReports, notifyUser]
  );

  // Procesar un reporte nuevo en tiempo real
  const processNewReport = useCallback(
    (report: Reporte, userLat: number, userLng: number) => {
      // Evitar notificar reportes propios
      if (report.user_id === profileId) return;

      // Extraer coordenadas del reporte
      let reportLat: number | null = null;
      let reportLng: number | null = null;

      if (report.location && typeof report.location === "object") {
        const loc = report.location as { lat?: number; lng?: number };
        reportLat = loc.lat ?? null;
        reportLng = loc.lng ?? null;
      }

      if (reportLat === null || reportLng === null) return;

      // Calcular distancia
      const distanceKm = calculateDistance(userLat, userLng, reportLat, reportLng);

      // Si está dentro del radio, notificar inmediatamente
      if (distanceKm <= PROXIMITY_THRESHOLD_KM) {
        const payload: NearbyReportPayload = {
          id: report.id,
          nombre: report.nombre,
          descripcion: report.descripcion,
          status: report.status,
          priority: report.priority,
          lat: reportLat,
          lng: reportLng,
          distanceKm,
        };

        // Marcar como dentro del radio
        proximityStateRef.current[report.id] = true;

        notifyUser(payload);
      }
    },
    [profileId, notifyUser]
  );

  // Efecto principal: configurar monitoreo periódico y suscripción en tiempo real
  useEffect(() => {
    // No continuar si no está habilitado o no hay ubicación
    if (!isEnabled || !isTracking || !location || settingsLoading || !profileId) {
      // Limpiar recursos
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Solicitar permisos de notificación si no se han solicitado
    if (notificationPermission === null || notificationPermission === "default") {
      requestPermission();
    }

    // Verificación periódica cada 30 segundos usando locationRef para obtener ubicación actualizada
    if (!checkIntervalRef.current) {
      checkIntervalRef.current = setInterval(() => {
        const currentLoc = locationRef.current;
        if (currentLoc) {
          checkNearbyReports(currentLoc.latitude, currentLoc.longitude);
        }
      }, CHECK_INTERVAL_MS);
    }

    // Suscripción a nuevos reportes en tiempo real (solo crear una vez)
    if (!channelRef.current) {
      const channel = supabase
        .channel(`nearby-reports-${profileId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "reportes",
          },
          (payload) => {
            const newReport = payload.new as Reporte;
            const currentLoc = locationRef.current;
            if (newReport.activo && !newReport.deleted_at && currentLoc) {
              processNewReport(newReport, currentLoc.latitude, currentLoc.longitude);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "reportes",
          },
          (payload) => {
            const updatedReport = payload.new as Reporte;
            const currentLoc = locationRef.current;
            // Notificar cuando un reporte cambia a prioridad alta/urgente
            if (
              updatedReport.activo &&
              !updatedReport.deleted_at &&
              (updatedReport.priority === "alto" || updatedReport.priority === "urgente") &&
              currentLoc
            ) {
              processNewReport(updatedReport, currentLoc.latitude, currentLoc.longitude);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [
    isEnabled,
    isTracking,
    settingsLoading,
    profileId,
    notificationPermission,
    requestPermission,
    checkNearbyReports,
    processNewReport,
  ]);

  // Efecto reactivo: verificar reportes cercanos cuando la ubicación cambia significativamente
  const lastCheckedLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  
  useEffect(() => {
    if (!isEnabled || !isTracking || !location || settingsLoading || !profileId) return;
    
    const { latitude, longitude } = location;
    
    // Verificar si la ubicación cambió significativamente (más de 20 metros)
    if (lastCheckedLocationRef.current) {
      const distance = calculateDistance(
        lastCheckedLocationRef.current.lat,
        lastCheckedLocationRef.current.lng,
        latitude,
        longitude
      );
      
      // Solo verificar si se movió más de 20 metros
      if (distance < 0.02) return; // 0.02 km = 20 metros
    }
    
    // Actualizar última ubicación verificada
    lastCheckedLocationRef.current = { lat: latitude, lng: longitude };
    
    // Verificar reportes cercanos con la nueva ubicación
    checkNearbyReports(latitude, longitude);
  }, [location, isEnabled, isTracking, settingsLoading, profileId, checkNearbyReports]);

  // Limpiar estado de proximidad periódicamente (cada hora)
  useEffect(() => {
    const interval = setInterval(() => {
      proximityStateRef.current = {};
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    isEnabled,
    isTracking,
    hasLocation: !!location,
    notificationPermission,
    requestPermission,
  };
}

export type { NearbyReportPayload };
