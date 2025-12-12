/**
 * Componente de Tendencias (Hashtags)
 * Filtrable por período: 24h, 7d, 30d, todos
 * Con suscripción a tendencias
 */
import { Hash, Plus, Check, Bell, BellOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTrendingHashtags, useHashtagSubscription, type TrendingPeriod } from '@/hooks/entidades';
import { cn } from '@/lib/utils';

interface TrendingHashtagsCardProps {
  onHashtagClick?: (hashtag: string) => void;
  className?: string;
  showSubscription?: boolean;
}

const periodLabels: Record<TrendingPeriod, string> = {
  '24h': '24h',
  '7d': '7d',
  '30d': '30d',
  'all': 'Todos',
};

export function TrendingHashtagsCard({ onHashtagClick, className, showSubscription = true }: TrendingHashtagsCardProps) {
  const { hashtags, isLoading, period, changePeriod } = useTrendingHashtags({ limit: 5 });
  const { isFollowing, toggleFollow, isToggling } = useHashtagSubscription({ realtime: true });

  return (
    <Card className={cn("w-full max-w-full overflow-hidden", className)}>
      <CardHeader className="py-3 px-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Hash className="h-4 w-4 shrink-0" />
          Tendencias
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-3 overflow-hidden">
        {/* Selector de período */}
        <div className="flex gap-1 mb-4">
          {(Object.keys(periodLabels) as TrendingPeriod[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "flex-1 h-8 text-xs",
                period === p && "bg-primary text-primary-foreground"
              )}
              onClick={() => changePeriod(p)}
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>

        {/* Lista de hashtags */}
        <div className="space-y-2">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </>
          ) : hashtags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay tendencias aún
            </p>
          ) : (
            hashtags.map((hashtag) => {
              const following = isFollowing(hashtag.id);
              
              return (
                <div
                  key={hashtag.id}
                  className="w-full flex items-center justify-between py-2 hover:bg-secondary/50 rounded-lg px-2 transition-colors gap-2 min-w-0"
                >
                  <button
                    onClick={() => onHashtagClick?.(hashtag.nombre)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-medium text-sm truncate">#{hashtag.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {hashtag.publicaciones_count} {hashtag.publicaciones_count === 1 ? 'publicación' : 'publicaciones'}
                    </p>
                  </button>
                  
                  {showSubscription && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={following ? 'secondary' : 'ghost'}
                            size="icon"
                            className={cn(
                              "h-8 w-8 shrink-0 transition-all",
                              following && "bg-primary/10 text-primary hover:bg-primary/20"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFollow(hashtag.id);
                            }}
                            disabled={isToggling}
                          >
                            {isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : following ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {following ? 'Dejar de seguir' : 'Seguir tendencia'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
