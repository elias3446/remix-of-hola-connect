/**
 * AnalyticsContainer - Contenedor para secciones de análisis
 * Proporciona estructura y estilos consistentes
 */
import { memo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';

export interface AnalyticsContainerProps {
  /** Título de la sección */
  title?: string;
  /** Descripción de la sección */
  description?: string;
  /** Contenido del contenedor */
  children: ReactNode;
  /** Contenido adicional en el header */
  headerContent?: ReactNode;
  /** Mostrar como Card o div simple */
  variant?: 'card' | 'plain';
  /** Delay de animación */
  delay?: number;
  /** Clase adicional */
  className?: string;
  /** Clase para el contenido */
  contentClassName?: string;
}

export const AnalyticsContainer = memo(function AnalyticsContainer({
  title,
  description,
  children,
  headerContent,
  variant = 'card',
  delay = 0,
  className,
  contentClassName,
}: AnalyticsContainerProps) {
  if (variant === 'plain') {
    return (
      <div
        className={cn(animationClasses.fadeIn, className)}
        style={{ animationDelay: `${delay}ms` }}
      >
        {(title || headerContent) && (
          <div className="flex items-start justify-between mb-4">
            <div>
              {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {headerContent}
          </div>
        )}
        <div className={contentClassName}>{children}</div>
      </div>
    );
  }

  return (
    <Card
      className={cn(animationClasses.fadeIn, transitionClasses.normal, className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(title || headerContent) && (
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {title && <CardTitle className="text-lg">{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {headerContent}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(!title && !headerContent && 'pt-6', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
});
