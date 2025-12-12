/**
 * Feed de publicaciones con scroll infinito
 * Soporta filtros de media, posts guardados, destacados, bloqueos y búsqueda avanzada
 */
import { useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PostCard } from './PostCard';
import { animationClasses } from '@/hooks/optimizacion';
import { usePublicaciones } from '@/hooks/entidades/usePublicaciones';
import { useUserSavedPosts, useUserFeaturedPosts } from '@/hooks/entidades/useUserPublicaciones';
import { useUserBlocks } from '@/hooks/entidades/useUserBlocks';
import { useFilteredPosts, type SearchFilters } from '@/hooks/entidades';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, ArrowUp, Hash, AtSign, X } from 'lucide-react';

interface PostFeedProps {
  /** ID del usuario actual (para marcar likes/saves propios) */
  userId?: string | null;
  /** ID del autor para filtrar posts del perfil */
  authorId?: string | null;
  /** ID del usuario del perfil (para featured posts) */
  profileUserId?: string | null;
  placeholderCount?: number;
  /** Filtrar solo posts con imágenes/media */
  filterMedia?: boolean;
  /** Mostrar solo posts guardados del usuario */
  savedOnly?: boolean;
  /** Mostrar solo posts destacados del usuario */
  featuredOnly?: boolean;
  /** Mensaje personalizado para estado vacío */
  emptyMessage?: string;
  /** Filtros de búsqueda avanzada (hashtags y menciones) */
  searchFilters?: SearchFilters | null;
  /** Callback para limpiar filtros de búsqueda */
  onClearFilters?: () => void;
}

