import { memo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Trash2, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { transitionClasses, hoverClasses, animationClasses } from '@/hooks/optimizacion';
import type { Database } from '@/integrations/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationType = Database['public']['Enums']['notification_type'];

interface NotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
}

const typeLabels: Record<NotificationType, string> = {
  actualizacion: 'Actualización',
  advertencia: 'Advertencia',
  asignacion: 'Asignación',
  comentario: 'Comentario',
  error: 'Error',
  exito: 'Éxito',
  informacion: 'Información',
  recordatorio: 'Recordatorio',
};

const typeVariants: Record<NotificationType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  actualizacion: 'secondary',
  advertencia: 'outline',
  asignacion: 'default',
  comentario: 'outline',
  error: 'destructive',
  exito: 'default',
  informacion: 'secondary',
  recordatorio: 'secondary',
};

function NotificationItemComponent({
  notification,
  isSelected,
  onToggleSelection,
  onDelete,
  onMarkAsRead,
}: NotificationItemProps) {
  const formattedDate = format(new Date(notification.created_at), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", {
    locale: es,
  });
  
  const isUnread = !notification.read;
  
  return (
    <div
      className={cn(
        'bg-card rounded-lg border border-border p-4 sm:p-5',
        'flex flex-col gap-3',
        isUnread && 'border-l-4 border-l-primary',
        transitionClasses.normal,
        animationClasses.fadeIn
      )}
    >
      {/* Header with checkbox and title */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(notification.id)}
          aria-label={`Seleccionar notificación: ${notification.title}`}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-semibold text-foreground">
              {notification.title}
            </h3>
            {isUnread && (
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] px-1.5 py-0.5 uppercase font-bold">
                Nuevo
              </Badge>
            )}
          </div>
          <Badge
            variant={typeVariants[notification.type]}
            className="mt-1.5 text-xs"
          >
            {typeLabels[notification.type]}
          </Badge>
        </div>
      </div>
      
      {/* Message content */}
      <p className="text-sm text-muted-foreground pl-7">
        {notification.message}
      </p>
      
      {/* Footer with date and actions */}
      <div className="flex items-center justify-between gap-4 pl-7 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formattedDate}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isUnread && onMarkAsRead && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkAsRead(notification.id)}
              className={cn(
                'gap-1.5',
                hoverClasses.scale
              )}
            >
              <Check className="h-4 w-4" />
              <span className="hidden sm:inline">Marcar como leída</span>
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(notification.id)}
            className={cn(
              'gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10',
              hoverClasses.scale
            )}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Eliminar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const NotificationItem = memo(NotificationItemComponent);
