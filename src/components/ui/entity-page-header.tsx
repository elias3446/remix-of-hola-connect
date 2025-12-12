import * as React from 'react';
import { Plus, Upload, ArrowLeft, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntityPermissions } from '@/hooks/controlador/useEntityPermissions';
import { 
  useOptimizedComponent,
  transitionClasses,
  hoverClasses,
  animationClasses,
} from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';

export interface EntityPageHeaderProps {
  /** Título de la página */
  title: string;
  /** Descripción/subtítulo de la página */
  description?: string;
  /** Icono a mostrar junto al título */
  icon: LucideIcon;
  /** Clave de la entidad para verificar permisos (ej: 'tipo-reportes', 'categorias') */
  entityKey: string;
  /** Mostrar botón de volver */
  showBack?: boolean;
  /** Texto del botón volver */
  backButtonText?: string;
  /** Callback al hacer clic en volver */
  onBackClick?: () => void;
  /** Mostrar botón de crear */
  showCreate?: boolean;
  /** Texto del botón crear */
  createButtonText?: string;
  /** Callback al hacer clic en crear */
  onCreateClick?: () => void;
  /** Mostrar botón de carga masiva */
  showBulkUpload?: boolean;
  /** Texto del botón de carga masiva */
  bulkUploadText?: string;
  /** Callback al hacer clic en carga masiva */
  onBulkUploadClick?: () => void;
  /** Contenido adicional a la derecha */
  rightContent?: React.ReactNode;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Componente de encabezado para páginas de gestión de entidades
 * Muestra título, descripción, icono y botones de acción según permisos
 */
export function EntityPageHeader({
  title,
  description,
  icon: Icon,
  entityKey,
  showBack = false,
  backButtonText = 'Volver',
  onBackClick,
  showCreate = true,
  createButtonText = 'Crear',
  onCreateClick,
  showBulkUpload = true,
  bulkUploadText = 'Carga Masiva',
  onBulkUploadClick,
  rightContent,
  className,
}: EntityPageHeaderProps) {
  const { canCreate, canBulkUpload } = useEntityPermissions({ entityKey });

  // Optimización del componente
  useOptimizedComponent(
    { title, entityKey, canCreate, canBulkUpload },
    { componentName: 'EntityPageHeader' }
  );

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
        <div className={cn(
          'p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0',
          transitionClasses.colors,
          hoverClasses.scale
        )}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
        </div>
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-semibold text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        {rightContent}

        {showBack && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBackClick}
            className={cn(
              'gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3',
              transitionClasses.colors,
              hoverClasses.scale
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">{backButtonText}</span>
          </Button>
        )}
        
        {showBulkUpload && canBulkUpload && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkUploadClick}
            className={cn(
              'gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3',
              transitionClasses.colors,
              hoverClasses.scale
            )}
          >
            <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline text-xs sm:text-sm">{bulkUploadText}</span>
          </Button>
        )}

        {showCreate && canCreate && (
          <Button
            size="sm"
            onClick={onCreateClick}
            className={cn(
              'gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3',
              transitionClasses.colors,
              hoverClasses.scale
            )}
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">{createButtonText}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
