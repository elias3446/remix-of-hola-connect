import { memo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { transitionClasses } from '@/hooks/optimizacion';

interface NotificationSelectAllProps {
  isAllSelected: boolean;
  selectedCount: number;
  totalCount: number;
  onToggleSelectAll: () => void;
  className?: string;
}

function NotificationSelectAllComponent({
  isAllSelected,
  selectedCount,
  totalCount,
  onToggleSelectAll,
  className,
}: NotificationSelectAllProps) {
  const hasSelection = selectedCount > 0;
  
  return (
    <div
      className={cn(
        'bg-card rounded-lg border border-border p-4',
        'flex items-center justify-between gap-4',
        transitionClasses.normal,
        className
      )}
    >
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <Checkbox
          checked={isAllSelected || (hasSelection && !isAllSelected)}
          onCheckedChange={onToggleSelectAll}
          aria-label="Seleccionar todas las notificaciones"
          className={hasSelection && !isAllSelected ? 'data-[state=checked]:bg-primary/50' : ''}
        />
        <span className="text-sm font-medium text-foreground">
          {isAllSelected ? (
            <span>
              Todas las {totalCount} notificaciones seleccionadas
            </span>
          ) : hasSelection ? (
            <span>
              {selectedCount} notificación(es) seleccionada(s)
            </span>
          ) : (
            'Seleccionar todas'
          )}
        </span>
      </label>
      
      {hasSelection && !isAllSelected && (
        <button
          onClick={onToggleSelectAll}
          className="text-sm text-primary hover:underline"
        >
          Seleccionar todas ({totalCount})
        </button>
      )}
    </div>
  );
}

export const NotificationSelectAll = memo(NotificationSelectAllComponent);
