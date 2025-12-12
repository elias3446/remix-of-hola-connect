/**
 * Barra de progreso para el visor de estados
 */
import { cn } from '@/lib/utils';
import { transitionClasses } from '@/hooks/optimizacion';

interface StatusProgressBarProps {
  totalStatuses: number;
  currentIndex: number;
  progress: number; // 0-100 para el estado actual
  className?: string;
}

export function StatusProgressBar({
  totalStatuses,
  currentIndex,
  progress,
  className,
}: StatusProgressBarProps) {
  return (
    <div className={cn("flex gap-1 w-full", className)}>
      {Array.from({ length: totalStatuses }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1 flex-1 rounded-full bg-white/30 overflow-hidden",
            transitionClasses.fast
          )}
        >
          <div
            className={cn(
              "h-full bg-white rounded-full",
              transitionClasses.fast
            )}
            style={{
              width: index < currentIndex 
                ? '100%' 
                : index === currentIndex 
                  ? `${progress}%` 
                  : '0%',
            }}
          />
        </div>
      ))}
    </div>
  );
}
