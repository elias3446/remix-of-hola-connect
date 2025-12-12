import { Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnimations, transitionClasses } from '@/hooks/optimizacion';
import { useOptimizedComponent } from '@/hooks/optimizacion/useOptimizedComponent';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Cargando datos del usuario...' }: LoadingScreenProps) {
  // Optimización del componente
  useOptimizedComponent({ message }, { componentName: 'LoadingScreen' });
  
  const { getStaggerClass } = useAnimations();

  return (
    <div className="fixed inset-0 min-h-screen w-full bg-background flex flex-col items-center justify-center gap-6 z-50">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 animate-pulse",
        getStaggerClass(0, 100)
      )}>
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl bg-primary",
          transitionClasses.transform,
          "hover:scale-105"
        )}>
          <Shield className="h-7 w-7 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold text-foreground">UniAlerta UCE</span>
      </div>

      {/* Loading indicator */}
      <div className={cn(
        "flex flex-col items-center gap-4",
        getStaggerClass(1, 100)
      )}>
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className={cn(
          "text-muted-foreground text-sm text-center px-4",
          transitionClasses.opacity
        )}>
          {message}
        </p>
      </div>

      {/* Progress dots */}
      <div className={cn(
        "flex gap-2",
        getStaggerClass(2, 100)
      )}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-2 w-2 rounded-full bg-primary/30",
              "animate-pulse"
            )}
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
