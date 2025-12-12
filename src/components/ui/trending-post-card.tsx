/**
 * TrendingPostCard - Tarjeta de publicación en tendencia
 * Muestra ranking, autor y métricas de engagement
 */
import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, Heart, MessageCircle, Eye, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';

export interface TrendingPostData {
  id: string;
  rank: number;
  contenido: string | null;
  created_at: string;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
  } | null;
  score: number;
  likes_count: number;
  comments_count: number;
  views_count: number;
  shares_count?: number;
}

export interface TrendingPostCardProps {
  post: TrendingPostData;
  delay?: number;
  onClick?: (postId: string) => void;
  className?: string;
}

export const TrendingPostCard = memo(function TrendingPostCard({
  post,
  delay = 0,
  onClick,
  className,
}: TrendingPostCardProps) {
  const authorInitials = post.author?.name
    ? post.author.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: es,
  });

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow cursor-pointer',
        animationClasses.fadeIn,
        transitionClasses.normal,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => onClick?.(post.id)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-3">
          {/* Ranking */}
          <div className="flex flex-col items-center justify-start shrink-0">
            <span className="text-lg sm:text-xl font-bold text-primary">#{post.rank}</span>
          </div>

          {/* Avatar */}
          <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
            <AvatarImage src={post.author?.avatar || undefined} alt={post.author?.name || 'Usuario'} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
              {authorInitials}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author info */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-medium text-sm text-foreground truncate">
                {post.author?.name || 'Usuario'}
              </span>
              <span className="text-xs text-muted-foreground">
                @{post.author?.username || 'usuario'}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>

            {/* Post content */}
            <p className="text-sm text-foreground line-clamp-2 mb-2">
              {post.contenido || 'Sin contenido'}
            </p>

            {/* Metrics */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{post.score}</span>
                <span className="hidden sm:inline">Score</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5 text-destructive" />
                <span>{post.likes_count}</span>
                <span className="hidden sm:inline">Me gusta</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{post.comments_count}</span>
                <span className="hidden sm:inline">Comentarios</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                <span>{post.views_count}</span>
                <span className="hidden sm:inline">Vistas</span>
              </div>
              {post.shares_count !== undefined && (
                <div className="flex items-center gap-1">
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{post.shares_count}</span>
                  <span className="hidden sm:inline">Compartidos</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
