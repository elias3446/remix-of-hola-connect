import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient, useQuery, useMutation, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Keys para localStorage de entidades
const getStorageKey = (entityKey: string) => `entity_cache:${entityKey}`;
const getTimestampKey = (entityKey: string) => `entity_cache:${entityKey}:timestamp`;

// Tiempo máximo de validez del caché (1 hora para listas)
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Guarda datos en localStorage de forma segura
 */
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Error saving to localStorage:', error);
  }
}

/**
 * Obtiene datos de localStorage de forma segura
 */
function getFromStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.warn('Error reading from localStorage:', error);
    return null;
  }
}

/**
 * Configuración para crear un hook de lista de entidades optimizada
 */
export interface OptimizedEntityListConfig<TData> {
  /** Nombre de la tabla en Supabase */
  tableName: string;
  /** Clave de query para React Query */
  queryKey: string;
  /** Columnas a seleccionar */
  selectColumns?: string;
  /** Función para transformar datos de la BD */
  transformData?: (data: unknown) => TData;
  /** Filtro por defecto (ej: { activo: true }) */
  defaultFilters?: Record<string, unknown>;
  /** Ordenamiento por defecto */
  orderBy?: { column: string; ascending?: boolean };
  /** Habilitar realtime */
  enableRealtime?: boolean;
  /** Si la tabla tiene soft delete (deleted_at column) */
  hasSoftDelete?: boolean;
}

/**
 * Resultado del hook de lista de entidades
 */
export interface OptimizedEntityListResult<TData> {
  data: TData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
  create: (newItem: Partial<TData>) => Promise<TData | null>;
  update: (id: string, updates: Partial<TData>) => Promise<TData | null>;
  remove: (id: string) => Promise<void>;
  toggleStatus: (id: string, currentStatus: boolean) => Promise<TData | null>;
}

/**
 * Hook factory para crear hooks de listas de entidades optimizadas
 */
