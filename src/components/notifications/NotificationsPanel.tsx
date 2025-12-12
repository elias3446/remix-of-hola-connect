import { memo } from 'react';
import { NotificationHeader } from './NotificationHeader';
import { NotificationStats } from './NotificationStats';
import { NotificationTabs } from './NotificationTabs';
import { NotificationSelectAll } from './NotificationSelectAll';
import { NotificationList } from './NotificationList';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useNotifications } from '@/hooks/controlador/useNotifications';
import { cn } from '@/lib/utils';
import { useOptimizedComponent } from '@/hooks/optimizacion';

interface NotificationsPanelProps {
  className?: string;
}

function NotificationsPanelComponent({ className }: NotificationsPanelProps) {
  const {
    notifications,
    stats,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    filter,
    setFilter,
    selectedIds,
    selectedCount,
    isAllSelected,
    toggleSelection,
    toggleSelectAll,
    markAsRead,
    markAllAsRead,
    markSelectedAsRead,
    deleteNotifications,
    deleteSelected,
    isLoading,
    isFetching,
    onPageChange,
    onPageSizeChange,
  } = useNotifications({ pageSize: 10 });
  
  useOptimizedComponent({ filter, selectedCount }, { componentName: 'NotificationsPanel' });
  
  const handleMarkAsRead = async () => {
    if (selectedCount > 0) {
      await markSelectedAsRead();
    } else {
      await markAllAsRead();
    }
  };
  
  const handleDelete = async (id: string) => {
    await deleteNotifications([id]);
  };
  
  const handleMarkSingleAsRead = async (id: string) => {
    await markAsRead([id]);
  };
  
  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {/* Header */}
      <NotificationHeader
        selectedCount={selectedCount}
        unreadCount={stats.unread}
        onMarkAllAsRead={handleMarkAsRead}
        onDeleteSelected={deleteSelected}
        isLoading={isLoading}
      />
      
      {/* Stats */}
      <NotificationStats
        total={stats.total}
        unread={stats.unread}
        read={stats.read}
      />
      
      {/* Tabs */}
      <NotificationTabs
        value={filter}
        onChange={setFilter}
      />
      
      {/* Select All - solo mostrar cuando hay notificaciones */}
      {totalItems > 0 && (
        <NotificationSelectAll
          isAllSelected={isAllSelected}
          selectedCount={selectedCount}
          totalCount={totalItems}
          onToggleSelectAll={toggleSelectAll}
        />
      )}
      
      {/* Notification List */}
      <NotificationList
        notifications={notifications}
        selectedIds={selectedIds}
        isAllSelected={isAllSelected}
        onToggleSelection={toggleSelection}
        onDelete={handleDelete}
        onMarkAsRead={handleMarkSingleAsRead}
        isLoading={isFetching}
      />
      
      {/* Pagination */}
      {totalItems > 0 && (
        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

export const NotificationsPanel = memo(NotificationsPanelComponent);
