/**
 * Tarjeta de publicación embebida para mostrar en reposts
 * Estilo visual tipo feed (card normal, diferente de estados/stories)
 */
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Repeat2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { transitionClasses } from '@/hooks/optimizacion';

interface EmbeddedPostCardProps {
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

export function EmbeddedPostCard({
  contenido,
  imagenes,
  createdAt,
  author,
  onClick,
  className,
}: EmbeddedPostCardProps) {
  const timeAgo = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
    locale: es,
  });

  const initials = author?.name?.charAt(0)?.toUpperCase() || 
    author?.username?.charAt(0)?.toUpperCase() || '?';

  // Renderizar contenido con hashtags y menciones resaltados
  const renderContent = (content: string | null) => {
    if (!content) return null;
    
    const parts = content.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span key={i} className="text-primary font-medium">
            {part}
          </span>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-primary font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <Card 
      className={cn(
        "border border-border/70 bg-muted/30 cursor-pointer overflow-hidden",
        transitionClasses.normal,
        "hover:bg-muted/50",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Header con avatar y info */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={author?.avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-foreground truncate">
                {author?.name || author?.username || 'Usuario'}
              </p>
              {author?.username && (
                <span className="text-xs text-muted-foreground truncate">
                  @{author.username}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeAgo}
            </p>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
            <Repeat2 className="h-3 w-3" />
            <span className="hidden sm:inline">Publicación</span>
          </div>
        </div>

        {/* Contenido de texto */}
        {contenido && (
          <p className="text-sm text-foreground mb-2 line-clamp-3 whitespace-pre-wrap">
            {renderContent(contenido)}
          </p>
        )}

        {/* Imágenes */}
        {imagenes && imagenes.length > 0 && (
          <div className={cn(
            "grid gap-1 rounded-md overflow-hidden",
            imagenes.length === 1 && "grid-cols-1",
            imagenes.length >= 2 && "grid-cols-2"
          )}>
            {imagenes.slice(0, 4).map((imagen, index) => (
              <div 
                key={index}
                className={cn(
                  "relative bg-muted",
                  imagenes.length === 1 && "aspect-video",
                  imagenes.length >= 2 && "aspect-square"
                )}
              >
                <img 
                  src={imagen} 
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {imagenes.length > 4 && index === 3 && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      +{imagenes.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sin contenido */}
        {!contenido && (!imagenes || imagenes.length === 0) && (
          <p className="text-sm text-muted-foreground italic">
            Publicación sin contenido
          </p>
        )}
      </CardContent>
    </Card>
  );
}
