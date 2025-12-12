/**
 * Componente para mostrar publicaciones/estados compartidos en mensajes
 * Abre el StatusViewer para estados y PostDetailView para publicaciones con navegación secuencial
 */
import { useState, useEffect, useMemo } from 'react';
import { Clock, Image as ImageIcon, Eye, Repeat2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { transitionClasses, animationClasses } from '@/hooks/optimizacion';
import { StatusViewer } from '@/components/estados/StatusViewer';
import { PostDetailView } from '@/components/redsocial/PostDetailView';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { UserEstadoGroup, EstadoExtendido } from '@/hooks/estados/types';
import { supabase } from '@/integrations/supabase/client';

export interface SharedPostData {
  type?: 'status' | 'post';
  estadoId?: string;
  postId?: string;
  content?: string;
  image?: string;
  images?: string[];
  sharedAt?: string;
  sharedBy?: {
    id?: string;
    name?: string | null;
    avatar?: string | null;
    username?: string | null;
  };
  // Campos alternativos para compatibilidad
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  // Flags para contenido eliminado
  deleted?: boolean;
  deleted_at?: string;
}

interface SharedPostCardProps {
  data: SharedPostData;
  isOwn?: boolean;
  className?: string;
  /** Todos los estados/publicaciones compartidos del mismo usuario para navegación secuencial */
  allSharedPosts?: SharedPostData[];
  /** Índice inicial en allSharedPosts (para abrir en el estado correcto) */
  initialIndex?: number;
  /** ID del usuario actual para interacciones */
  currentUserId?: string;
}

export function SharedPostCard({ 
  data, 
  isOwn = false, 
  className,
  allSharedPosts,
  initialIndex = 0,
  currentUserId,
}: SharedPostCardProps) {
  const [showViewer, setShowViewer] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [currentPostIndex, setCurrentPostIndex] = useState(initialIndex);
  // Estado para cuando un post contiene un estado (estado_id)
  const [postHasEstado, setPostHasEstado] = useState<{
    estadoId: string;
    contenido: string | null;
    imagenes: string[] | null;
    author: { id: string; name: string | null; avatar: string | null; username: string | null } | null;
    createdAt: string;
  } | null>(null);
  const [showEmbeddedStatusViewer, setShowEmbeddedStatusViewer] = useState(false);

  // Normalizar datos
  const contentType = data.type || 'post';
  const contentText = data.content || data.description || data.title || '';
  const contentImage = data.image || data.imageUrl || '';
  const contentImages = data.images || (contentImage ? [contentImage] : []);
  const authorName = data.sharedBy?.name || 'Usuario';
  const authorAvatar = data.sharedBy?.avatar || '';
  const authorUsername = data.sharedBy?.username || '';
  const authorId = data.sharedBy?.id || '';
  const authorInitials = authorName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const isStatus = contentType === 'status';
  const hasContent = contentText || contentImage;

  // Determinar si es visualizable (estados se abren en visor, URLs externas se abren en navegador)
  const isViewable = !!(data.estadoId || data.postId);
  const hasExternalUrl = !!data.url;

  // Verificar si el post tiene un estado embebido cuando se abre el diálogo
  useEffect(() => {
    if (showPostDialog && data.postId) {
      // Consultar si el post tiene estado_id
      const checkPostForEstado = async () => {
        const { data: postData } = await supabase
          .from('publicaciones')
          .select(`
            estado_id,
            estados:estados!publicaciones_estado_id_fkey(
              id,
              contenido,
              imagenes,
              created_at,
              author:profiles!estados_user_id_fkey(
                id,
                name,
                avatar,
                username
              )
            )
          `)
          .eq('id', data.postId)
          .maybeSingle();
        
        if (postData?.estado_id && postData.estados) {
          const estado = postData.estados as any;
          setPostHasEstado({
            estadoId: estado.id,
            contenido: estado.contenido,
            imagenes: estado.imagenes,
            author: Array.isArray(estado.author) ? estado.author[0] : estado.author,
            createdAt: estado.created_at,
          });
          // Cerrar el diálogo de post y abrir el visor de estado
          setShowPostDialog(false);
          setShowEmbeddedStatusViewer(true);
        }
      };
      checkPostForEstado();
    }
  }, [showPostDialog, data.postId]);

  // Usar todos los posts compartidos o solo el actual
  const postsToShow = allSharedPosts && allSharedPosts.length > 0 ? allSharedPosts : [data];
  
  // Filtrar solo posts (no estados) para navegación de PostDetailView
  const sharedPostsOnly = useMemo(() => {
    return postsToShow.filter(p => (p.type || 'post') === 'post' && p.postId);
  }, [postsToShow]);
  
  // Obtener el post actual para mostrar en el viewer
  const currentSharedPost = sharedPostsOnly[currentPostIndex] || data;
  
  // Navegación entre posts
  const handlePreviousPost = () => {
    if (currentPostIndex > 0) {
      setCurrentPostIndex(currentPostIndex - 1);
    }
  };
  
  const handleNextPost = () => {
    if (currentPostIndex < sharedPostsOnly.length - 1) {
      setCurrentPostIndex(currentPostIndex + 1);
    }
  };
  
  const hasPreviousPost = currentPostIndex > 0;
  const hasNextPost = currentPostIndex < sharedPostsOnly.length - 1;

  // Crear estructura de estado para el visor con todos los estados
  const createEstadoGroup = (): UserEstadoGroup[] => {
    const estados: EstadoExtendido[] = postsToShow.map((post) => {
      const postText = post.content || post.description || post.title || '';
      const postImage = post.image || post.imageUrl || '';
      const postImages = post.images || (postImage ? [postImage] : []);
      const postAuthorId = post.sharedBy?.id || '';
      const postAuthorName = post.sharedBy?.name || 'Usuario';
      const postAuthorAvatar = post.sharedBy?.avatar || '';
      const postAuthorUsername = post.sharedBy?.username || '';

      return {
        id: post.estadoId || post.postId || `shared-content-${Math.random()}`,
        user_id: postAuthorId,
        contenido: postText,
        imagenes: postImages,
        tipo: postImages.length > 0 ? 'imagen' : 'texto',
        compartido_en_mensajes: true,
        compartido_en_social: false,
        visibilidad: 'todos',
        vistas: null,
        created_at: post.sharedAt || new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        activo: true,
        publicacion_id: null,
        user: {
          id: postAuthorId,
          name: postAuthorName,
          avatar: postAuthorAvatar,
          username: postAuthorUsername,
        },
      };
    });

    // Agrupar por usuario
    const userGroups: Record<string, UserEstadoGroup> = {};
    
    estados.forEach((estado) => {
      const userId = estado.user_id;
      if (!userGroups[userId]) {
        userGroups[userId] = {
          user_id: userId,
          user: estado.user!,
          estados: [],
          total_count: 0,
          has_unviewed: false,
          latest_created_at: estado.created_at,
        };
      }
      userGroups[userId].estados.push(estado);
      userGroups[userId].total_count = userGroups[userId].estados.length;
    });

    return Object.values(userGroups);
  };

  // Crear grupo de estado para cuando un post contiene un estado embebido
  const createEmbeddedEstadoGroup = (): UserEstadoGroup[] => {
    if (!postHasEstado) return [];
    
    const estado: EstadoExtendido = {
      id: postHasEstado.estadoId,
      user_id: postHasEstado.author?.id || '',
      contenido: postHasEstado.contenido,
      imagenes: postHasEstado.imagenes,
      tipo: postHasEstado.imagenes && postHasEstado.imagenes.length > 0 ? 'imagen' : 'texto',
      compartido_en_mensajes: true,
      compartido_en_social: false,
      visibilidad: 'todos',
      vistas: null,
      created_at: postHasEstado.createdAt,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      activo: true,
      publicacion_id: null,
      user: {
        id: postHasEstado.author?.id || '',
        name: postHasEstado.author?.name || 'Usuario',
        avatar: postHasEstado.author?.avatar || null,
        username: postHasEstado.author?.username || null,
      },
    };

    return [{
      user_id: estado.user_id,
      user: estado.user!,
      estados: [estado],
      total_count: 1,
      has_unviewed: false,
      latest_created_at: estado.created_at,
    }];
  };

  // Calcular el índice correcto basado en initialIndex
  const getInitialIndices = () => {
    if (!allSharedPosts || allSharedPosts.length <= 1) {
      return { userIndex: 0, statusIndex: 0 };
    }
    
    const groups = createEstadoGroup();
    let statusCounter = 0;
    
    for (let userIdx = 0; userIdx < groups.length; userIdx++) {
      for (let statusIdx = 0; statusIdx < groups[userIdx].estados.length; statusIdx++) {
        if (statusCounter === initialIndex) {
          return { userIndex: userIdx, statusIndex: statusIdx };
        }
        statusCounter++;
      }
    }
    
    return { userIndex: 0, statusIndex: 0 };
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasExternalUrl && data.url) {
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } else if (isViewable) {
      // Usar visor de estado solo para estados, diálogo simple para posts
      if (isStatus) {
        setShowViewer(true);
      } else {
        setShowPostDialog(true);
      }
    }
  };

  if (!hasContent && !data.sharedBy && !data.deleted) {
    return null;
  }

  // Si el contenido fue eliminado, mostrar mensaje especial
  if (data.deleted) {
    return (
      <div
        className={cn(
          "rounded-lg border box-border overflow-hidden",
          "w-full p-3",
          isOwn ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-muted/30 border-border",
          className
        )}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 opacity-50" />
          <span className="text-xs italic">
            {contentType === 'status' ? 'Estado eliminado' : 'Publicación eliminada'}
          </span>
        </div>
      </div>
    );
  }

  const isClickable = isViewable || hasExternalUrl;

  // Renderizar contenido con hashtags y menciones resaltados (para posts)
  const renderContent = (content: string | null) => {
    if (!content) return null;
    
    const parts = content.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith('#') || part.startsWith('@')) {
        return (
          <span key={i} className="text-primary font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const timeAgo = data.sharedAt ? formatDistanceToNow(new Date(data.sharedAt), {
    addSuffix: true,
    locale: es,
  }) : '';

  // =================== RENDERIZADO PARA POSTS (ESTILO REPOST) ===================
  if (!isStatus) {
    return (
      <>
        <Card 
          className={cn(
            "border overflow-hidden cursor-pointer",
            isOwn 
              ? "border-primary-foreground/30 bg-primary-foreground/5" 
              : "border-border/70 bg-muted/30",
            transitionClasses.colors,
            "hover:opacity-90 active:scale-[0.98]",
            className
          )}
          onClick={isClickable ? handleClick : undefined}
        >
          <CardContent className="p-3">
            {/* Header con avatar y info */}
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={authorAvatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className={cn(
                    "text-xs font-medium truncate",
                    isOwn ? "text-primary-foreground" : "text-foreground"
                  )}>
                    {authorName}
                  </p>
                  {authorUsername && (
                    <span className={cn(
                      "text-[10px] truncate",
                      isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}>
                      @{authorUsername}
                    </span>
                  )}
                </div>
                {timeAgo && (
                  <p className={cn(
                    "text-[10px]",
                    isOwn ? "text-primary-foreground/50" : "text-muted-foreground"
                  )}>
                    {timeAgo}
                  </p>
                )}
              </div>
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px]",
                isOwn ? "bg-primary-foreground/10 text-primary-foreground/70" : "bg-muted text-muted-foreground"
              )}>
                <Repeat2 className="h-2.5 w-2.5" />
                <span>Feed</span>
              </div>
            </div>

            {/* Contenido de texto */}
            {contentText && (
              <p className={cn(
                "text-xs mb-2 line-clamp-3 whitespace-pre-wrap",
                isOwn ? "text-primary-foreground/90" : "text-foreground"
              )}>
                {renderContent(contentText)}
              </p>
            )}

            {/* Imágenes */}
            {contentImages && contentImages.length > 0 && (
              <div className={cn(
                "grid gap-1 rounded-md overflow-hidden",
                contentImages.length === 1 && "grid-cols-1",
                contentImages.length >= 2 && "grid-cols-2"
              )}>
                {contentImages.slice(0, 4).map((imagen, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "relative bg-muted",
                      contentImages.length === 1 && "aspect-video",
                      contentImages.length >= 2 && "aspect-square"
                    )}
                  >
                    <img 
                      src={imagen} 
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {contentImages.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <span className="text-sm font-bold text-foreground">
                          +{contentImages.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Sin contenido - mostrar mensaje de publicación compartida en lugar de "sin contenido" */}
            {!contentText && (!contentImages || contentImages.length === 0) && (
              <p className={cn(
                "text-xs",
                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                Publicación compartida
              </p>
            )}

            {/* Indicador de acción */}
            {isClickable && (
              <p className={cn(
                "text-[9px] mt-2 opacity-60",
                isOwn ? "text-primary-foreground" : "text-muted-foreground"
              )}>
                Toca para ver completo
              </p>
            )}
          </CardContent>
        </Card>

        {/* Diálogo para ver el post completo con PostDetailView */}
        <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
            <DialogTitle className="sr-only">Detalle de publicación compartida</DialogTitle>
            <ScrollArea className="max-h-[90vh]">
              <div className="p-4">
                <PostDetailView
                  postId={currentSharedPost?.postId}
                  currentUserId={currentUserId}
                  onBack={() => setShowPostDialog(false)}
                  isEmbedded
                  onPrevious={sharedPostsOnly.length > 1 ? handlePreviousPost : undefined}
                  onNext={sharedPostsOnly.length > 1 ? handleNextPost : undefined}
                  hasPrevious={hasPreviousPost}
                  hasNext={hasNextPost}
                />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Visor de estado para posts que contienen estados embebidos */}
        {showEmbeddedStatusViewer && postHasEstado && (
          <SharedPostViewer
            isOpen={showEmbeddedStatusViewer}
            userGroups={createEmbeddedEstadoGroup()}
            initialUserIndex={0}
            initialStatusIndex={0}
            onClose={() => {
              setShowEmbeddedStatusViewer(false);
              setPostHasEstado(null);
            }}
          />
        )}
      </>
    );
  }

  // =================== RENDERIZADO PARA ESTADOS (ESTILO STORY) ===================
  return (
    <>
      <div
        onClick={isClickable ? handleClick : undefined}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => e.key === 'Enter' && handleClick(e as any) : undefined}
        className={cn(
          "rounded-lg border box-border overflow-hidden",
          "w-full",
          isOwn ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-background border-border",
          isClickable && "cursor-pointer hover:opacity-90 active:scale-[0.98]",
          transitionClasses.colors,
          className
        )}
      >
        {/* Header con tipo de contenido */}
        <div className={cn(
          "flex items-center justify-between gap-1 px-2 py-1 text-[9px] uppercase tracking-wide",
          isOwn ? "text-primary-foreground/70 bg-primary-foreground/5" : "text-muted-foreground bg-muted/50"
        )}>
          <div className="flex items-center gap-1 min-w-0">
            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
            <span className="truncate">Estado</span>
          </div>
          {isClickable && (
            <Eye className="h-2.5 w-2.5 flex-shrink-0 opacity-60" />
          )}
        </div>

        {/* Contenido principal */}
        <div className="p-2">
          {/* Autor */}
          {data.sharedBy && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <Avatar className="h-5 w-5 flex-shrink-0">
                <AvatarImage src={authorAvatar} />
                <AvatarFallback className="text-[8px] bg-muted">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[11px] font-medium truncate",
                  isOwn ? "text-primary-foreground" : "text-foreground"
                )}>
                  {authorName}
                </p>
              </div>
            </div>
          )}

          {/* Imagen del contenido */}
          {contentImage && (
            <div className="mb-1.5 rounded overflow-hidden bg-muted/30">
              <img
                src={contentImage}
                alt="Contenido compartido"
                className="w-full h-24 object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Texto del contenido */}
          {contentText && (
            <p className={cn(
              "text-xs line-clamp-2 break-words overflow-hidden",
              isOwn ? "text-primary-foreground/90" : "text-foreground/90"
            )}>
              {contentText}
            </p>
          )}

          {/* Fallback si no hay contenido */}
          {!contentText && !contentImage && (
            <p className={cn(
              "text-xs italic",
              isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
            )}>
              Sin contenido
            </p>
          )}

          {/* Indicador de acción */}
          {isClickable && (
            <p className={cn(
              "text-[9px] mt-1.5 opacity-70",
              isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
            )}>
              Toca para ver {postsToShow.length > 1 ? `(${postsToShow.length})` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Visor de estado con navegación */}
      {showViewer && (
        <SharedPostViewer
          isOpen={showViewer}
          userGroups={createEstadoGroup()}
          initialUserIndex={getInitialIndices().userIndex}
          initialStatusIndex={getInitialIndices().statusIndex}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
}

/**
 * Componente interno que maneja la navegación del visor de estados compartidos
 */
function SharedPostViewer({
  isOpen,
  userGroups,
  initialUserIndex,
  initialStatusIndex,
  onClose,
}: {
  isOpen: boolean;
  userGroups: UserEstadoGroup[];
  initialUserIndex: number;
  initialStatusIndex: number;
  onClose: () => void;
}) {
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(initialStatusIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentGroup = userGroups[currentUserIndex];
  const totalStatuses = currentGroup?.estados.length || 0;

  // Auto-avance del progreso
  useEffect(() => {
    if (isPaused || !isOpen) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Avanzar al siguiente estado
          handleNext();
          return 0;
        }
        return prev + 2; // ~5 segundos por estado (100 / 2 = 50 ticks * 100ms = 5000ms)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, isOpen, currentUserIndex, currentStatusIndex]);

  const handleNext = () => {
    const currentGroup = userGroups[currentUserIndex];
    if (currentStatusIndex < currentGroup.estados.length - 1) {
      // Siguiente estado del mismo usuario
      setCurrentStatusIndex(currentStatusIndex + 1);
      setProgress(0);
    } else if (currentUserIndex < userGroups.length - 1) {
      // Siguiente usuario
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentStatusIndex(0);
      setProgress(0);
    } else {
      // Fin - cerrar visor
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStatusIndex > 0) {
      // Estado anterior del mismo usuario
      setCurrentStatusIndex(currentStatusIndex - 1);
      setProgress(0);
    } else if (currentUserIndex > 0) {
      // Usuario anterior, último estado
      const prevUserGroup = userGroups[currentUserIndex - 1];
      setCurrentUserIndex(currentUserIndex - 1);
      setCurrentStatusIndex(prevUserGroup.estados.length - 1);
      setProgress(0);
    }
  };

  const handleGoToStatus = (index: number) => {
    setCurrentStatusIndex(index);
    setProgress(0);
  };

  return (
    <StatusViewer
      isOpen={isOpen}
      userGroups={userGroups}
      currentUserIndex={currentUserIndex}
      currentStatusIndex={currentStatusIndex}
      progress={progress}
      isPaused={isPaused}
      onClose={onClose}
      onNext={handleNext}
      onPrev={handlePrev}
      onTogglePause={() => setIsPaused(!isPaused)}
      onGoToStatus={handleGoToStatus}
    />
  );
}
