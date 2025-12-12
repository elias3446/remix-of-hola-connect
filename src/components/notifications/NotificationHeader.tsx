import { memo } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useOptimizedComponent,
  transitionClasses,
  hoverClasses,
  animationClasses,
} from '@/hooks/optimizacion';

interface NotificationHeaderProps {
  selectedCount: number;
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onDeleteSelected: () => void;
  isLoading?: boolean;
  className?: string;
}

function NotificationHeaderComponent({
  selectedCount,
  unreadCount,
  onMarkAllAsRead,
  onDeleteSelected,
  isLoading,
  className,
}: NotificationHeaderProps) {
  useOptimizedComponent({ selectedCount, unreadCount }, { componentName: 'NotificationHeader' });
  
  const hasSelection = selectedCount > 0;
  const hasUnread = unreadCount > 0;
  
  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-3 sm:p-4 md:p-6 bg-card rounded-lg border border-border',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        'w-full min-w-0 overflow-hidden',
        animationClasses.fadeIn,
        transitionClasses.normal,
        className
      )}
    >
      {/* Título y descripción */}
      <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
        <div
          className={cn(
            'p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0',
            transitionClasses.colors,
            hoverClasses.scale
          )}
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
        </div>
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-semibold text-foreground truncate">
            Centro de Notificaciones
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
            Mantente al día con todas tus actualizaciones y mensajes importantes
          </p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        {hasSelection && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSelected}
            disabled={isLoading}
            className={cn(
              'gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3',
              transitionClasses.colors,
              hoverClasses.scale
            )}
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">
              Eliminar ({selectedCount})
            </span>
          </Button>
        )}
        
        {(hasSelection || hasUnread) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAllAsRead}
            disabled={isLoading}
            className={cn(
              'gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3',
              transitionClasses.colors,
              hoverClasses.scale
            )}
          >
            <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">
              {hasSelection ? 'Marcar como leídas' : 'Marcar todas como leídas'}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}

export const NotificationHeader = memo(NotificationHeaderComponent);
