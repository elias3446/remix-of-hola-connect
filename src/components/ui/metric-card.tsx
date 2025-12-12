/**
 * MetricCard - Tarjeta de métrica reutilizable
 * Muestra un valor con icono, título y promedio
 */
import { memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';

export interface MetricCardProps {
  /** Título de la métrica */
  title: string;
  /** Valor principal */
  value: number | string;
  /** Texto del promedio o descripción */
  averageText?: string;
  /** Icono a mostrar */
  icon?: LucideIcon;
  /** Color del icono */
  iconColor?: string;
  /** Clase de fondo del icono */
  iconBgClass?: string;
  /** Delay de animación */
  delay?: number;
  /** Tamaño de la tarjeta */
  size?: 'sm' | 'md' | 'lg';
  /** Clase adicional */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  averageText,
  icon: Icon,
  iconColor = 'text-primary',
  iconBgClass = 'bg-primary/10',
  delay = 0,
  size = 'md',
  className,
  onClick,
}: MetricCardProps) {
  const sizeClasses = {
    sm: 'p-2 sm:p-3',
    md: 'p-3 sm:p-4',
    lg: 'p-4 sm:p-6',
  };

  const valueSizeClasses = {
    sm: 'text-lg sm:text-xl',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
  };

  const iconSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Card
      className={cn(
        'hover:shadow-md cursor-default',
        onClick && 'cursor-pointer',
        animationClasses.fadeIn,
        transitionClasses.normal,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <CardContent className={sizeClasses[size]}>
        <div className="flex items-start gap-2">
          {Icon && (
            <div className={cn('p-1.5 rounded-md shrink-0', iconBgClass)}>
              <Icon className={cn(iconSizeClasses[size], iconColor)} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className={cn('font-bold text-foreground', valueSizeClasses[size])}>
              {value}
            </p>
            {averageText && (
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {averageText}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
