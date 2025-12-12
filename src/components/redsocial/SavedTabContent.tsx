/**
 * Contenido del tab de guardados con sub-tabs
 * - Tendencias que sigo (hashtags seguidos con sus feeds)
 * - Feeds guardadas (publicaciones guardadas)
 */
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Hash, Bookmark, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animationClasses } from '@/hooks/optimizacion';
import { useHashtagSubscription } from '@/hooks/entidades/useHashtagSubscription';
import { PostFeed } from './PostFeed';

interface SavedTabContentProps {
  userId?: string | null;
}

export function SavedTabContent({ userId }: SavedTabContentProps) {
  const [activeSubTab, setActiveSubTab] = useState('tendencias');
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  
  const { subscriptions, isLoading: loadingSubscriptions, unfollowHashtag, isToggling } = useHashtagSubscription({ userId });

  // Filtros de búsqueda para el PostFeed cuando hay un hashtag seleccionado
  const searchFilters = selectedHashtag 
    ? { hashtags: [selectedHashtag], mentions: [] }
    : null;

  const handleClearFilter = () => {
    setSelectedHashtag(null);
  };

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
      <TabsList className="w-full grid grid-cols-2 h-auto gap-1 bg-muted/50 p-1 rounded-lg mb-4">
        <TabsTrigger
          value="tendencias"
          className="flex items-center justify-center gap-1.5 py-2 rounded-md text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <TrendingUp className="h-4 w-4 shrink-0" />
          <span>Tendencias</span>
        </TabsTrigger>
        <TabsTrigger
          value="feeds"
          className="flex items-center justify-center gap-1.5 py-2 rounded-md text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <Bookmark className="h-4 w-4 shrink-0" />
          <span>Feeds</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tendencias" className="mt-0">
        {loadingSubscriptions ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className={cn(
            "p-8 rounded-lg border-2 border-dashed border-border text-center",
            animationClasses.fadeIn
          )}>
            <Hash className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No sigues ninguna tendencia aún
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Explora y sigue hashtags para ver sus publicaciones aquí
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lista de hashtags seguidos */}
            {!selectedHashtag && (
              <div className={cn("space-y-2", animationClasses.fadeIn)}>
                <p className="text-sm text-muted-foreground mb-3">
                  Selecciona una tendencia para ver sus publicaciones
                </p>
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer border border-border/50"
                    onClick={() => setSelectedHashtag(sub.hashtag?.nombre || '')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Hash className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">#{sub.hashtag?.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.hashtag?.uso_count || 0} publicaciones
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sub.hashtag_id) unfollowHashtag(sub.hashtag_id);
                      }}
                      disabled={isToggling}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Feed del hashtag seleccionado */}
            {selectedHashtag && (
              <div className={animationClasses.fadeIn}>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary" className="gap-1 text-sm py-1.5 px-3">
                    <Hash className="h-4 w-4" />
                    {selectedHashtag}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilter}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Volver
                  </Button>
                </div>
                <PostFeed
                  userId={userId}
                  searchFilters={searchFilters}
                  onClearFilters={handleClearFilter}
                  emptyMessage={`No hay publicaciones con #${selectedHashtag}`}
                  placeholderCount={3}
                />
              </div>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="feeds" className="mt-0">
        <PostFeed 
          userId={userId} 
          placeholderCount={3} 
          savedOnly 
          emptyMessage="No tienes publicaciones guardadas"
        />
      </TabsContent>
    </Tabs>
  );
}
