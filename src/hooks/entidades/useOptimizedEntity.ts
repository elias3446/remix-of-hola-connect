import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient, useQuery, useMutation, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Cache de userId a nivel de módulo para persistencia
let cachedUserId: string | null = null;

export function setCachedUserId(userId: string | null) {
  if (userId) {
    cachedUserId = userId;
  }
}

export function getCachedUserId(): string | null {
  return cachedUserId;
}

/**
 * Configuración para crear un hook de entidad optimizada
 */
export interface OptimizedEntityConfig<TData, TUpdateData = Partial<TData>> {
  /** Nombre de la tabla en Supabase */
  tableName: string;
  /** Clave de query para React Query */
  queryKey: string;
  /** Columna que contiene el user_id */
  userIdColumn?: string;
  /** Función para obtener datos iniciales desde auth/context */
  getInitialData?: () => TData | null;
  /** Función para transformar datos de la BD */
  transformData?: (data: unknown) => TData;
  /** Función para transformar datos antes de enviar a BD */
  transformForUpdate?: (data: TUpdateData) => Record<string, unknown>;
  /** Columnas a seleccionar */
  selectColumns?: string;
}

/**
 * Resultado del hook de entidad optimizada
 */
export interface OptimizedEntityResult<TData, TUpdateData = Partial<TData>> {
  data: TData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  update: (newData: TUpdateData) => Promise<void>;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

/**
 * Hook factory para crear hooks de entidades optimizadas
 * Implementa: carga instantánea, actualizaciones optimistas, sincronización real-time
 */
export function createOptimizedEntityHook<TData extends Record<string, unknown>, TUpdateData = Partial<TData>>(
  config: OptimizedEntityConfig<TData, TUpdateData>
) {
  const {
    tableName,
    queryKey,
    userIdColumn = 'user_id',
    getInitialData,
    transformData = (data) => data as TData,
    transformForUpdate = (data) => data as Record<string, unknown>,
    selectColumns = '*',
  } = config;

  return function useOptimizedEntity(userId?: string | null): OptimizedEntityResult<TData, TUpdateData> {
    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const lastUpdateRef = useRef<number>(0);

    // Usar userId proporcionado o el cacheado
    const effectiveUserId = userId || cachedUserId;

    // Actualizar cache de userId si se proporciona uno nuevo
    useEffect(() => {
      if (userId) {
        setCachedUserId(userId);
      }
    }, [userId]);

    // Obtener la clave completa de query
    const fullQueryKey: QueryKey = [queryKey, effectiveUserId];

    // Función para obtener datos de la BD
    const fetchData = useCallback(async (): Promise<TData | null> => {
      if (!effectiveUserId) {
        // Si no hay userId, intentar usar datos iniciales
        const initialData = getInitialData?.();
        if (initialData) return initialData;
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from(tableName)
        .select(selectColumns)
        .eq(userIdColumn, effectiveUserId)
        .maybeSingle();

      if (error) {
        console.error(`[useOptimized${queryKey}] Error fetching:`, error);
        throw error;
      }

      return data ? transformData(data) : null;
    }, [effectiveUserId]);

    // Query con staleTime infinito para persistencia en caché
    const {
      data,
      isLoading: queryIsLoading,
      isError,
      error,
      refetch: queryRefetch,
    } = useQuery({
      queryKey: fullQueryKey,
      queryFn: fetchData,
      enabled: !!effectiveUserId,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Seed inicial desde auth/context si está disponible
      initialData: () => {
        const initial = getInitialData?.();
        if (initial) return initial;
        return undefined;
      },
      // Mantener datos anteriores mientras se actualiza
      placeholderData: (previousData) => previousData,
    });

    // Mutación con actualizaciones optimistas
    const mutation = useMutation({
      mutationFn: async (updateData: TUpdateData): Promise<TData | null> => {
        if (!effectiveUserId) throw new Error('No user ID available');

        const transformedData = transformForUpdate(updateData);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updatedData, error } = await (supabase as any)
          .from(tableName)
          .update(transformedData)
          .eq(userIdColumn, effectiveUserId)
          .select(selectColumns)
          .maybeSingle();

        if (error) throw error;
        return updatedData ? transformData(updatedData) : null;
      },
      // Actualización optimista
      onMutate: async (updateData: TUpdateData) => {
        // Cancelar queries en curso
        await queryClient.cancelQueries({ queryKey: fullQueryKey });

        // Guardar valor anterior para rollback
        const previousData = queryClient.getQueryData<TData>(fullQueryKey);

        // Actualizar caché optimistamente
        if (previousData) {
          const optimisticData = { ...previousData, ...updateData } as TData;
          queryClient.setQueryData(fullQueryKey, optimisticData);
        }

        // Marcar timestamp de última actualización local
        lastUpdateRef.current = Date.now();

        return { previousData };
      },
      // Rollback en caso de error
      onError: (err, _variables, context) => {
        console.error(`[useOptimized${queryKey}] Update error:`, err);
        if (context?.previousData) {
          queryClient.setQueryData(fullQueryKey, context.previousData);
        }
      },
      // Actualizar con datos del servidor
      onSuccess: (serverData) => {
        if (serverData) {
          queryClient.setQueryData(fullQueryKey, serverData);
        }
      },
    });

    // Suscripción a cambios en tiempo real
    useEffect(() => {
      if (!effectiveUserId) return;

      // Limpiar canal anterior si existe
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`${tableName}-${effectiveUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
            filter: `${userIdColumn}=eq.${effectiveUserId}`,
          },
          (payload) => {
            // Ignorar cambios si acabamos de hacer una actualización local (debounce de 2s)
            const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
            if (timeSinceLastUpdate < 2000) {
              return;
            }

            // Actualizar caché con datos remotos
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const newData = transformData(payload.new);
              queryClient.setQueryData(fullQueryKey, newData);
            } else if (payload.eventType === 'DELETE') {
              queryClient.setQueryData(fullQueryKey, null);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    }, [effectiveUserId, queryClient, fullQueryKey]);

    // Función de actualización expuesta
    const update = useCallback(
      async (newData: TUpdateData) => {
        await mutation.mutateAsync(newData);
      },
      [mutation]
    );

    // Función de refetch expuesta
    const refetch = useCallback(async () => {
      await queryRefetch();
    }, [queryRefetch]);

    // Función para invalidar caché
    const invalidate = useCallback(async () => {
      await queryClient.invalidateQueries({ queryKey: fullQueryKey });
    }, [queryClient, fullQueryKey]);

    // Fallback inteligente: usar datos iniciales si no hay datos en caché
    const fallbackData = data ?? getInitialData?.() ?? null;

    // No mostrar loading si hay datos disponibles (del caché o fallback)
    const isLoading = queryIsLoading && !fallbackData;

    return {
      data: fallbackData,
      isLoading,
      isError,
      error: error as Error | null,
      update,
      refetch,
      invalidate,
    };
  };
}

/**
 * Hook utilitario para pre-poblar el caché con datos de auth
 */
export function useSeedQueryCache<TData>(
  queryKey: QueryKey,
  data: TData | null | undefined,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const seededRef = useRef(false);

  useEffect(() => {
    if (enabled && data && !seededRef.current) {
      const existingData = queryClient.getQueryData(queryKey);
      if (!existingData) {
        queryClient.setQueryData(queryKey, data);
        seededRef.current = true;
      }
    }
  }, [queryClient, queryKey, data, enabled]);
}
