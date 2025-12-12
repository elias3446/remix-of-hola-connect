/**
 * Vista de detalle de publicación
 * Componente completo que reemplaza PostDetailModal
 * Sigue el patrón de diseño de PostCard
 */
import { useState, useCallback, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import {
  animationClasses,
  transitionClasses,
  hoverClasses,
  useOptimizedComponent,
  useLazyLoad,
} from '@/hooks/optimizacion';
import {
  MessageCircle,
  Share2,
  MoreHorizontal,
  Bookmark,
  Heart,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Pencil,
  VolumeX,
  Volume2,
  Trash2,
  Link,
  Repeat2,
  Eye,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Publicacion } from '@/hooks/entidades/usePublicaciones';
import { usePublicacionDetail } from '@/hooks/entidades/usePublicacionDetail';
import { usePublicacionInteractions } from '@/hooks/controlador/usePublicacionInteractions';
import { useCommentsCount } from '@/hooks/controlador/useCommentsCount';
import { usePostViews, useRegisterPostView } from '@/hooks/controlador/usePostViews';
import { useMutedUsers } from '@/hooks/messages/useMutedUsers';
import { useEstados } from '@/hooks/estados';
import type { EstadoVisibilidad } from '@/hooks/estados/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareStatusModal, EmbeddedStatusCard } from '@/components/estados';
import { EmbeddedPostCard } from './EmbeddedPostCard';
import { CommentSection } from './CommentSection';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface PostDetailViewProps {
  postId?: string | null;
  post?: Publicacion | null;
  currentUserId?: string | null;
  onBack?: () => void;
  onPostUpdated?: () => void;
  isEmbedded?: boolean;
  // Navegación entre publicaciones
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  // Lista de publicaciones para navegación interna
  allPosts?: Publicacion[];
}

// Skeleton para estado de carga
function PostDetailSkeleton() {
  return (
    <div className={cn('space-y-4', animationClasses.fadeIn)}>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-5 w-4/5 mb-2" />
          <Skeleton className="h-5 w-3/5 mb-6" />
          <Skeleton className="w-full h-80 rounded-xl mb-6" />
          <div className="flex items-center justify-between py-4 border-t border-b border-border">
            <div className="flex items-center gap-6">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente principal
function PostDetailContent({
  post,
  currentUserId,
  onBack,
  onPostUpdated,
  isEmbedded = false,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  allPosts = [],
}: {
  post: Publicacion;
  currentUserId?: string | null;
  onBack?: () => void;
  onPostUpdated?: () => void;
  isEmbedded?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  allPosts?: Publicacion[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [embeddedPostId, setEmbeddedPostId] = useState<string | null>(null);

  // Soporte de navegación por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGalleryOpen || isShareModalOpen || embeddedPostId) return;
      
      if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        e.preventDefault();
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        e.preventDefault();
        onNext();
      } else if (e.key === 'Escape' && onBack) {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrevious, hasNext, onPrevious, onNext, onBack, isGalleryOpen, isShareModalOpen, embeddedPostId]);

  // Handler para abrir post embebido
  const handleOpenEmbeddedPost = useCallback((postId: string) => {
    setEmbeddedPostId(postId);
  }, []);

  // Optimización del componente
  useOptimizedComponent(
    { postId: post.id, currentUserId },
    { componentName: 'PostDetailContent' }
  );

  // Hook de interacciones (sin commentsCount, ahora es realtime separado)
  const {
    likesCount,
    sharesCount,
    hasLiked: isLiked,
    hasSaved: isSaved,
    toggleLike,
    toggleSave,
    incrementShares,
  } = usePublicacionInteractions(post.id, currentUserId, {
    likesCount: post.likes_count,
    commentsCount: post.comments_count,
    sharesCount: post.shares_count,
    hasLiked: post.has_liked,
    hasSaved: post.has_saved,
  });

  // Contador de comentarios en tiempo real (mismo patrón que PostCard)
  const { commentsCount } = useCommentsCount(post.id, post.comments_count);

  // Estados
  const { createEstado, isCreating: isCreatingEstado } = useEstados(currentUserId || undefined);
  const { isUserMuted, toggleMute } = useMutedUsers();

  // Sistema de vistas
  const { viewCount } = usePostViews(post.id, currentUserId);
  const { registerView } = useRegisterPostView(currentUserId);

  // Registrar vista al montar o cuando el usuario esté disponible
  useEffect(() => {
    if (post.id && currentUserId) {
      registerView(post.id);
    }
  }, [post.id, currentUserId, registerView]);

  const isOwnPost = currentUserId === post.user_id;
  const authorMuted = post.author?.id ? isUserMuted(post.author.id) : false;

  // Handlers
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      navigate('/red-social');
    }
  }, [navigate, onBack]);

  const handleLike = useCallback(() => {
    if (!currentUserId) return;
    registerView(post.id);
    toggleLike();
  }, [currentUserId, post.id, toggleLike, registerView]);

  const handleSave = useCallback(() => {
    if (!currentUserId) return;
    registerView(post.id);
    toggleSave();
  }, [currentUserId, post.id, toggleSave, registerView]);

  const handleOpenShare = useCallback(() => {
    registerView(post.id);
    setIsShareModalOpen(true);
  }, [post.id, registerView]);

  const handleToggleMute = useCallback(async () => {
    if (!post.author?.id || isOwnPost) return;
    await toggleMute(post.author.id);
  }, [post.author?.id, isOwnPost, toggleMute]);

  const openGallery = useCallback((index: number) => {
    setSelectedImageIndex(index);
    setIsGalleryOpen(true);
  }, []);

  const goToPrevious = useCallback(() => {
    if (post.imagenes) {
      setSelectedImageIndex((prev) =>
        prev === 0 ? post.imagenes!.length - 1 : prev - 1
      );
    }
  }, [post.imagenes]);

  const goToNext = useCallback(() => {
    if (post.imagenes) {
      setSelectedImageIndex((prev) =>
        prev === post.imagenes!.length - 1 ? 0 : prev + 1
      );
    }
  }, [post.imagenes]);

  const handleDownload = useCallback(async () => {
    if (!post.imagenes) return;
    const imageUrl = post.imagenes[selectedImageIndex];
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `imagen-${selectedImageIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando imagen:', error);
      toast.error('Error al descargar la imagen');
    }
  }, [post.imagenes, selectedImageIndex]);

  // Handler para compartir como estado
  const handleShareAsStatus = useCallback(
    async (_publicacionId: string, visibility: string, shareInMessages: boolean) => {
      if (!currentUserId) return;

      registerView(post.id);

      try {
        await createEstado({
          contenido: post.contenido || undefined,
          imagenes: post.imagenes || [],
          visibilidad: visibility as EstadoVisibilidad,
          compartido_en_mensajes: shareInMessages,
          compartido_en_social: true,
          publicacion_id: post.id,
        });

        await supabase.from('publicacion_compartidos').insert({
          publicacion_id: post.id,
          user_id: currentUserId,
          tipo_compartido: 'estado',
        });

        incrementShares();
        toast.success('Compartido como estado');
      } catch (error) {
        console.error('Error al compartir como estado:', error);
        toast.error('Error al compartir');
      }
    },
    [currentUserId, post, createEstado, registerView, incrementShares]
  );

  // Handler para compartir en perfil
  const handleShareToProfile = useCallback(
    async (_estadoId: string, comment: string, visibility: string) => {
      if (!currentUserId) return;

      registerView(post.id);

      try {
        const visibilityMap: Record<string, string> = {
          todos: 'publico',
          contactos: 'amigos',
          privado: 'privado',
        };

        const { error } = await supabase.from('publicaciones').insert({
          user_id: currentUserId,
          repost_of: post.id,
          repost_comentario: comment.trim() || null,
          visibilidad: visibilityMap[visibility] || 'publico',
          contenido: null,
          imagenes: null,
        });

        if (error) throw error;

        await supabase.from('publicacion_compartidos').insert({
          publicacion_id: post.id,
          user_id: currentUserId,
          tipo_compartido: 'perfil',
        });

        incrementShares();
        queryClient.invalidateQueries({ queryKey: ['publicaciones-feed'] });
        toast.success('Compartido en tu perfil');
      } catch (error) {
        console.error('Error al compartir en perfil:', error);
        toast.error('Error al compartir');
      }
    },
    [currentUserId, post.id, queryClient, registerView, incrementShares]
  );

  // Copiar enlace
  const handleCopyLink = useCallback(async () => {
    registerView(post.id);
    const postUrl = `${window.location.origin}/red-social?post=${post.id}`;

    try {
      await navigator.clipboard.writeText(postUrl);

      if (currentUserId) {
        await supabase.from('publicacion_compartidos').insert({
          publicacion_id: post.id,
          user_id: currentUserId,
          tipo_compartido: 'enlace',
        });
        incrementShares();
      }

      toast.success('Enlace copiado');
    } catch {
      toast.error('Error al copiar el enlace');
    }
  }, [post.id, registerView, currentUserId, incrementShares]);

  // Handler para compartir por mensaje
  const handleShareByMessage = useCallback(
    async (destinatarioId: string) => {
      if (!currentUserId) return;

      try {
        await supabase.from('publicacion_compartidos').insert({
          publicacion_id: post.id,
          user_id: currentUserId,
          destinatario_id: destinatarioId,
          tipo_compartido: 'mensaje',
        });
        incrementShares();
      } catch (error) {
        console.error('Error registrando compartición:', error);
      }
    },
    [currentUserId, post.id, incrementShares]
  );

  // Eliminar publicación
  const handleDeletePost = useCallback(async () => {
    if (!isOwnPost) return;

    try {
      const now = new Date().toISOString();

      await supabase
        .from('estados')
        .update({ activo: false })
        .eq('publicacion_id', post.id);

      const { error } = await supabase
        .from('publicaciones')
        .update({ activo: false, deleted_at: now })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Publicación eliminada');
      queryClient.invalidateQueries({ queryKey: ['publicaciones-feed'] });
      onPostUpdated?.();
      handleBack();
    } catch (error) {
      console.error('Error eliminando publicación:', error);
      toast.error('Error al eliminar');
    }
  }, [isOwnPost, post.id, queryClient, onPostUpdated, handleBack]);

  const formattedDate = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: es,
  });

  const fullDate = format(new Date(post.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", {
    locale: es,
  });

  // Renderizar contenido con hashtags y menciones
  const renderContent = (content: string | null) => {
    if (!content) return null;

    const parts = content.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span key={i} className="text-primary font-medium cursor-pointer hover:underline">
            {part}
          </span>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-primary font-medium cursor-pointer hover:underline">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const isRepost = !!post.repost_of && !!post.original_post;
  const originalPost = post.original_post;
  const isSharedStatus = !!post.estado_id && !!post.original_status;

  return (
    <div className={cn('space-y-4 overflow-x-hidden', animationClasses.fadeIn, 'relative')}>
      {/* Barra de navegación - solo mostrar si hay navegación entre posts */}
      {onPrevious && onNext && (
        <div className="flex items-center justify-end pb-2 border-b border-border gap-2 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className={cn(
                'h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9',
                transitionClasses.colors,
                hoverClasses.scale,
                !hasPrevious && 'opacity-40 cursor-not-allowed'
              )}
              aria-label="Publicación anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={onNext}
              disabled={!hasNext}
              className={cn(
                'h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9',
                transitionClasses.colors,
                hoverClasses.scale,
                !hasNext && 'opacity-40 cursor-not-allowed'
              )}
              aria-label="Publicación siguiente"
            >
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Card principal */}
      <Card className={cn('border-border/50 shadow-sm overflow-hidden', animationClasses.fadeIn)}>
        <CardContent className="p-0">
          {/* Imágenes principales */}
          {post.imagenes && post.imagenes.length > 0 && !isRepost && (
            <div className="relative bg-muted/50">
              <div
                className={cn(
                  'grid gap-0.5 cursor-pointer',
                  post.imagenes.length === 1 && 'grid-cols-1',
                  post.imagenes.length === 2 && 'grid-cols-2',
                  post.imagenes.length >= 3 && 'grid-cols-2'
                )}
              >
                {post.imagenes.slice(0, 4).map((imagen, index) => (
                  <div
                    key={index}
                    onClick={() => openGallery(index)}
                    className={cn(
                      'relative bg-muted hover:opacity-95 transition-opacity overflow-hidden',
                      hoverClasses.scale,
                      post.imagenes!.length === 1 && 'aspect-video max-h-[500px]',
                      post.imagenes!.length === 2 && 'aspect-square',
                      post.imagenes!.length >= 3 && index === 0 && 'row-span-2 aspect-square',
                      post.imagenes!.length >= 3 && index > 0 && 'aspect-square'
                    )}
                  >
                    <img
                      src={imagen}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {post.imagenes!.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <span className="text-2xl font-bold text-foreground">
                          +{post.imagenes!.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 sm:p-4 md:p-6">
            {/* Indicador de repost */}
            {(isRepost || isSharedStatus) && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                <Repeat2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">
                  {post.author?.name || 'Usuario'}{' '}
                  {isSharedStatus ? 'compartió un estado' : 'compartió'}
                </span>
              </div>
            )}

            {/* Header del autor */}
            <div className="flex items-start justify-between mb-4 sm:mb-6 gap-2 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                <Avatar className={cn('w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 border-2 border-primary/20 shrink-0', transitionClasses.colors)}>
                  <AvatarImage src={post.author?.avatar || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm sm:text-base md:text-lg">
                    {post.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm sm:text-base md:text-lg leading-tight truncate">
                    {post.author?.name || 'Usuario'}
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                    {post.author?.username && (
                      <span className="truncate max-w-[100px] sm:max-w-none">@{post.author.username}</span>
                    )}
                    {post.author?.username && <span>·</span>}
                    <span className="whitespace-nowrap" title={fullDate}>{formattedDate}</span>
                  </div>
                </div>
              </div>

              {/* Menú de opciones */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-10 w-10 text-muted-foreground hover:text-foreground', transitionClasses.colors)}
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={handleSave}>
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="h-4 w-4 mr-2" />
                        Quitar de guardados
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4 w-4 mr-2" />
                        Guardar publicación
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Link className="h-4 w-4 mr-2" />
                    Copiar enlace
                  </DropdownMenuItem>
                  {!isOwnPost && post.author?.id && (
                    <DropdownMenuItem onClick={handleToggleMute}>
                      {authorMuted ? (
                        <>
                          <Volume2 className="h-4 w-4 mr-2" />
                          Dejar de silenciar
                        </>
                      ) : (
                        <>
                          <VolumeX className="h-4 w-4 mr-2" />
                          Silenciar usuario
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  {isOwnPost && (
                    <DropdownMenuItem
                      onClick={handleDeletePost}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar publicación
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Contenido */}
            {post.contenido && (
              <p className="text-foreground text-sm sm:text-base leading-relaxed mb-4 sm:mb-6 whitespace-pre-wrap break-words overflow-hidden">
                {renderContent(post.contenido)}
              </p>
            )}

            {/* Comentario de repost */}
            {isRepost && post.repost_comentario && (
              <p className="text-foreground text-sm sm:text-base leading-relaxed mb-4 sm:mb-6 whitespace-pre-wrap break-words overflow-hidden">
                {renderContent(post.repost_comentario)}
              </p>
            )}

            {/* Post original embebido */}
            {isRepost && originalPost && !isSharedStatus && (
              <EmbeddedPostCard
                contenido={originalPost.contenido}
                imagenes={originalPost.imagenes}
                createdAt={originalPost.created_at}
                author={originalPost.author}
                className="mb-6"
                onClick={() => handleOpenEmbeddedPost(originalPost.id)}
              />
            )}

            {/* Estado original embebido */}
            {isSharedStatus && post.original_status && (
              <EmbeddedStatusCard
                contenido={post.original_status.contenido}
                imagenes={post.original_status.imagenes}
                createdAt={post.original_status.created_at}
                author={post.original_status.author}
                className="mb-6"
              />
            )}

            {/* Estadísticas */}
            <div className="flex items-center justify-between py-3 sm:py-4 border-t border-b border-border/50 gap-2">
              <div className="flex items-center gap-3 sm:gap-4 md:gap-6 flex-wrap">
                {/* Like */}
                <button
                  onClick={handleLike}
                  disabled={!currentUserId}
                  className={cn(
                    'flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50',
                    transitionClasses.colors,
                    isLiked && 'text-red-500'
                  )}
                >
                  <Heart className={cn('h-4 w-4 sm:h-5 sm:w-5', isLiked && 'fill-current')} />
                  <span className="text-xs sm:text-sm font-medium">{likesCount}</span>
                </button>

                {/* Comentarios */}
                <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm font-medium">{commentsCount}</span>
                </div>

                {/* Compartir */}
                <button
                  onClick={handleOpenShare}
                  className={cn(
                    'flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-primary transition-colors',
                    transitionClasses.colors
                  )}
                >
                  <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm font-medium">{sharesCount}</span>
                </button>

                {/* Guardar */}
                <button
                  onClick={handleSave}
                  disabled={!currentUserId}
                  className={cn(
                    'flex items-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-50',
                    transitionClasses.colors,
                    isSaved && 'text-primary'
                  )}
                >
                  {isSaved ? (
                    <BookmarkCheck className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                  ) : (
                    <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>

              {/* Vistas */}
              <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground shrink-0">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">{viewCount}</span>
              </div>
            </div>

            {/* Sección de comentarios */}
            <div className="pt-4 sm:pt-6">
              <h3 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">
                Comentarios ({commentsCount})
              </h3>
              <CommentSection
                publicacionId={post.id}
                currentUserId={currentUserId}
                currentUserAvatar={post.author?.avatar}
                currentUserName={post.author?.name}
                initialCommentsCount={commentsCount}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de compartir */}
      <ShareStatusModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        estadoId={post.id}
        statusContent={post.contenido || ''}
        statusImage={post.imagenes?.[0]}
        contentType="post"
        onShareAsStatus={handleShareAsStatus}
        onShareToProfile={handleShareToProfile}
        onShareByMessage={handleShareByMessage}
      />

      {/* Galería de imágenes */}
      {post.imagenes && post.imagenes.length > 0 && (
        <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
          <DialogContent className="max-w-5xl p-0">
            <div className="relative bg-black rounded-lg">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-white">
                    Imagen {selectedImageIndex + 1} de {post.imagenes.length}
                  </DialogTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsGalleryOpen(false)}
                    className={cn('text-white hover:bg-white/20', transitionClasses.button)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Imagen */}
              <div
                className={cn(
                  'relative flex items-center justify-center min-h-[70vh] p-16',
                  animationClasses.scaleIn
                )}
              >
                <img
                  src={post.imagenes[selectedImageIndex]}
                  alt={`Imagen ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>

              {/* Navegación */}
              {post.imagenes.length > 1 && (
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={goToPrevious}
                    className={cn(
                      'pointer-events-auto h-12 w-12 rounded-full bg-white/90 hover:bg-white',
                      transitionClasses.button
                    )}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={goToNext}
                    className={cn(
                      'pointer-events-auto h-12 w-12 rounded-full bg-white/90 hover:bg-white',
                      transitionClasses.button
                    )}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              )}

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-center gap-4">
                  {/* Indicadores */}
                  {post.imagenes.length > 1 && (
                    <div className="flex gap-1.5">
                      {post.imagenes.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={cn(
                            'w-2 h-2 rounded-full transition-all',
                            idx === selectedImageIndex
                              ? 'bg-white w-4'
                              : 'bg-white/50 hover:bg-white/80'
                          )}
                        />
                      ))}
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    onClick={handleDownload}
                    className={transitionClasses.button}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog para post embebido */}
      {embeddedPostId && (
        <Dialog open={!!embeddedPostId} onOpenChange={(open) => !open && setEmbeddedPostId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
            <DialogTitle className="sr-only">Detalle de publicación original</DialogTitle>
            <ScrollArea className="max-h-[90vh]">
              <div className="p-4">
                <PostDetailView
                  postId={embeddedPostId}
                  currentUserId={currentUserId}
                  onBack={() => setEmbeddedPostId(null)}
                  onPostUpdated={onPostUpdated}
                  isEmbedded
                  allPosts={allPosts}
                />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Componente exportado con carga de datos
export const PostDetailView = memo(function PostDetailView({
  postId,
  post: externalPost,
  currentUserId,
  onBack,
  onPostUpdated,
  isEmbedded = false,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: PostDetailViewProps) {
  // Si se pasa el post directamente, usarlo
  // Si no, cargar por ID
  const {
    data: loadedPost,
    isLoading,
    isError,
  } = usePublicacionDetail({
    publicacionId: externalPost ? null : postId,
    userId: currentUserId,
    enabled: !externalPost && !!postId,
  });

  const post = externalPost || loadedPost;

  if (isLoading) {
    return <PostDetailSkeleton />;
  }

  if (isError || !post) {
    return (
      <div className={cn('space-y-4', animationClasses.fadeIn)}>
        {!isEmbedded && (
          <EntityPageHeader
            title="Publicación no encontrada"
            description="Esta publicación no existe o fue eliminada"
            icon={FileText}
            entityKey="publicaciones"
            showBack
            backButtonText="Volver"
            onBackClick={onBack}
            showCreate={false}
            showBulkUpload={false}
          />
        )}
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No se pudo cargar la publicación
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PostDetailContent
      post={post}
      currentUserId={currentUserId}
      onBack={onBack}
      onPostUpdated={onPostUpdated}
      isEmbedded={isEmbedded}
      onPrevious={onPrevious}
      onNext={onNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      allPosts={[]}
    />
  );
});
