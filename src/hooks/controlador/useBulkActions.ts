import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type BulkActionType = 
  | 'delete'
  | 'toggle_status'
  | 'change_status'
  | 'assign'
  | 'change_category'
  | 'change_type';

export interface BulkActionConfig {
  /** Nombre de la tabla en Supabase */
  tableName: string;
  /** Clave de query para invalidar en React Query */
  queryKey: string;
  /** Si usa soft delete */
  hasSoftDelete?: boolean;
  /** Columna de estado (ej: 'activo', 'status') */
  statusColumn?: string;
  /** Columna de usuario asignado */
  assignColumn?: string;
  /** Columna de categoría */
  categoryColumn?: string;
  /** Columna de tipo */
  typeColumn?: string;
  /** Queries adicionales a invalidar */
  relatedQueryKeys?: string[];
}

export interface BulkActionsResult<T> {
  // Estado de selección
  selectedIds: string[];
  selectedItems: T[];
  selectedCount: number;
  isAllSelected: boolean;
  hasSelection: boolean;
  
  // Acciones de selección
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  selectAll: (items: T[]) => void;
  deselectAll: () => void;
  toggleAll: (items: T[]) => void;
  isSelected: (id: string) => boolean;
  setSelectedItems: (items: T[]) => void;
  
  // Acciones bulk
  bulkDelete: () => Promise<void>;
  bulkToggleStatus: (newStatus: boolean) => Promise<void>;
  bulkChangeStatus: (status: string) => Promise<void>;
  bulkAssign: (userId: string | null) => Promise<void>;
  bulkChangeCategory: (categoryId: string) => Promise<void>;
  bulkChangeType: (typeId: string) => Promise<void>;
  
  // Estado
  isProcessing: boolean;
}

/**
 * Hook controlador para acciones bulk en listas de entidades
 * Sigue el patrón de hooks de controlador del proyecto
 */
export function useBulkActions<T extends { id: string }>(
  items: T[],
  config: BulkActionConfig
): BulkActionsResult<T> {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    tableName,
    queryKey,
    hasSoftDelete = true,
    statusColumn = 'activo',
    assignColumn = 'assigned_to',
    categoryColumn = 'categoria_id',
    typeColumn = 'tipo_reporte_id',
    relatedQueryKeys = [],
  } = config;

  // Memoizar items seleccionados
  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.includes(item.id));
  }, [items, selectedIds]);

  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;
  const isAllSelected = items.length > 0 && selectedCount === items.length;

  // Acciones de selección
  const select = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  const deselect = useCallback((id: string) => {
    setSelectedIds(prev => prev.filter(i => i !== id));
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  }, []);

  const selectAll = useCallback((allItems: T[]) => {
    setSelectedIds(allItems.map(item => item.id));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const toggleAll = useCallback((allItems: T[]) => {
    if (selectedIds.length === allItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allItems.map(item => item.id));
    }
  }, [selectedIds.length]);

  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  // Establecer items seleccionados directamente (para sincronización con tabla)
  const setSelectedItems = useCallback((newItems: T[]) => {
    setSelectedIds(newItems.map(item => item.id));
  }, []);

  // Invalidar queries relacionadas
  const invalidateQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [queryKey] }),
      ...relatedQueryKeys.map(key => 
        queryClient.invalidateQueries({ queryKey: [key] })
      ),
    ]);
  }, [queryClient, queryKey, relatedQueryKeys]);

  // Bulk Delete
  const bulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      if (hasSoftDelete) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from(tableName)
          .update({ 
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            [statusColumn]: false,
          })
          .in('id', selectedIds);

        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from(tableName)
          .delete()
          .in('id', selectedIds);

        if (error) throw error;
      }

      await invalidateQueries();
      setSelectedIds([]);
      
      toast({
        title: 'Eliminación exitosa',
        description: `${selectedIds.length} elemento(s) eliminado(s) correctamente.`,
      });
    } catch (error) {
      console.error('[useBulkActions] Error en bulkDelete:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron eliminar los elementos seleccionados.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, tableName, hasSoftDelete, statusColumn, invalidateQueries]);

  // Bulk Toggle Status
  const bulkToggleStatus = useCallback(async (newStatus: boolean) => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(tableName)
        .update({ 
          [statusColumn]: newStatus,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);

      if (error) throw error;

      await invalidateQueries();
      setSelectedIds([]);
      
      toast({
        title: 'Estado actualizado',
        description: `${selectedIds.length} elemento(s) ${newStatus ? 'activado(s)' : 'desactivado(s)'}.`,
      });
    } catch (error) {
      console.error('[useBulkActions] Error en bulkToggleStatus:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, tableName, statusColumn, invalidateQueries]);

  // Bulk Change Status (para enums como report_status)
  const bulkChangeStatus = useCallback(async (status: string) => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(tableName)
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);

      if (error) throw error;

      await invalidateQueries();
      setSelectedIds([]);
      
      toast({
        title: 'Estado actualizado',
        description: `${selectedIds.length} elemento(s) actualizado(s) a "${status}".`,
      });
    } catch (error) {
      console.error('[useBulkActions] Error en bulkChangeStatus:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, tableName, invalidateQueries]);

  // Bulk Assign
  const bulkAssign = useCallback(async (userId: string | null) => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(tableName)
        .update({ 
          [assignColumn]: userId,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);

      if (error) throw error;

      await invalidateQueries();
      setSelectedIds([]);
      
      toast({
        title: 'Asignación actualizada',
        description: userId 
          ? `${selectedIds.length} elemento(s) asignado(s).`
          : `${selectedIds.length} elemento(s) desasignado(s).`,
      });
    } catch (error) {
      console.error('[useBulkActions] Error en bulkAssign:', error);
      toast({
        title: 'Error',
        description: 'No se pudo realizar la asignación.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, tableName, assignColumn, invalidateQueries]);

  // Bulk Change Category
  const bulkChangeCategory = useCallback(async (categoryId: string) => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(tableName)
        .update({ 
          [categoryColumn]: categoryId,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);

      if (error) throw error;

      await invalidateQueries();
      setSelectedIds([]);
      
      toast({
        title: 'Categoría actualizada',
        description: `${selectedIds.length} elemento(s) actualizado(s).`,
      });
    } catch (error) {
      console.error('[useBulkActions] Error en bulkChangeCategory:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar la categoría.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, tableName, categoryColumn, invalidateQueries]);

  // Bulk Change Type
  const bulkChangeType = useCallback(async (typeId: string) => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(tableName)
        .update({ 
          [typeColumn]: typeId,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);

      if (error) throw error;

      await invalidateQueries();
      setSelectedIds([]);
      
      toast({
        title: 'Tipo actualizado',
        description: `${selectedIds.length} elemento(s) actualizado(s).`,
      });
    } catch (error) {
      console.error('[useBulkActions] Error en bulkChangeType:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el tipo.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, tableName, typeColumn, invalidateQueries]);

  return {
    // Estado de selección
    selectedIds,
    selectedItems,
    selectedCount,
    isAllSelected,
    hasSelection,
    
    // Acciones de selección
    select,
    deselect,
    toggle,
    selectAll,
    deselectAll,
    toggleAll,
    isSelected,
    setSelectedItems,
    
    // Acciones bulk
    bulkDelete,
    bulkToggleStatus,
    bulkChangeStatus,
    bulkAssign,
    bulkChangeCategory,
    bulkChangeType,
    
    // Estado
    isProcessing,
  };
}
