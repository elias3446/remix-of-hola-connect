/**
 * Indicador de "escribiendo..." estilo WhatsApp
 * Muestra tres puntos animados con efecto de rebote
 */
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  /** Nombre del usuario que está escribiendo */
  userName?: string;
  /** Avatar del usuario */
  userAvatar?: string;
  /** Mostrar avatar */
  showAvatar?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

export function TypingIndicator({
  userName,
  userAvatar,
  showAvatar = true,
  className,
}: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-end gap-2 mb-2", className)}>
      {/* Avatar */}
      {showAvatar && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={userAvatar || ''} />
          <AvatarFallback className="text-xs bg-muted">
            {userName?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Burbuja con indicador */}
      <div className="flex flex-col items-start">
        {userName && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {userName}
          </span>
        )}
        
        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
          <div className="flex items-center gap-1">
            <span 
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
              style={{ animationDelay: '0ms', animationDuration: '600ms' }}
            />
            <span 
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
              style={{ animationDelay: '150ms', animationDuration: '600ms' }}
            />
            <span 
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
              style={{ animationDelay: '300ms', animationDuration: '600ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
