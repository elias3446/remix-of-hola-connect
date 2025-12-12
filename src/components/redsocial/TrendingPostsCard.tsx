/**
 * Componente de Publicaciones en Tendencia
 * Ranking de los 5 feeds más populares
 * Filtrable por período: 24h, 7d, 30d, todos
 * REALTIME con animaciones de reordenamiento
 */
import { memo, useEffect, useState } from 'react';
import { TrendingUp, Heart, MessageCircle, Eye, Flame, ArrowUp, ArrowDown, Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrendingPosts, type TrendingPost, type TrendingPeriod } from '@/hooks/entidades';
import { cn } from '@/lib/utils';

interface TrendingPostsCardProps {
  onPostClick?: (postId: string) => void;
  onViewAll?: () => void;
  className?: string;
  showPeriodFilter?: boolean;
}

const periodLabels: Record<TrendingPeriod, string> = {
  '24h': '24h',
  '7d': '7d',
  '30d': '30d',
  'all': 'Todos',
};

// Componente animado para cada post
const AnimatedPostItem = memo(function AnimatedPostItem({
  post,
  onPostClick,
  getRankBadgeClass,
  truncateContent,
}: {
  post: TrendingPost;
  onPostClick?: (postId: string) => void;
  getRankBadgeClass: (rank: number) => string;
  truncateContent: (content: string | null, maxLength?: number) => string;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showChangeIndicator, setShowChangeIndicator] = useState(false);

  useEffect(() => {
    if (post.rankChange !== 'same') {
      setIsAnimating(true);
      setShowChangeIndicator(true);
      
      const animTimer = setTimeout(() => setIsAnimating(false), 600);
      const indicatorTimer = setTimeout(() => setShowChangeIndicator(false), 3000);
      
      return () => {
        clearTimeout(animTimer);
        clearTimeout(indicatorTimer);
      };
    }
  }, [post.rankChange, post.score]);

  return (
    <button
      onClick={() => onPostClick?.(post.id)}
      className={cn(
        "w-full flex gap-3 py-2 hover:bg-secondary/50 rounded-lg px-2 transition-all text-left group relative",
        isAnimating && post.rankChange === 'up' && "animate-pulse bg-green-500/10",
        isAnimating && post.rankChange === 'down' && "animate-pulse bg-red-500/10",
        isAnimating && post.rankChange === 'new' && "animate-pulse bg-primary/10"
      )}
    >
      {/* Ranking badge con animación */}
      <div className="relative">
        <div
          className={cn(
            "h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300",
            getRankBadgeClass(post.rank),
            isAnimating && "scale-110"
          )}
        >
          #{post.rank}
        </div>
        
        {/* Indicador de cambio de ranking */}
        {showChangeIndicator && post.rankChange !== 'same' && (
          <div className={cn(
            "absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full flex items-center justify-center animate-bounce",
            post.rankChange === 'up' && "bg-green-500",
            post.rankChange === 'down' && "bg-red-500",
            post.rankChange === 'new' && "bg-primary"
          )}>
            {post.rankChange === 'up' && <ArrowUp className="h-2.5 w-2.5 text-white" />}
            {post.rankChange === 'down' && <ArrowDown className="h-2.5 w-2.5 text-white" />}
            {post.rankChange === 'new' && <Sparkles className="h-2.5 w-2.5 text-white" />}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Autor */}
        <p className="font-medium text-sm truncate">
          {post.author?.name || 'Usuario'}
        </p>
        
        {/* Contenido */}
        <p className="text-xs text-muted-foreground line-clamp-1">
          {truncateContent(post.contenido)}
        </p>

        {/* Stats con animación en score */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className={cn(
            "flex items-center gap-1 font-medium transition-all",
            isAnimating && "text-primary scale-105"
          )}>
            <TrendingUp className="h-3 w-3" />
            {post.score}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {post.likes_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {post.comments_count}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {post.views_count}
          </span>
          {post.rank <= 3 && (
            <span className="flex items-center gap-1 text-amber-500">
              <Flame className="h-3 w-3" />
              <span className="text-[10px]">Hot</span>
            </span>
          )}
        </div>
      </div>
    </button>
  );
});

export function TrendingPostsCard({ onPostClick, onViewAll, className, showPeriodFilter = true }: TrendingPostsCardProps) {
  const { posts, isLoading, isFetching, period, changePeriod } = useTrendingPosts({ limit: 5 });

  const getRankBadgeClass = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/30 shadow-lg';
      case 2:
        return 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-slate-400/30 shadow-md';
      case 3:
        return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-400/30 shadow-md';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const truncateContent = (content: string | null, maxLength: number = 50) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <Card className={cn("w-full", className)} style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <CardHeader className="py-3 px-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2 min-w-0">
          <TrendingUp className="h-4 w-4 shrink-0" />
          <span className="truncate">Publicaciones en Tendencia</span>
          {/* Indicador de actualización en tiempo real */}
          {isFetching && !isLoading && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
          >
            Ver todas
          </button>
        )}
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-3" style={{ maxWidth: '100%', overflow: 'hidden' }}>
        {/* Selector de período */}
        {showPeriodFilter && (
          <div className="flex gap-1 mb-4">
            {(Object.keys(periodLabels) as TrendingPeriod[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "flex-1 h-8 text-xs transition-all",
                  period === p && "bg-primary text-primary-foreground"
                )}
                onClick={() => changePeriod(p)}
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-1">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3 py-2 px-2">
                  <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </>
          ) : posts.length === 0 ? (
            <div className="text-center py-6">
              <Flame className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay publicaciones en tendencia
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                en este período
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <AnimatedPostItem
                key={post.id}
                post={post}
                onPostClick={onPostClick}
                getRankBadgeClass={getRankBadgeClass}
                truncateContent={truncateContent}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
