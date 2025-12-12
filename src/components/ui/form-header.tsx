import { ArrowLeft, LucideIcon } from 'lucide-react';
import { Button } from './button';
import { animationClasses } from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';

export interface FormHeaderProps {
  /** Título del formulario */
  title: string;
  /** Descripción/subtítulo del formulario */
  description?: string;
  /** Icono a mostrar junto al título */
  icon?: LucideIcon;
  /** Color del icono (clase de Tailwind) */
  iconClassName?: string;
  /** Función para retroceder */
  onBack?: () => void;
  /** Mostrar botón de retroceder */
  showBackButton?: boolean;
  /** Clases adicionales */
  className?: string;
}

/**
 * Header reutilizable para formularios
 * Similar al diseño de referencia con flecha, icono, título y descripción
 */
export function FormHeader({
  title,
  description,
  icon: Icon,
  iconClassName,
  onBack,
  showBackButton = true,
  className,
}: FormHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-4 px-6 bg-secondary/50 border-b border-border',
        animationClasses.fadeIn,
        className
      )}
    >
      {showBackButton && onBack && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary',
            iconClassName
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      )}

      <div className="flex flex-col">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
