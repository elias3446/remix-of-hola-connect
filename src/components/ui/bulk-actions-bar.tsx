import React, { memo } from 'react';
import { X, Trash2, ToggleLeft, UserCheck, Tag, Layers, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOptimizedComponent } from '@/hooks/optimizacion';

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  disabled?: boolean;
  className?: string;
}

export interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
  isProcessing?: boolean;
  className?: string;
}

/**
 * Componente universal de barra de acciones bulk
 * Diseñado para usarse con el hook useBulkActions
 */
function BulkActionsBarComponent({
  selectedCount,
  onClear,
  actions,
  isProcessing = false,
  className,
}: BulkActionsBarProps) {
  useOptimizedComponent({ selectedCount, actionsCount: actions.length }, { componentName: 'BulkActionsBar' });

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3',
        'bg-muted/50 border border-border rounded-lg',
        'animate-fade-in shadow-sm',
        className
      )}
    >
      {/* Contador y botón limpiar */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground whitespace-nowrap">
          {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={isProcessing}
          className="gap-1.5 h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          <span className="text-xs">Limpiar</span>
        </Button>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant || 'outline'}
            size="sm"
            onClick={action.onClick}
            disabled={isProcessing || action.disabled}
            className={cn(
              'gap-1.5 h-8 px-3 text-xs sm:text-sm',
              action.variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              action.className
            )}
          >
            {action.icon}
            <span className="hidden sm:inline">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export const BulkActionsBar = memo(BulkActionsBarComponent);

// Iconos predefinidos para acciones comunes
export const BulkActionIcons = {
  delete: <Trash2 className="h-4 w-4" />,
  toggleStatus: <ToggleLeft className="h-4 w-4" />,
  assign: <UserCheck className="h-4 w-4" />,
  category: <Tag className="h-4 w-4" />,
  type: <FileType className="h-4 w-4" />,
  status: <Layers className="h-4 w-4" />,
};

// Helper para crear acciones comunes
export function createBulkDeleteAction(onDelete: () => void, disabled?: boolean): BulkAction {
  return {
    id: 'delete',
    label: 'Eliminar',
    icon: BulkActionIcons.delete,
    onClick: onDelete,
    variant: 'destructive',
    disabled,
  };
}

export function createBulkToggleStatusAction(
  label: string,
  onToggle: () => void,
  disabled?: boolean
): BulkAction {
  return {
    id: 'toggle-status',
    label,
    icon: BulkActionIcons.toggleStatus,
    onClick: onToggle,
    variant: 'outline',
    disabled,
  };
}

export function createBulkAssignAction(onAssign: () => void, disabled?: boolean): BulkAction {
  return {
    id: 'assign',
    label: 'Asignar',
    icon: BulkActionIcons.assign,
    onClick: onAssign,
    variant: 'outline',
    disabled,
  };
}

export function createBulkCategoryAction(onChangeCategory: () => void, disabled?: boolean): BulkAction {
  return {
    id: 'category',
    label: 'Categoría',
    icon: BulkActionIcons.category,
    onClick: onChangeCategory,
    variant: 'outline',
    disabled,
  };
}

export function createBulkTypeAction(onChangeType: () => void, disabled?: boolean): BulkAction {
  return {
    id: 'type',
    label: 'Tipo',
    icon: BulkActionIcons.type,
    onClick: onChangeType,
    variant: 'outline',
    disabled,
  };
}

export function createBulkStatusAction(
  label: string,
  onChangeStatus: () => void,
  disabled?: boolean
): BulkAction {
  return {
    id: 'status',
    label,
    icon: BulkActionIcons.status,
    onClick: onChangeStatus,
    variant: 'outline',
    disabled,
  };
}
