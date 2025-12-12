/**
 * Componente de búsqueda avanzada con Hashtags y Menciones
 * Comportamiento similar a Facebook/Twitter con sugerencias en tiempo real
 * Los resultados se muestran en el PostFeed principal
 */
import { useState, useCallback } from 'react';
import { Search, Hash, AtSign, X, TrendingUp, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useHashtagSearch, useMentionSearch, type SearchFilters } from '@/hooks/entidades';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdvancedSearchCardProps {
  onFiltersChange?: (filters: SearchFilters | null) => void;
  currentUserId?: string | null;
  className?: string;
  defaultOpen?: boolean;
}

export function AdvancedSearchCard({ 
  onFiltersChange,
  currentUserId,
  className,
  defaultOpen = false,
}: AdvancedSearchCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'hashtags' | 'mentions'>('hashtags');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);

  // Hooks de búsqueda
  const hashtagSearch = useHashtagSearch({ 
    currentUserId, 
    showTrending: true,
    limit: 15,
  });
  
  const mentionSearch = useMentionSearch({ 
    currentUserId,
    excludeCurrentUser: true,
    limit: 10,
  });

  const hasFilters = selectedHashtags.length > 0 || selectedMentions.length > 0;

  // Notificar cambios de filtros
  const notifyFiltersChange = useCallback((hashtags: string[], mentions: string[]) => {
    if (hashtags.length === 0 && mentions.length === 0) {
      onFiltersChange?.(null);
    } else {
      onFiltersChange?.({ hashtags, mentions });
    }
  }, [onFiltersChange]);

  const addHashtag = useCallback((hashtag: string) => {
    const cleanTag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
    const normalizedTag = cleanTag.toLowerCase().trim();
    
    if (normalizedTag && !selectedHashtags.includes(normalizedTag)) {
      const newHashtags = [...selectedHashtags, normalizedTag];
      setSelectedHashtags(newHashtags);
      hashtagSearch.clearSearch();
      notifyFiltersChange(newHashtags, selectedMentions);
    }
  }, [selectedHashtags, selectedMentions, hashtagSearch, notifyFiltersChange]);

  const removeHashtag = useCallback((hashtag: string) => {
    const newHashtags = selectedHashtags.filter(h => h !== hashtag);
    setSelectedHashtags(newHashtags);
    notifyFiltersChange(newHashtags, selectedMentions);
  }, [selectedHashtags, selectedMentions, notifyFiltersChange]);

  const addMention = useCallback((mention: string) => {
    const cleanMention = mention.startsWith('@') ? mention.slice(1) : mention;
    const normalizedMention = cleanMention.toLowerCase().trim();
    
    if (normalizedMention && !selectedMentions.includes(normalizedMention)) {
      const newMentions = [...selectedMentions, normalizedMention];
      setSelectedMentions(newMentions);
      mentionSearch.clearSearch();
      notifyFiltersChange(selectedHashtags, newMentions);
    }
  }, [selectedHashtags, selectedMentions, mentionSearch, notifyFiltersChange]);

  const removeMention = useCallback((mention: string) => {
    const newMentions = selectedMentions.filter(m => m !== mention);
    setSelectedMentions(newMentions);
    notifyFiltersChange(selectedHashtags, newMentions);
  }, [selectedHashtags, selectedMentions, notifyFiltersChange]);

  const clearAll = useCallback(() => {
    setSelectedHashtags([]);
    setSelectedMentions([]);
    hashtagSearch.clearSearch();
    mentionSearch.clearSearch();
    onFiltersChange?.(null);
  }, [hashtagSearch, mentionSearch, onFiltersChange]);

  const handleHashtagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = hashtagSearch.searchTerm.trim();
      if (value) {
        addHashtag(value);
      }
    }
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (mentionSearch.mentions.length > 0) {
        const first = mentionSearch.mentions[0];
        addMention(first.username || first.name || first.id);
      }
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className={cn("w-full overflow-hidden", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className={cn(
            "cursor-pointer transition-colors py-3 px-4",
            "hover:bg-secondary/30",
            hasFilters && "bg-primary/5"
          )}>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Search className="h-4 w-4 shrink-0" />
                <span>Búsqueda Avanzada</span>
                {hasFilters && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {selectedHashtags.length + selectedMentions.length} filtros
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'hashtags' | 'mentions')}>
              <TabsList className="grid w-full grid-cols-2 mb-4 h-9">
                <TabsTrigger value="hashtags" className="gap-1.5 text-xs">
                  <Hash className="h-3.5 w-3.5" />
                  Hashtags
                  {selectedHashtags.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      {selectedHashtags.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="mentions" className="gap-1.5 text-xs">
                  <AtSign className="h-3.5 w-3.5" />
                  Menciones
                  {selectedMentions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      {selectedMentions.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* HASHTAGS TAB */}
              <TabsContent value="hashtags" className="space-y-3 mt-0">
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar hashtag..."
                    value={hashtagSearch.searchTerm}
                    onChange={(e) => hashtagSearch.setSearchTerm(e.target.value)}
                    onKeyDown={handleHashtagKeyDown}
                    className="pl-9 pr-8"
                  />
                  {hashtagSearch.isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {selectedHashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHashtags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="default" 
                        className={cn(
                          "gap-1 pr-1 bg-primary/90 hover:bg-primary",
                          animationClasses.fadeIn
                        )}
                      >
                        #{tag}
                        <button
                          onClick={() => removeHashtag(tag)}
                          className="ml-1 rounded-full hover:bg-white/20 p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <ScrollArea className="max-h-48">
                  <div className="space-y-1">
                    {hashtagSearch.hashtags.length > 0 && (
                      <>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                          <TrendingUp className="h-3 w-3" />
                          {hashtagSearch.cleanSearch ? 'Resultados' : 'Populares'}
                        </p>
                        <div className="space-y-1">
                          {hashtagSearch.hashtags.map((hashtag) => (
                            <button
                              key={hashtag.id}
                              onClick={() => addHashtag(hashtag.nombre)}
                              disabled={selectedHashtags.includes(hashtag.nombre.toLowerCase())}
                              className={cn(
                                "w-full flex items-center justify-between p-2 rounded-lg text-left text-sm",
                                "hover:bg-secondary/80 transition-colors",
                                selectedHashtags.includes(hashtag.nombre.toLowerCase()) && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <span className="font-medium">#{hashtag.nombre}</span>
                              <span className="text-xs text-muted-foreground">
                                {hashtag.uso_count.toLocaleString()} usos
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* MENTIONS TAB */}
              <TabsContent value="mentions" className="space-y-3 mt-0">
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuario..."
                    value={mentionSearch.searchTerm}
                    onChange={(e) => mentionSearch.setSearchTerm(e.target.value)}
                    onKeyDown={handleMentionKeyDown}
                    className="pl-9 pr-8"
                  />
                  {mentionSearch.isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {selectedMentions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMentions.map((mention) => (
                      <Badge 
                        key={mention} 
                        variant="default" 
                        className={cn(
                          "gap-1 pr-1 bg-primary/90 hover:bg-primary",
                          animationClasses.fadeIn
                        )}
                      >
                        @{mention}
                        <button
                          onClick={() => removeMention(mention)}
                          className="ml-1 rounded-full hover:bg-white/20 p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <ScrollArea className="max-h-48">
                  {mentionSearch.searchTerm.length < 1 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Escribe al menos 1 carácter para buscar usuarios
                    </p>
                  ) : mentionSearch.mentions.length === 0 && !mentionSearch.isLoading ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No se encontraron usuarios
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {mentionSearch.mentions.map((user) => {
                        const isSelected = selectedMentions.includes((user.username || '').toLowerCase());
                        return (
                          <button
                            key={user.id}
                            onClick={() => addMention(user.username || user.name || user.id)}
                            disabled={isSelected}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-lg text-left",
                              "hover:bg-secondary/80 transition-colors",
                              isSelected && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar || undefined} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {user.name || 'Usuario'}
                              </p>
                              {user.username && (
                                <p className="text-xs text-muted-foreground">
                                  @{user.username}
                                  {user.isFollowing && (
                                    <span className="ml-1 text-primary">• Siguiendo</span>
                                  )}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Botón de limpiar */}
            {hasFilters && (
              <div className={cn(
                "pt-3 mt-3 border-t border-border",
                transitionClasses.colors
              )}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="w-full text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