export function createOptimizedEntityListHook<TData extends Record<string, unknown>>(
  config: OptimizedEntityListConfig<TData>
) {
  const {
    tableName,
    queryKey,
    selectColumns = '*',
    transformData = (data) => data as TData,
    defaultFilters = {},
    orderBy = { column: 'created_at', ascending: false },
    enableRealtime = true,
    hasSoftDelete = true,
  } = config;

  return function useOptimizedEntityList(
    additionalFilters?: Record<string, unknown>
  ): OptimizedEntityListResult<TData> {
    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const lastUpdateRef = useRef<number>(0);
    const [localData, setLocalData] = useState<TData[]>([]);

    // Combinar filtros
    const filters = { ...defaultFilters, ...additionalFilters };
    
    // Clave completa de query
    const fullQueryKey: QueryKey = [queryKey, filters];

    // Verificar si el caché local es válido
    const isCacheValid = useCallback(() => {
      const timestamp = getFromStorage<number>(getTimestampKey(queryKey));
      if (!timestamp) return false;
      return Date.now() - timestamp < CACHE_MAX_AGE_MS;
    }, []);

    // Restaurar desde localStorage
    const restoreFromCache = useCallback(() => {
      if (isCacheValid()) {
        const cached = getFromStorage<TData[]>(getStorageKey(queryKey));
        if (cached && cached.length > 0) {
          setLocalData(cached);
          return cached;
        }
      }
      return null;
    }, [isCacheValid]);

    // Persistir en localStorage
    const persistToStorage = useCallback((data: TData[]) => {
      saveToStorage(getStorageKey(queryKey), data);
      saveToStorage(getTimestampKey(queryKey), Date.now());
    }, []);

    // Función para obtener datos de la BD
    const fetchData = useCallback(async (): Promise<TData[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from(tableName)
        .select(selectColumns);

      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // Filtrar soft-deleted solo si la tabla lo soporta
      if (hasSoftDelete && !('deleted_at' in filters)) {
        query = query.is('deleted_at', null);
      }

      // Ordenamiento
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });

      const { data, error } = await query;

      if (error) {
        console.error(`[useOptimized${queryKey}List] Error fetching:`, error);
        throw error;
      }

      const transformedData = (data || []).map(transformData);
      
      // Persistir en localStorage
      persistToStorage(transformedData);
      
      return transformedData;
    }, [filters, persistToStorage]);

    // Query con soporte de caché
    const {
      data: queryData,
      isLoading: queryIsLoading,
      isError,
      error,
      refetch: queryRefetch,
    } = useQuery({
      queryKey: fullQueryKey,
      queryFn: fetchData,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      initialData: () => {
        const cached = restoreFromCache();
        return cached || undefined;
      },
      placeholderData: (previousData) => previousData,
    });

    // Sincronizar localData con queryData
    useEffect(() => {
      if (queryData) {
        setLocalData(queryData);
      }
    }, [queryData]);

    // Crear item
    const createMutation = useMutation({
      mutationFn: async (newItem: Partial<TData>): Promise<TData | null> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from(tableName)
          .insert(newItem)
          .select(selectColumns)
          .single();

        if (error) throw error;
        return data ? transformData(data) : null;
      },
      onSuccess: (newData) => {
        if (newData) {
          queryClient.setQueryData<TData[]>(fullQueryKey, (old = []) => {
            const updated = [newData, ...old];
            persistToStorage(updated);
            return updated;
          });
        }
        lastUpdateRef.current = Date.now();
      },
    });

    // Actualizar item
    const updateMutation = useMutation({
      mutationFn: async ({ id, updates }: { id: string; updates: Partial<TData> }): Promise<TData | null> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from(tableName)
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select(selectColumns)
          .single();

        if (error) throw error;
        return data ? transformData(data) : null;
      },
      onMutate: async ({ id, updates }) => {
        await queryClient.cancelQueries({ queryKey: fullQueryKey });
        const previousData = queryClient.getQueryData<TData[]>(fullQueryKey);
        
        queryClient.setQueryData<TData[]>(fullQueryKey, (old = []) =>
          old.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );

        return { previousData };
      },
      onError: (_err, _variables, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(fullQueryKey, context.previousData);
        }
      },
      onSuccess: (updatedData) => {
        if (updatedData) {
          queryClient.setQueryData<TData[]>(fullQueryKey, (old = []) => {
            const updated = old.map((item) =>
              item.id === updatedData.id ? updatedData : item
            );
            persistToStorage(updated);
            return updated;
          });
        }
        lastUpdateRef.current = Date.now();
      },
    });

    // Eliminar item (soft delete)
    const removeMutation = useMutation({
      mutationFn: async (id: string): Promise<void> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, unknown> = { 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Para tablas con 'activo', desactivar también
        if (tableName !== 'profiles') {
          updateData.activo = false;
        } else {
          // Para profiles, usar 'estado' = 'inactivo'
          updateData.estado = 'inactivo';
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from(tableName)
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
      },
      onMutate: async (id) => {
        await queryClient.cancelQueries({ queryKey: fullQueryKey });
        const previousData = queryClient.getQueryData<TData[]>(fullQueryKey);
        
        queryClient.setQueryData<TData[]>(fullQueryKey, (old = []) =>
          old.filter((item) => item.id !== id)
        );

        return { previousData };
      },
      onError: (_err, _id, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(fullQueryKey, context.previousData);
        }
      },
      onSuccess: () => {
        const currentData = queryClient.getQueryData<TData[]>(fullQueryKey);
        if (currentData) {
          persistToStorage(currentData);
        }
        lastUpdateRef.current = Date.now();
      },
    });

    // Toggle status
    const toggleStatusMutation = useMutation({
      mutationFn: async ({ id, newStatus }: { id: string; newStatus: boolean }): Promise<TData | null> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from(tableName)
          .update({ activo: newStatus, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select(selectColumns)
          .single();

        if (error) throw error;
        return data ? transformData(data) : null;
      },
      onMutate: async ({ id, newStatus }) => {
        await queryClient.cancelQueries({ queryKey: fullQueryKey });
        const previousData = queryClient.getQueryData<TData[]>(fullQueryKey);
        
        queryClient.setQueryData<TData[]>(fullQueryKey, (old = []) =>
          old.map((item) => (item.id === id ? { ...item, activo: newStatus } : item))
        );

        return { previousData };
      },
      onError: (_err, _variables, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(fullQueryKey, context.previousData);
        }
      },
      onSuccess: (updatedData) => {
        if (updatedData) {
          queryClient.setQueryData<TData[]>(fullQueryKey, (old = []) => {
            const updated = old.map((item) =>
              item.id === updatedData.id ? updatedData : item
            );
            persistToStorage(updated);
            return updated;
          });
        }
        lastUpdateRef.current = Date.now();
      },
    });

    // Suscripción a cambios en tiempo real
    useEffect(() => {
      if (!enableRealtime) return;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`${tableName}-list`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
          },
          (payload) => {
            // Solo ignorar si el update fue muy reciente (para evitar duplicados locales)
            const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
            if (timeSinceLastUpdate < 500) return;

            if (payload.eventType === 'INSERT') {
              const newData = transformData(payload.new);
              queryClient.setQueryData<TData[]>(fullQueryKey, (old = []) => {
                const exists = old.some((item) => item.id === newData.id);
                if (exists) return old;
                const updated = [newData, ...old];
                persistToStorage(updated);
                return updated;
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedData = transformData(payload.new);
              const wasSoftDeleted = hasSoftDelete && payload.new.deleted_at !== null;
              
              queryClient.setQueryData<TData[]>(fullQueryKey, (old = []) => {
                let updated: TData[];
                if (wasSoftDeleted) {
                  updated = old.filter((item) => item.id !== updatedData.id);
                } else {
                  updated = old.map((item) =>
                    item.id === updatedData.id ? updatedData : item
                  );
                }
                persistToStorage(updated);
                return updated;
              });
            } else if (payload.eventType === 'DELETE') {
              queryClient.setQueryData<TData[]>(fullQueryKey, (old = []) => {
                const updated = old.filter((item) => item.id !== payload.old.id);
                persistToStorage(updated);
                return updated;
              });
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
    }, [enableRealtime, queryClient, fullQueryKey, persistToStorage]);

    // Funciones expuestas
    const refetch = useCallback(async () => {
      await queryRefetch();
    }, [queryRefetch]);

    const invalidate = useCallback(async () => {
      await queryClient.invalidateQueries({ queryKey: fullQueryKey });
    }, [queryClient, fullQueryKey]);

    const create = useCallback(
      async (newItem: Partial<TData>) => createMutation.mutateAsync(newItem),
      [createMutation]
    );

    const update = useCallback(
      async (id: string, updates: Partial<TData>) =>
        updateMutation.mutateAsync({ id, updates }),
      [updateMutation]
    );

    const remove = useCallback(
      async (id: string) => removeMutation.mutateAsync(id),
      [removeMutation]
    );

    const toggleStatus = useCallback(
      async (id: string, currentStatus: boolean) =>
        toggleStatusMutation.mutateAsync({ id, newStatus: !currentStatus }),
      [toggleStatusMutation]
    );

    const data = queryData || localData;
    const isLoading = queryIsLoading && data.length === 0;

    return {
      data,
      isLoading,
      isError,
      error: error as Error | null,
      refetch,
      invalidate,
      create,
      update,
      remove,
      toggleStatus,
    };
  };
}
