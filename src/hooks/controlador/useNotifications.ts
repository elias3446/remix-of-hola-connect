import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserDataReady } from '@/hooks/entidades';
import { useDebounce, useThrottle } from '@/hooks/optimizacion';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];
type Settings = Database['public']['Tables']['settings']['Row'];

export type NotificationFilter = 'all' | 'unread' | 'read';

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
}

export interface UseNotificationsOptions {
  pageSize?: number;
  initialFilter?: NotificationFilter;
}

export interface UseNotificationsReturn {
  // Data
  notifications: Notification[];
  stats: NotificationStats;
  
  // Notifications enabled state
  notificationsEnabled: boolean;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  
  // Filter
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  
  // Selection
  selectedIds: Set<string>;
  selectedCount: number;
  isAllSelected: boolean;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  
  // Actions
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markSelectedAsRead: () => Promise<void>;
  deleteNotifications: (ids: string[]) => Promise<void>;
  deleteSelected: () => Promise<void>;
  
  // State
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  
  // Pagination handlers
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { pageSize: initialPageSize = 10, initialFilter = 'all' } = options;
  
  // Obtener el profile.id y settings desde el caché
  const { profile, settings } = useUserDataReady();
  const profileId = profile?.id ?? null;
  
  // Configuración de notificaciones
  const autoDeleteRead = settings?.auto_delete_read ?? false;
  const retentionDays = settings?.retention_days ?? 90;
  
