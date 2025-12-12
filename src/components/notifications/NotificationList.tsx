import { memo } from 'react';
import { Bell } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import { cn } from '@/lib/utils';
import { animationClasses } from '@/hooks/optimizacion';
import { Skeleton } from '@/components/ui/skeleton';
import type { Database } from '@/integrations/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

interface NotificationListProps {
  notifications: Notification[];
  selectedIds: Set<string>;
  isAllSelected?: boolean;
  onToggleSelection: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

function NotificationListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card rounded-lg border border-border p-4 sm:p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-full ml-7" />
          <div className="flex items-center justify-between ml-7">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className={cn(
        'bg-card rounded-lg border border-border p-8 sm:p-12',
        'flex flex-col items-center justify-center text-center gap-4',
        animationClasses.fadeIn
      )}
    >
      <div className="p-4 rounded-full bg-muted">
        <Bell className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">
          No hay notificaciones
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Cuando recibas notificaciones, aparecerán aquí. Mantente atento a las actualizaciones.
        </p>
      </div>
    </div>
  );
}

function NotificationListComponent({
  notifications,
  selectedIds,
  isAllSelected = false,
  onToggleSelection,
  onDelete,
  onMarkAsRead,
  isLoading,
  className,
}: NotificationListProps) {
  // Solo mostrar skeleton en la carga inicial (cuando no hay notificaciones previas)
  if (isLoading && notifications.length === 0) {
    return <NotificationListSkeleton />;
  }
  
  if (!isLoading && notifications.length === 0) {
    return <EmptyState />;
  }
  
  return (
    <div className={cn('space-y-3 transition-opacity duration-200', isLoading && 'opacity-60', className)}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          isSelected={isAllSelected || selectedIds.has(notification.id)}
          onToggleSelection={onToggleSelection}
          onDelete={onDelete}
          onMarkAsRead={onMarkAsRead}
        />
      ))}
    </div>
  );
}

export const NotificationList = memo(NotificationListComponent);
