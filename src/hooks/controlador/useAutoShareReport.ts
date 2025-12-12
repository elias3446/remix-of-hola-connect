/**
 * Hook para publicación automática de reportes en estado o feed
 * Usa datos de settings desde el caché (localStorage/React Query)
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Reporte = Database['public']['Tables']['reportes']['Row'];
type Settings = Database['public']['Tables']['settings']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface AutoShareResult {
  estadoCreated: boolean;
  publicacionCreated: boolean;
  estadoId?: string;
  publicacionId?: string;
}

const ESTADO_DURATION_HOURS = 24;

/**
 * Hook que proporciona la función para auto-compartir un reporte
 * según la configuración del usuario en la tabla settings
 * 
 * Lee directamente del caché de React Query para obtener datos actualizados
 */
export function useAutoShareReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const authUserId = user?.id;

  /**
   * Obtiene los settings y profile desde el caché de React Query
   * Esto garantiza obtener el valor más actualizado del caché
   */
  const getCachedData = useCallback(() => {
    if (!authUserId) return { settings: null, profile: null };

    const settings = queryClient.getQueryData<Settings>(['settings', authUserId]);
    const profile = queryClient.getQueryData<Profile>(['profile', authUserId]);

    return { settings, profile };
  }, [queryClient, authUserId]);

  /**
   * Auto-comparte un reporte basado en la configuración del usuario
   * @param reporte - El reporte recién creado
   * @returns Resultado de la operación de auto-compartir
   */
  const autoShareReport = useCallback(async (reporte: Reporte): Promise<AutoShareResult> => {
    const result: AutoShareResult = {
      estadoCreated: false,
      publicacionCreated: false,
    };

    // Obtener datos frescos del caché
    const { settings, profile } = getCachedData();

    if (process.env.NODE_ENV === 'development') {
      console.log('[useAutoShareReport] Settings from cache:', settings);
      console.log('[useAutoShareReport] Profile from cache:', profile);
    }

    // Si no hay settings o el auto-share no está habilitado, salir
    if (!settings?.auto_share_reports_enabled || !profile?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useAutoShareReport] Auto-share not enabled or no profile:', {
          hasSettings: !!settings,
          autoShareEnabled: settings?.auto_share_reports_enabled,
          hasProfile: !!profile,
        });
      }
      return result;
    }

    const {
      auto_share_as_status,
      auto_share_in_messages,
      auto_share_visibility,
    } = settings;

    // Si ninguna opción de compartir está activa, salir
    if (!auto_share_as_status && !auto_share_in_messages) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useAutoShareReport] No share options enabled');
      }
      return result;
    }

    // Construir contenido para el estado/publicación
    const contenido = buildShareContent(reporte);
    const imagenes = reporte.imagenes || [];
    // Para estados, visibilidad usa 'todos' en lugar de 'publico'
    const visibilidadEstado = 'todos';
    // Para publicaciones, usar la visibilidad de settings
    const visibilidadPublicacion = auto_share_visibility || 'publico';

    if (process.env.NODE_ENV === 'development') {
      console.log('[useAutoShareReport] Creating estado/publicacion with:', {
        auto_share_as_status,
        auto_share_in_messages,
        visibilidadEstado,
        visibilidadPublicacion,
        contenido: contenido.substring(0, 50) + '...',
      });
    }

    try {
      // Crear estado si está habilitado (auto_share_as_status o auto_share_in_messages)
      if (auto_share_as_status || auto_share_in_messages) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + ESTADO_DURATION_HOURS);

        const estadoData = {
          user_id: profile.id,
          contenido,
          imagenes: imagenes.length > 0 ? imagenes : null,
          visibilidad: visibilidadEstado,
          tipo: imagenes.length > 0 ? 'imagen' : 'texto',
          expires_at: expiresAt.toISOString(),
          activo: true,
          compartido_en_social: !!auto_share_as_status,
          compartido_en_mensajes: !!auto_share_in_messages,
        };

        const { data: estado, error: estadoError } = await supabase
          .from('estados')
          .insert(estadoData)
          .select('id')
          .single();

        if (estadoError) {
          console.error('[useAutoShareReport] Error creating estado:', estadoError);
        } else if (estado) {
          result.estadoCreated = true;
          result.estadoId = estado.id;

          if (process.env.NODE_ENV === 'development') {
            console.log('[useAutoShareReport] Estado created:', estado.id);
          }

          // Si se comparte en el feed (social), crear también una publicación vinculada al estado
          if (auto_share_as_status) {
            const publicacionData = {
              user_id: profile.id,
              contenido,
              imagenes: imagenes.length > 0 ? imagenes : null,
              visibilidad: visibilidadPublicacion,
              estado_id: estado.id,
              activo: true,
            };

            const { data: publicacion, error: publicacionError } = await supabase
              .from('publicaciones')
              .insert(publicacionData)
              .select('id')
              .single();

            if (publicacionError) {
              console.error('[useAutoShareReport] Error creating publicacion:', publicacionError);
            } else if (publicacion) {
              result.publicacionCreated = true;
              result.publicacionId = publicacion.id;

              if (process.env.NODE_ENV === 'development') {
                console.log('[useAutoShareReport] Publicacion created:', publicacion.id);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[useAutoShareReport] Error in auto-share:', error);
    }

    return result;
  }, [getCachedData]);

  /**
   * Verifica si el auto-share está habilitado sin ejecutar nada
   */
  const isAutoShareEnabled = useCallback((): boolean => {
    const { settings } = getCachedData();
    
    if (!settings?.auto_share_reports_enabled) return false;
    return !!(settings.auto_share_as_status || settings.auto_share_in_messages);
  }, [getCachedData]);

  /**
   * Obtiene la configuración actual de auto-share
   */
  const getAutoShareConfig = useCallback(() => {
    const { settings } = getCachedData();
    
    return {
      enabled: settings?.auto_share_reports_enabled ?? false,
      shareAsStatus: settings?.auto_share_as_status ?? false,
      shareInMessages: settings?.auto_share_in_messages ?? false,
      visibility: settings?.auto_share_visibility ?? 'publico',
    };
  }, [getCachedData]);

  return {
    autoShareReport,
    isAutoShareEnabled,
    getAutoShareConfig,
  };
}

/**
 * Construye el contenido del post/estado a partir del reporte
 */
function buildShareContent(reporte: Reporte): string {
  const parts: string[] = [];

  // Título del reporte
  parts.push(`📢 ${reporte.nombre}`);

  // Descripción (si existe, truncada a 200 caracteres)
  if (reporte.descripcion) {
    const descripcion = reporte.descripcion.length > 200
      ? `${reporte.descripcion.substring(0, 197)}...`
      : reporte.descripcion;
    parts.push(descripcion);
  }

  // Ubicación (si existe)
  if (reporte.location) {
    const loc = reporte.location as { address?: string };
    if (loc.address) {
      parts.push(`📍 ${loc.address}`);
    }
  }

  // Hashtag del reporte
  parts.push('#UniAlertaUCE #Reporte');

  return parts.join('\n\n');
}
