import { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/controlador/useNotifications';
import { useNotificationCount } from '@/hooks/controlador/useNotificationCount';
import {
  useOptimizedComponent,
  transitionClasses,
  hoverClasses,
  animationClasses,
} from '@/hooks/optimizacion';
import type { Database } from '@/integrations/supabase/types';

type NotificationType = Database['public']['Enums']['notification_type'];

const typeLabels: Record<NotificationType, string> = {
  actualizacion: 'actualizacion',
  advertencia: 'advertencia',
  asignacion: 'asignacion',
  comentario: 'comentario',
  error: 'error',
  exito: 'exito',
  informacion: 'info',
  recordatorio: 'recordatorio',
};

const typeColors: Record<NotificationType, string> = {
  actualizacion: 'bg-blue-500 text-white',
  advertencia: 'bg-amber-500 text-white',
  asignacion: 'bg-indigo-500 text-white',
  comentario: 'bg-slate-500 text-white',
  error: 'bg-red-500 text-white',
  exito: 'bg-emerald-500 text-white',
  informacion: 'bg-sky-500 text-white',
  recordatorio: 'bg-purple-500 text-white',
};

interface NotificationsDropdownProps {
  className?: string;
}

function NotificationsDropdownComponent({ className }: NotificationsDropdownProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  
  const { unreadCount } = useNotificationCount();
  
  const {
    notifications,
    isLoading,
    selectedIds,
    selectedCount,
    isAllSelected,
    toggleSelection,
    toggleSelectAll,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    deleteSelected,
  } = useNotifications({ pageSize: 5, initialFilter: 'unread' });
  
  // Optimización del componente
  useOptimizedComponent({ open, unreadCount }, { componentName: 'NotificationsDropdown' });
  
  const handleViewAll = useCallback(() => {
    setOpen(false);
    navigate('/notificaciones');
  }, [navigate]);
  
  const handleMarkAsRead = useCallback(async (id: string) => {
    await markAsRead([id]);
  }, [markAsRead]);
  
  const handleDelete = useCallback(async (id: string) => {
    await deleteNotifications([id]);
  }, [deleteNotifications]);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative p-2 rounded-full",
            transitionClasses.colors,
            hoverClasses.bgAccent,
            className
          )}
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full px-1 text-[10px] flex items-center justify-center",
                "animate-pulse"
              )}
            >
              {unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className={cn(
          "w-[380px] p-0",
          animationClasses.fadeIn
        )} 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">Notificaciones</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 rounded-full text-[11px]">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Select All & Actions - Solo mostrar si hay notificaciones */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={notifications.length > 0 && notifications.every(n => selectedIds.has(n.id))}
                onCheckedChange={() => {
                  const allSelected = notifications.every(n => selectedIds.has(n.id));
                  notifications.forEach(n => {
                    if (allSelected) {
                      if (selectedIds.has(n.id)) toggleSelection(n.id);
                    } else {
                      if (!selectedIds.has(n.id)) toggleSelection(n.id);
                    }
                  });
                }}
                aria-label="Seleccionar todas"
              />
              <span className="text-sm text-muted-foreground">
                {selectedCount > 0 
                  ? `${selectedCount} de ${notifications.length} seleccionadas` 
                  : 'Seleccionar todas'}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectedCount > 0 ? () => markAsRead(Array.from(selectedIds)) : markAllAsRead}
                className="gap-1.5 text-xs h-7"
                disabled={selectedCount === 0 && unreadCount === 0}
              >
                <Check className="h-3.5 w-3.5" />
                {selectedCount > 0 ? 'Marcar leídas' : 'Marcar todas'}
              </Button>
              
              {selectedCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelected}
                  className="gap-1.5 text-xs h-7"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Notifications List */}
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification, index) => {
                const isSelected = selectedIds.has(notification.id);
                const isUnread = !notification.read;
                const timeAgo = formatDistanceToNow(new Date(notification.created_at), { 
                  addSuffix: false, 
                  locale: es 
                });
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "px-4 py-3 flex gap-3",
                      isUnread && "bg-primary/5",
                      transitionClasses.colors,
                      animationClasses.fadeIn
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(notification.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium text-foreground truncate",
                            isUnread && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                        <Badge 
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 shrink-0",
                            typeColors[notification.type]
                          )}
                        >
                          {typeLabels[notification.type]}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          Hace {timeAgo}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {isUnread && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(notification.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer - Solo mostrar si hay notificaciones */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <button
              onClick={handleViewAll}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground",
                transitionClasses.colors,
                hoverClasses.bgAccent
              )}
            >
              <span>Ver todas las notificaciones</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export const NotificationsDropdown = memo(NotificationsDropdownComponent);