  const queryClient = useQueryClient();
  
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filter, setFilter] = useState<NotificationFilter>(initialFilter);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  
  // Reset page when filter changes, but keep selections if "select all" is active
  useEffect(() => {
    setCurrentPage(1);
    // Only clear selections if not in "select all" mode
    if (!isAllSelected) {
      setSelectedIds(new Set());
    }
  }, [filter, isAllSelected]);
  
  // Check if notifications are enabled
  const notificationsEnabled = settings?.enabled !== false;

  // Real-time subscription for notifications (only if enabled)
  useEffect(() => {
    if (!profileId || !notificationsEnabled) return;
    
    const channelId = `notifications-list-${profileId}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          // Invalidar todas las queries para sincronización
          queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['notifications-stats'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['notification-count'], refetchType: 'all' });
          
          // Show toast for new notifications only
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, queryClient, notificationsEnabled]);
  
  // Debounced filter for query
  const debouncedFilter = useDebounce(filter, 200);
  
  // Stats query
  const statsQuery = useQuery({
    queryKey: ['notifications-stats', profileId],
    queryFn: async (): Promise<NotificationStats> => {
      if (!profileId) return { total: 0, unread: 0, read: 0 };
      
      const [totalResult, unreadResult, readResult] = await Promise.all([
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profileId),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profileId).eq('read', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profileId).eq('read', true),
      ]);
      
      return {
        total: totalResult.count ?? 0,
        unread: unreadResult.count ?? 0,
        read: readResult.count ?? 0,
      };
    },
    enabled: !!profileId,
    staleTime: 0, // Always consider data stale for real-time updates
  });
  
  // Notifications query with pagination, filter and retention
  const notificationsQuery = useQuery({
    queryKey: ['notifications', profileId, debouncedFilter, currentPage, pageSize, retentionDays],
    queryFn: async (): Promise<{ data: Notification[]; count: number }> => {
      if (!profileId) return { data: [], count: 0 };
      
      // Calcular fecha de retención
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - retentionDays);
      
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', profileId)
        .gte('created_at', retentionDate.toISOString()) // Solo notificaciones dentro del período de retención
        .order('created_at', { ascending: false });
      
      // Apply filter
      if (debouncedFilter === 'unread') {
        query = query.eq('read', false);
      } else if (debouncedFilter === 'read') {
        query = query.eq('read', true);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!profileId,
    staleTime: 0, // Always consider data stale for real-time updates
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
  
  // Computed values
  const notifications = notificationsQuery.data?.data ?? [];
  const totalItems = notificationsQuery.data?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const stats = statsQuery.data ?? { total: 0, unread: 0, read: 0 };
  
  // Computed selection state - now considers isAllSelected for global selection
  const selectedCount = isAllSelected ? totalItems : selectedIds.size;
  const isPageFullySelected = notifications.length > 0 && notifications.every((n) => selectedIds.has(n.id));
  
  const toggleSelection = useCallback((id: string) => {
    // If "select all" is active and user deselects one, switch to manual mode
    if (isAllSelected) {
      setIsAllSelected(false);
      // Get all IDs except the one being deselected
      // We need to fetch all IDs first, but for now we'll just start with current page
      const newSet = new Set(notifications.map((n) => n.id).filter((nId) => nId !== id));
      setSelectedIds(newSet);
    } else {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    }
  }, [isAllSelected, notifications]);
  
  const toggleSelectAll = useCallback(async () => {
    if (isAllSelected) {
      // Deselect all
      setIsAllSelected(false);
      setSelectedIds(new Set());
    } else {
      // Select ALL notifications (not just current page)
      setIsAllSelected(true);
      // We'll fetch all IDs when needed for operations
    }
  }, [isAllSelected]);
  
  const clearSelection = useCallback(() => {
    setIsAllSelected(false);
    setSelectedIds(new Set());
  }, []);
  
  // Mark as read mutation (with auto-delete if enabled)
  const markAsReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (autoDeleteRead) {
        // Si auto_delete_read está habilitado, eliminar en lugar de marcar como leído
        const { error } = await supabase
          .from('notifications')
          .delete()
          .in('id', ids);
        
        if (error) throw error;
      } else {
        // Comportamiento normal: marcar como leído
        const { error } = await supabase
          .from('notifications')
          .update({ read: true, updated_at: new Date().toISOString() })
          .in('id', ids);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notifications-stats'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notification-count'], refetchType: 'all' });
      toast({ 
        title: autoDeleteRead 
          ? 'Notificaciones eliminadas automáticamente' 
          : 'Notificaciones marcadas como leídas' 
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'No se pudieron procesar las notificaciones', variant: 'destructive' });
      console.error('Mark as read error:', error);
    },
  });
  
  // Mark all as read mutation (with auto-delete if enabled)
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error('No user');
      
      if (autoDeleteRead) {
        // Si auto_delete_read está habilitado, eliminar todas las no leídas
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', profileId)
          .eq('read', false);
        
        if (error) throw error;
      } else {
        // Comportamiento normal: marcar como leído
        const { error } = await supabase
          .from('notifications')
          .update({ read: true, updated_at: new Date().toISOString() })
          .eq('user_id', profileId)
          .eq('read', false);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notifications-stats'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notification-count'], refetchType: 'all' });
      toast({ 
        title: autoDeleteRead 
          ? 'Todas las notificaciones eliminadas automáticamente' 
          : 'Todas las notificaciones marcadas como leídas' 
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'No se pudieron procesar las notificaciones', variant: 'destructive' });
      console.error('Mark all as read error:', error);
    },
  });
  
  // Delete notifications mutation with optimistic update
  const deleteNotificationsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      return ids;
    },
    onMutate: async (ids) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications-stats'] });
      
      // Snapshot the previous values
      const previousNotifications = queryClient.getQueryData(['notifications', profileId, debouncedFilter, currentPage, pageSize, retentionDays]);
      const previousStats = queryClient.getQueryData(['notifications-stats', profileId]);
      
      // Optimistically update notifications list
      queryClient.setQueryData(
        ['notifications', profileId, debouncedFilter, currentPage, pageSize, retentionDays],
        (old: { data: Notification[]; count: number } | undefined) => {
          if (!old) return old;
          const idsSet = new Set(ids);
          return {
            data: old.data.filter((n) => !idsSet.has(n.id)),
            count: Math.max(0, old.count - ids.length),
          };
        }
      );
      
      // Optimistically update stats
      queryClient.setQueryData(
        ['notifications-stats', profileId],
        (old: NotificationStats | undefined) => {
          if (!old) return old;
          return {
            total: Math.max(0, old.total - ids.length),
            unread: Math.max(0, old.unread - ids.length), // Approximate
            read: old.read,
          };
        }
      );
      
      // Clear selection immediately
      clearSelection();
      
      return { previousNotifications, previousStats };
    },
    onSuccess: (ids) => {
      toast({ title: `${ids.length} notificación(es) eliminada(s)` });
      // Invalidar TODAS las queries de notificaciones
      queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notifications-stats'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notification-count'], refetchType: 'all' });
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['notifications', profileId, debouncedFilter, currentPage, pageSize, retentionDays],
          context.previousNotifications
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['notifications-stats', profileId], context.previousStats);
      }
      toast({ title: 'Error', description: 'No se pudieron eliminar las notificaciones', variant: 'destructive' });
      console.error('Delete notifications error:', error);
    },
  });
  
  // Throttled pagination handlers - DON'T reset selections on page change
  const onPageChange = useThrottle(
    useCallback((page: number) => {
      setCurrentPage(page);
      // Don't reset selections - keep them across pages
    }, []),
    150
  );
  
  const onPageSizeChange = useThrottle(
    useCallback((size: number) => {
      setPageSize(size);
      setCurrentPage(1);
      // Don't reset selections - keep them across pages
    }, []),
    150
  );
  
  // Action wrappers
  const markAsRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      await markAsReadMutation.mutateAsync(ids);
    },
    [markAsReadMutation]
  );
  
  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);
  
  // Mark selected as read (handles both isAllSelected and manual selection)
  const markSelectedAsRead = useCallback(async () => {
    if (!profileId) return;
    
    if (isAllSelected) {
      // Mark all notifications based on current filter as read
      let query = supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', profileId);
      
      if (filter === 'unread') {
        query = query.eq('read', false);
      } else if (filter === 'read') {
        // Already read, nothing to do
        toast({ title: 'Las notificaciones ya están marcadas como leídas' });
        return;
      }
      // For 'all' filter, mark all unread as read
      if (filter === 'all') {
        query = query.eq('read', false);
      }
      
      const { error } = await query;
      if (error) {
        toast({ title: 'Error', description: 'No se pudieron marcar como leídas', variant: 'destructive' });
        return;
      }
      
      queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notifications-stats'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notification-count'], refetchType: 'all' });
      clearSelection();
      toast({ title: 'Notificaciones marcadas como leídas' });
    } else if (selectedIds.size > 0) {
      await markAsReadMutation.mutateAsync(Array.from(selectedIds));
      clearSelection();
    }
  }, [isAllSelected, selectedIds, markAsReadMutation, profileId, filter, queryClient, clearSelection]);
  
  const deleteNotifications = useCallback(
    async (ids: string[]) => {
      await deleteNotificationsMutation.mutateAsync(ids);
    },
    [deleteNotificationsMutation]
  );
  
  const deleteSelected = useCallback(async () => {
    if (!profileId) return;
    
    if (isAllSelected) {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications-stats'] });
      
      // Optimistically clear UI immediately
      queryClient.setQueryData(
        ['notifications', profileId, debouncedFilter, currentPage, pageSize, retentionDays],
        { data: [], count: 0 }
      );
      queryClient.setQueryData(
        ['notifications-stats', profileId],
        { total: 0, unread: 0, read: 0 }
      );
      clearSelection();
      
      // Delete all notifications based on current filter
      let query = supabase.from('notifications').delete().eq('user_id', profileId);
      
      if (filter === 'unread') {
        query = query.eq('read', false);
      } else if (filter === 'read') {
        query = query.eq('read', true);
      }
      
      const { error } = await query;
      if (error) {
        toast({ title: 'Error', description: 'No se pudieron eliminar las notificaciones', variant: 'destructive' });
        // Refetch to restore state
        queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['notifications-stats'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['notification-count'], refetchType: 'all' });
        return;
      }
      
      toast({ title: 'Todas las notificaciones eliminadas' });
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notifications-stats'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notification-count'], refetchType: 'all' });
    } else if (selectedIds.size > 0) {
      await deleteNotificationsMutation.mutateAsync(Array.from(selectedIds));
    }
  }, [isAllSelected, selectedIds, deleteNotificationsMutation, profileId, filter, queryClient, clearSelection, debouncedFilter, currentPage, pageSize, retentionDays]);
  
  return {
    // Data
    notifications: notificationsEnabled ? notifications : [],
    stats: notificationsEnabled ? stats : { total: 0, unread: 0, read: 0 },
    
    // Notifications enabled state
    notificationsEnabled,
    
    // Pagination
    currentPage,
    totalPages,
    pageSize,
    totalItems: notificationsEnabled ? totalItems : 0,
    
    // Filter
    filter,
    setFilter,
    
    // Selection
    selectedIds,
    selectedCount,
    isAllSelected,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    
    // Actions
    markAsRead,
    markAllAsRead,
    markSelectedAsRead,
    deleteNotifications,
    deleteSelected,
    
    // State - Solo mostrar loading en la carga inicial, no en cambio de página
    isLoading: (notificationsQuery.isLoading && !notificationsQuery.isPlaceholderData) || statsQuery.isLoading,
    isFetching: notificationsQuery.isFetching,
    isError: notificationsQuery.isError || statsQuery.isError,
    error: (notificationsQuery.error || statsQuery.error) as Error | null,
    
    // Pagination handlers
    onPageChange,
    onPageSizeChange,
  };
}
