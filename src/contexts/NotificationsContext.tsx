import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserDataReady } from '@/hooks/entidades';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
}

export type NotificationFilter = 'all' | 'unread' | 'read';

interface NotificationsState {
  notifications: Notification[];
  stats: NotificationStats;
  isLoading: boolean;
  filter: NotificationFilter;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  selectedIds: Set<string>;
  isAllSelected: boolean;
}

interface NotificationsContextValue extends NotificationsState {
  // Actions
  setFilter: (filter: NotificationFilter) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markSelectedAsRead: () => Promise<void>;
  deleteNotifications: (ids: string[]) => Promise<void>;
  deleteSelected: () => Promise<void>;
  refetch: () => Promise<void>;
  // Computed
  selectedCount: number;
  notificationsEnabled: boolean;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { profile, settings } = useUserDataReady();
  const profileId = profile?.id ?? null;
  const queryClient = useQueryClient();

  const notificationsEnabled = settings?.enabled !== false;
  const autoDeleteRead = settings?.auto_delete_read ?? false;
  const retentionDays = settings?.retention_days ?? 90;

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, read: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const selectedCount = isAllSelected ? totalItems : selectedIds.size;

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!profileId) {
      setNotifications([]);
      setStats({ total: 0, unread: 0, read: 0 });
      setTotalItems(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Calculate retention date
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - retentionDays);

      // Fetch stats
      const [totalResult, unreadResult, readResult] = await Promise.all([
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profileId),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profileId).eq('read', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profileId).eq('read', true),
      ]);

      const newStats = {
        total: totalResult.count ?? 0,
        unread: unreadResult.count ?? 0,
        read: readResult.count ?? 0,
      };
      setStats(newStats);

      // Fetch notifications with pagination and filter
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', profileId)
        .gte('created_at', retentionDate.toISOString())
        .order('created_at', { ascending: false });

      if (filter === 'unread') {
        query = query.eq('read', false);
      } else if (filter === 'read') {
        query = query.eq('read', true);
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setNotifications(data ?? []);
      setTotalItems(count ?? 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profileId, filter, currentPage, pageSize, retentionDays]);

  // Initial fetch and refetch on filter/page changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Single realtime channel for ALL notification updates
  useEffect(() => {
    if (!profileId || !notificationsEnabled) return;

    const channelId = `notifications-global-${profileId}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('[Notifications] Realtime event:', payload.eventType);
          
          // Refetch data immediately on any change
          fetchNotifications();

          // Show toast for new notifications
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          }

          // Invalidate React Query caches for any other components that might be listening
          queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['notifications-stats'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['notification-count'], refetchType: 'all' });
        }
      )
      .subscribe((status) => {
        console.log('[Notifications] Realtime subscription status:', status);
      });

    return () => {
      console.log('[Notifications] Cleaning up realtime channel');
      supabase.removeChannel(channel);
    };
  }, [profileId, notificationsEnabled, fetchNotifications, queryClient]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
    if (!isAllSelected) {
      setSelectedIds(new Set());
    }
  }, [filter]);

  // Selection handlers
  const toggleSelection = useCallback((id: string) => {
    if (isAllSelected) {
      setIsAllSelected(false);
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

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setIsAllSelected(false);
      setSelectedIds(new Set());
    } else {
      setIsAllSelected(true);
    }
  }, [isAllSelected]);

  const clearSelection = useCallback(() => {
    setIsAllSelected(false);
    setSelectedIds(new Set());
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      if (autoDeleteRead) {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .in('id', ids);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true, updated_at: new Date().toISOString() })
          .in('id', ids);
        if (error) throw error;
      }

      toast({
        title: autoDeleteRead
          ? 'Notificaciones eliminadas automáticamente'
          : 'Notificaciones marcadas como leídas',
      });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron procesar las notificaciones', variant: 'destructive' });
      console.error('Mark as read error:', error);
    }
  }, [autoDeleteRead]);

  const markAllAsRead = useCallback(async () => {
    if (!profileId) return;

    try {
      if (autoDeleteRead) {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', profileId)
          .eq('read', false);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true, updated_at: new Date().toISOString() })
          .eq('user_id', profileId)
          .eq('read', false);
        if (error) throw error;
      }

      toast({
        title: autoDeleteRead
          ? 'Todas las notificaciones eliminadas'
          : 'Todas las notificaciones marcadas como leídas',
      });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron procesar las notificaciones', variant: 'destructive' });
      console.error('Mark all as read error:', error);
    }
  }, [profileId, autoDeleteRead]);

  const markSelectedAsRead = useCallback(async () => {
    if (!profileId) return;

    if (isAllSelected) {
      let query = supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', profileId);

      if (filter === 'unread') {
        query = query.eq('read', false);
      } else if (filter === 'all') {
        query = query.eq('read', false);
      } else {
        toast({ title: 'Las notificaciones ya están marcadas como leídas' });
        return;
      }

      const { error } = await query;
      if (error) {
        toast({ title: 'Error', description: 'No se pudieron marcar como leídas', variant: 'destructive' });
        return;
      }

      clearSelection();
      toast({ title: 'Notificaciones marcadas como leídas' });
    } else if (selectedIds.size > 0) {
      await markAsRead(Array.from(selectedIds));
      clearSelection();
    }
  }, [isAllSelected, selectedIds, markAsRead, profileId, filter, clearSelection]);

  // Delete notifications
  const deleteNotifications = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    // Optimistic update
    const previousNotifications = notifications;
    const previousStats = stats;
    const previousTotalItems = totalItems;
    const idsSet = new Set(ids);

    setNotifications((prev) => prev.filter((n) => !idsSet.has(n.id)));
    setStats((prev) => ({
      total: Math.max(0, prev.total - ids.length),
      unread: Math.max(0, prev.unread - notifications.filter((n) => idsSet.has(n.id) && !n.read).length),
      read: Math.max(0, prev.read - notifications.filter((n) => idsSet.has(n.id) && n.read).length),
    }));
    setTotalItems((prev) => Math.max(0, prev - ids.length));
    clearSelection();

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({ title: `${ids.length} notificación(es) eliminada(s)` });
    } catch (error) {
      // Rollback on error
      setNotifications(previousNotifications);
      setStats(previousStats);
      setTotalItems(previousTotalItems);
      toast({ title: 'Error', description: 'No se pudieron eliminar las notificaciones', variant: 'destructive' });
      console.error('Delete notifications error:', error);
    }
  }, [notifications, stats, totalItems, clearSelection]);

  const deleteSelected = useCallback(async () => {
    if (!profileId) return;

    if (isAllSelected) {
      // Optimistic update
      setNotifications([]);
      setStats({ total: 0, unread: 0, read: 0 });
      setTotalItems(0);
      clearSelection();

      try {
        let query = supabase
          .from('notifications')
          .delete()
          .eq('user_id', profileId);

        if (filter === 'unread') {
          query = query.eq('read', false);
        } else if (filter === 'read') {
          query = query.eq('read', true);
        }

        const { error } = await query;
        if (error) throw error;

        toast({ title: 'Notificaciones eliminadas' });
      } catch (error) {
        // Refetch on error
        fetchNotifications();
        toast({ title: 'Error', description: 'No se pudieron eliminar las notificaciones', variant: 'destructive' });
        console.error('Delete selected error:', error);
      }
    } else if (selectedIds.size > 0) {
      await deleteNotifications(Array.from(selectedIds));
    }
  }, [isAllSelected, selectedIds, deleteNotifications, profileId, filter, clearSelection, fetchNotifications]);

  const value = useMemo<NotificationsContextValue>(() => ({
    // State
    notifications,
    stats,
    isLoading,
    filter,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    selectedIds,
    isAllSelected,
    selectedCount,
    notificationsEnabled,
    // Actions
    setFilter,
    setCurrentPage,
    setPageSize,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    markAsRead,
    markAllAsRead,
    markSelectedAsRead,
    deleteNotifications,
    deleteSelected,
    refetch: fetchNotifications,
  }), [
    notifications,
    stats,
    isLoading,
    filter,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    selectedIds,
    isAllSelected,
    selectedCount,
    notificationsEnabled,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    markAsRead,
    markAllAsRead,
    markSelectedAsRead,
    deleteNotifications,
    deleteSelected,
    fetchNotifications,
  ]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotificationsContext debe usarse dentro de NotificationsProvider');
  }
  return context;
}

// Hook simple para obtener solo el contador de notificaciones no leídas
export function useUnreadCount(): number {
  const context = useContext(NotificationsContext);
  return context?.stats.unread ?? 0;
}