export function PostFeed({ 
  userId, 
  authorId,
  profileUserId,
  placeholderCount = 3, 
  filterMedia = false,
  savedOnly = false,
  featuredOnly = false,
  emptyMessage,
  searchFilters,
  onClearFilters,
}: PostFeedProps) {
  // Determinar si hay filtros de búsqueda activos
  const hasSearchFilters = searchFilters && (searchFilters.hashtags.length > 0 || searchFilters.mentions.length > 0);
  // Hook para obtener usuarios bloqueados
  const { blockedUserIds, blockingMeUserIds } = useUserBlocks({ currentUserId: userId });

  // Lista combinada de usuarios a excluir (yo los bloqueo + me bloquean)
  const excludedUserIds = useMemo(() => {
    return [...new Set([...blockedUserIds, ...blockingMeUserIds])];
  }, [blockedUserIds, blockingMeUserIds]);

  // Hook para posts normales - usa authorId para filtrar por autor
  const normalFeed = usePublicaciones({ userId, authorId, enabled: !savedOnly && !featuredOnly && !hasSearchFilters });
  
  // Hook para posts guardados
  const savedFeed = useUserSavedPosts(savedOnly ? userId || null : null, savedOnly);

  // Hook para posts destacados
  const featuredFeed = useUserFeaturedPosts(
    featuredOnly ? profileUserId || null : null,
    userId,
    featuredOnly
  );

  // Hook para posts filtrados por hashtags/menciones
  const filteredFeed = useFilteredPosts({
    filters: searchFilters || { hashtags: [], mentions: [] },
    currentUserId: userId,
    enabled: !!hasSearchFilters,
    limit: 50,
  });

  // Seleccionar el feed correcto
  const feed = hasSearchFilters 
    ? { 
        publicaciones: filteredFeed.posts.map(p => ({
          ...p,
          visibilidad: 'publico',
          updated_at: p.created_at,
          repost_of: null,
          repost_comentario: null,
          estado_id: null,
          activo: true,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          has_liked: false,
          has_saved: false,
          original_post: null,
          original_status: null,
        })),
        isLoading: filteredFeed.isLoading,
        isError: false,
        fetchNextPage: () => {},
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch: filteredFeed.refetch,
      }
    : featuredOnly 
      ? featuredFeed 
      : savedOnly 
        ? savedFeed 
        : normalFeed;
  
  const {
    publicaciones: rawPublicaciones,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = feed;

  // Props específicas del feed normal
  const newPostsCount = !savedOnly && !featuredOnly ? normalFeed.newPostsCount : 0;
  const loadNewPosts = !savedOnly && !featuredOnly ? normalFeed.loadNewPosts : () => {};

  // Filtrar por media y bloqueos
  const publicaciones = useMemo(() => {
    let filtered = rawPublicaciones;
    
    // Filtrar usuarios bloqueados (excluir posts de usuarios bloqueados)
    if (excludedUserIds.length > 0) {
      filtered = filtered.filter(p => {
        // Excluir si el autor está bloqueado
        if (p.user_id && excludedUserIds.includes(p.user_id)) return false;
        // Excluir si es repost de alguien bloqueado
        if (p.original_post?.author?.id && excludedUserIds.includes(p.original_post.author.id)) return false;
        return true;
      });
    }
    
    // Filtrar por media si es necesario
    if (filterMedia) {
      filtered = filtered.filter(p => p.imagenes && p.imagenes.length > 0);
    }
    
    return filtered;
  }, [rawPublicaciones, filterMedia, excludedUserIds]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer para scroll infinito
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Mensaje vacío por defecto según el tipo de feed
  const defaultEmptyMessage = hasSearchFilters
    ? 'No se encontraron publicaciones con estos filtros'
    : featuredOnly
      ? 'No hay publicaciones destacadas aún'
      : savedOnly 
        ? 'No tienes publicaciones guardadas'
        : filterMedia 
          ? 'No hay publicaciones con media'
          : 'No hay publicaciones aún. ¡Sé el primero en publicar!';

  // Componente de filtros activos
  const ActiveFiltersBar = () => {
    if (!hasSearchFilters) return null;
    
    return (
      <div className={cn(
        "mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20",
        animationClasses.fadeIn
      )}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtrando por:</span>
            {searchFilters?.hashtags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                <Hash className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
            {searchFilters?.mentions.map(mention => (
              <Badge key={mention} variant="secondary" className="gap-1">
                <AtSign className="h-3 w-3" />
                {mention}
              </Badge>
            ))}
          </div>
          {onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {publicaciones.length} {publicaciones.length === 1 ? 'publicación encontrada' : 'publicaciones encontradas'}
        </p>
      </div>
    );
  };

  // Estado de carga inicial
  if (isLoading) {
    return (
      <>
        <ActiveFiltersBar />
        <div className="space-y-4">
          {Array.from({ length: placeholderCount }).map((_, i) => (
            <PostCard key={i} index={i} isLoading />
          ))}
        </div>
      </>
    );
  }

  // Estado de error
  if (isError) {
    return (
      <>
        <ActiveFiltersBar />
        <div className={cn(
          "p-8 rounded-lg border border-border text-center",
          animationClasses.fadeIn
        )}>
          <p className="text-muted-foreground mb-4">
            Error al cargar las publicaciones
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </>
    );
  }

  // Estado vacío
  if (publicaciones.length === 0) {
    return (
      <>
        <ActiveFiltersBar />
        <div className={cn(
          "p-8 rounded-lg border-2 border-dashed border-border text-center",
          animationClasses.fadeIn
        )}>
          <p className="text-muted-foreground">
            {emptyMessage || defaultEmptyMessage}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Barra de filtros activos */}
      <ActiveFiltersBar />

      {/* Notificación de nuevas publicaciones (solo para feed normal sin filtros) */}
      {!savedOnly && !featuredOnly && !hasSearchFilters && newPostsCount > 0 && (
        <Button
          onClick={loadNewPosts}
          className={cn(
            "w-full mb-4 gap-2",
            animationClasses.fadeIn
          )}
          variant="secondary"
        >
          <ArrowUp className="h-4 w-4" />
          {newPostsCount === 1 
            ? '1 nueva publicación' 
            : `${newPostsCount} nuevas publicaciones`
          }
        </Button>
      )}

      {/* Lista de publicaciones */}
      <div className="space-y-4">
        {publicaciones.map((post, index) => (
          <PostCard 
            key={post.id} 
            post={post}
            index={index}
            currentUserId={userId}
            allPosts={publicaciones}
          />
        ))}
      </div>

      {/* Sentinel para scroll infinito */}
      <div ref={loadMoreRef} className="h-4" />

      {/* Indicador de carga de más */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Fin del feed */}
      {!hasNextPage && publicaciones.length > 0 && (
        <div className={cn(
          "py-8 text-center text-muted-foreground text-sm",
          animationClasses.fadeIn
        )}>
          Has llegado al final del feed
        </div>
      )}
    </>
  );
}
