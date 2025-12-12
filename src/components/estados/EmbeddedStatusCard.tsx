/**
 * Tarjeta de estado embebido para mostrar en el feed
 * Estilo visual tipo story (fondo oscuro, gradiente)
 */
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Repeat2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { transitionClasses } from '@/hooks/optimizacion';

interface EmbeddedStatusCardProps {
  contenido?: string | null;
  imagenes?: string[] | null;
  createdAt: string;
  author?: {
    id?: string;
    name?: string | null;
    avatar?: string | null;
    username?: string | null;
  } | null;
  onClick?: () => void;
  className?: string;
}

export function EmbeddedStatusCard({
  contenido,
  imagenes,
  createdAt,
  author,
  onClick,
  className,
}: EmbeddedStatusCardProps) {
  const timeAgo = formatDistanceToNow(new Date(createdAt), {
    addSuffix: false,
    locale: es,
  });

  const initials = author?.name?.charAt(0)?.toUpperCase() || 
    author?.username?.charAt(0)?.toUpperCase() || '?';

  return (
    <div 
      className={cn(
        "relative rounded-lg overflow-hidden cursor-pointer",
        "bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900",
        "border border-border/50",
        transitionClasses.normal,
        "hover:scale-[1.01] hover:shadow-lg",
        className
      )}
      onClick={onClick}
    >
      {/* Header con avatar y tiempo */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full ring-2 ring-primary/50 p-0.5">
            <Avatar className="h-full w-full">
              <AvatarImage src={author?.avatar || undefined} />
              <AvatarFallback className="bg-muted text-[10px] font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {author?.name || author?.username || 'Usuario'}
            </p>
            <p className="text-white/60 text-[10px] flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              hace {timeAgo}
            </p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="min-h-[160px] flex items-center justify-center p-4 pt-14 pb-4">
        {imagenes && imagenes.length > 0 ? (
          <img 
            src={imagenes[0]} 
            alt="Estado" 
            className="max-h-[140px] max-w-full rounded object-contain"
          />
        ) : contenido ? (
          <p className="text-white text-center text-sm font-medium line-clamp-4 px-2">
            {contenido}
          </p>
        ) : (
          <p className="text-white/40 text-center text-sm italic">
            Sin contenido
          </p>
        )}
      </div>

      {/* Indicador de tipo estado */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 text-white/70 text-[10px]">
        <Repeat2 className="h-3 w-3" />
        <span>Estado</span>
      </div>
    </div>
  );
}
