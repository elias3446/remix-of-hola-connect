/**
 * Tarjeta de una publicación individual
 */
import { useState, useCallback, memo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
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
  Maximize2,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Publicacion } from '@/hooks/entidades/usePublicaciones';
import { usePublicacionInteractions } from '@/hooks/controlador/usePublicacionInteractions';
import { useCommentsCount } from '@/hooks/controlador/useCommentsCount';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareStatusModal, EmbeddedStatusCard, StatusViewer } from '@/components/estados';
import { EmbeddedPostCard } from './EmbeddedPostCard';
import { CommentSection } from './CommentSection';
import { PostDetailView } from './PostDetailView';
import { useEstados } from '@/hooks/estados';
import type { EstadoVisibilidad, UserEstadoGroup, EstadoExtendido } from '@/hooks/estados/types';
import { useMutedUsers } from '@/hooks/messages/useMutedUsers';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { CameraCapture } from '@/components/ui/camera-capture';
import { useCloudinaryUpload } from '@/hooks/controlador/useCloudinaryUpload';
import { usePostViews, useRegisterPostView } from '@/hooks/controlador/usePostViews';

interface PostCardProps {
  post?: Publicacion;
  index?: number;
  isLoading?: boolean;
  currentUserId?: string | null;
  onPostUpdated?: () => void;
  // Para navegación entre publicaciones
  allPosts?: Publicacion[];
  onNavigateToPost?: (postId: string) => void;
}

// Skeleton component for loading state
function PostCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <Card 
      className={cn(animationClasses.fadeIn)} 
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="w-full h-64 rounded-lg mb-3" />
        <div className="flex items-center justify-between text-sm py-2 border-b">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center justify-around pt-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

function PostCardContent({ post, currentUserId, onPostUpdated, allPosts = [], onNavigateToPost }: { post: Publicacion; currentUserId?: string | null; onPostUpdated?: () => void; allPosts?: Publicacion[]; onNavigateToPost?: (postId: string) => void }) {
  const navigate = useNavigate();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.contenido || '');
  const [editImages, setEditImages] = useState<string[]>(post.imagenes || []);
  const [isUpdating, setIsUpdating] = useState(false);
  // Estado para el visor de estados embebidos
  const [isStatusViewerOpen, setIsStatusViewerOpen] = useState(false);
  const [statusViewerProgress, setStatusViewerProgress] = useState(0);
  const [statusViewerPaused, setStatusViewerPaused] = useState(false);
  
  // Hook con caché optimista para interacciones (sin comentarios, ahora es realtime separado)
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
  
  // Contador de comentarios en tiempo real (patrón de useNotificationCount)
  const { commentsCount } = useCommentsCount(post.id, post.comments_count);
  
  const { createEstado, isCreating: isCreatingEstado } = useEstados(currentUserId || undefined);
  const { isUserMuted, toggleMute } = useMutedUsers();
  const { uploadFromDataUrl, isUploading: isUploadingImage } = useCloudinaryUpload();
  const queryClient = useQueryClient();
  
  // Sistema de vistas
  const { viewCount } = usePostViews(post.id, currentUserId);
  const { registerView } = useRegisterPostView(currentUserId);
  
  const isOwnPost = currentUserId === post.user_id;
  const authorMuted = post.author?.id ? isUserMuted(post.author.id) : false;

  // Estado para navegación entre posts en el detalle
  const [currentDetailPostId, setCurrentDetailPostId] = useState<string>(post.id);
  
  // Obtener el post actual para el detalle y calcular navegación
  const currentDetailPost = allPosts.find(p => p.id === currentDetailPostId) || post;
  const currentDetailIndex = allPosts.findIndex(p => p.id === currentDetailPostId);
  const hasPrevious = currentDetailIndex > 0;
  const hasNext = currentDetailIndex < allPosts.length - 1 && currentDetailIndex !== -1;

  // Handlers de navegación
  const handlePreviousPost = useCallback(() => {
    if (hasPrevious && allPosts.length > 0) {
      const prevPost = allPosts[currentDetailIndex - 1];
      setCurrentDetailPostId(prevPost.id);
    }
  }, [hasPrevious, allPosts, currentDetailIndex]);

  const handleNextPost = useCallback(() => {
    if (hasNext && allPosts.length > 0) {
      const nextPost = allPosts[currentDetailIndex + 1];
      setCurrentDetailPostId(nextPost.id);
    }
  }, [hasNext, allPosts, currentDetailIndex]);

  // Handler para abrir detalle de un post embebido
  const handleOpenEmbeddedDetail = useCallback((embeddedPostId: string) => {
    // Buscar en allPosts primero
    const foundInFeed = allPosts.find(p => p.id === embeddedPostId);
    if (foundInFeed) {
      setCurrentDetailPostId(embeddedPostId);
      setIsDetailViewOpen(true);
    } else if (onNavigateToPost) {
      // Si no está en el feed actual, usar callback externo
      onNavigateToPost(embeddedPostId);
    }
  }, [allPosts, onNavigateToPost]);

  // Reset al abrir el detalle
  const handleOpenDetail = useCallback(() => {
    setCurrentDetailPostId(post.id);
    setIsDetailViewOpen(true);
    registerView(post.id);
  }, [post.id, registerView]);

  // Guardar edición de publicación
  const handleSaveEdit = useCallback(async () => {
    if (!isOwnPost) return;
    if (!editContent.trim() && editImages.length === 0) {
      toast.error('Debes incluir texto o al menos una imagen');
      return;
    }
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('publicaciones')
        .update({ 
          contenido: editContent.trim() || null, 
          imagenes: editImages.length > 0 ? editImages : null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', post.id);
      
      if (error) throw error;
      
      toast.success('Publicación actualizada');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['publicaciones-feed'] });
      onPostUpdated?.();
    } catch (error) {
      console.error('Error actualizando publicación:', error);
      toast.error('Error al actualizar la publicación');
    } finally {
      setIsUpdating(false);
    }
  }, [editContent, editImages, isOwnPost, post.id, queryClient, onPostUpdated]);

  // Cancelar edición
  const handleCancelEdit = useCallback(() => {
    setEditContent(post.contenido || '');
    setEditImages(post.imagenes || []);
    setIsEditing(false);
  }, [post.contenido, post.imagenes]);

  // Añadir imagen desde cámara/galería
  const handleAddEditImage = useCallback(async (imageDataUrl: string) => {
    if (editImages.length >= 4) {
      toast.error('Máximo 4 imágenes por publicación');
      return;
    }
    
    try {
      const result = await uploadFromDataUrl(imageDataUrl, {
        folder: 'publicaciones',
        tags: ['publicacion', 'edit'],
      });
      setEditImages(prev => [...prev, result.secure_url]);
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      toast.error('Error al subir la imagen');
    }
  }, [editImages.length, uploadFromDataUrl]);

  // Eliminar imagen de edición
  const handleRemoveEditImage = useCallback((index: number) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Silenciar/des-silenciar usuario
  const handleToggleMute = useCallback(async () => {
    if (!post.author?.id || isOwnPost) return;
    await toggleMute(post.author.id);
  }, [post.author?.id, isOwnPost, toggleMute]);

  const handleLike = useCallback(() => {
    if (!currentUserId) return;
    
    // Registrar vista al dar like
    registerView(post.id);
    
    // toggleLike ya hace la actualización optimista en el cache
    toggleLike();
  }, [currentUserId, post.id, toggleLike, registerView]);

  const handleSave = useCallback(() => {
    if (!currentUserId) return;
    
    // Registrar vista al guardar
    registerView(post.id);
    
    // toggleSave ya hace la actualización optimista en el cache
    toggleSave();
  }, [currentUserId, post.id, toggleSave, registerView]);

  // handleOpenDetail está definido arriba con la lógica de navegación

  // Handler para compartir (registra vista)
  const handleOpenShare = useCallback(() => {
    registerView(post.id);
    setIsShareModalOpen(true);
  }, [post.id, registerView]);

  const openGallery = useCallback((index: number) => {
    setSelectedImageIndex(index);
    setIsGalleryOpen(true);
  }, []);

  const goToPrevious = useCallback(() => {
    if (post.imagenes) {
      setSelectedImageIndex(prev => prev === 0 ? post.imagenes!.length - 1 : prev - 1);
    }
  }, [post.imagenes]);

  const goToNext = useCallback(() => {
    if (post.imagenes) {
      setSelectedImageIndex(prev => prev === post.imagenes!.length - 1 ? 0 : prev + 1);
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
      console.error("Error descargando imagen:", error);
    }
  }, [post.imagenes, selectedImageIndex]);

  // Handler para compartir como estado
  const handleShareAsStatus = useCallback(async (
    _publicacionId: string, 
    visibility: string, 
    shareInMessages: boolean
  ) => {
    if (!currentUserId) return;
    
    // Registrar vista al compartir como estado
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
      
      // Registrar compartición en la base de datos
      await supabase.from('publicacion_compartidos').insert({
        publicacion_id: post.id,
        user_id: currentUserId,
        tipo_compartido: 'estado',
      });
      
      // Incrementar contador de compartidos optimistamente
      incrementShares();
    } catch (error) {
      console.error('Error al compartir como estado:', error);
    }
  }, [currentUserId, post, createEstado, registerView, incrementShares]);

  // Handler para compartir en perfil (repost)
  const handleShareToProfile = useCallback(async (
    _estadoId: string,
    comment: string,
    visibility: string
  ) => {
    if (!currentUserId) return;
    
    // Registrar vista al compartir en perfil
    registerView(post.id);
    
    try {
      const visibilityMap: Record<string, string> = {
        'todos': 'publico',
        'contactos': 'amigos',
        'privado': 'privado'
      };
      
      const { error } = await supabase
        .from('publicaciones')
        .insert({
          user_id: currentUserId,
          repost_of: post.id,
          repost_comentario: comment.trim() || null,
          visibilidad: visibilityMap[visibility] || 'publico',
          contenido: null,
          imagenes: null,
        });
      
      if (error) throw error;
      
      // Registrar compartición en la base de datos
      await supabase.from('publicacion_compartidos').insert({
        publicacion_id: post.id,
        user_id: currentUserId,
        tipo_compartido: 'perfil',
      });
      
      // Incrementar contador de compartidos optimistamente
      incrementShares();
      
      queryClient.invalidateQueries({ queryKey: ['publicaciones-feed'] });
      toast.success('Publicación compartida en tu perfil');
    } catch (error) {
      console.error('Error al compartir en perfil:', error);
      toast.error('Error al compartir en tu perfil');
    }
  }, [currentUserId, post.id, queryClient, registerView, incrementShares]);

  // Copiar enlace de la publicación (comparte externo)
  const handleCopyLink = useCallback(async () => {
    // Registrar vista al compartir enlace externo
    registerView(post.id);
    
    const postUrl = `${window.location.origin}/red-social?post=${post.id}`;
    
    try {
      await navigator.clipboard.writeText(postUrl);
      
      // Registrar compartición en la base de datos
      if (currentUserId) {
        await supabase.from('publicacion_compartidos').insert({
          publicacion_id: post.id,
          user_id: currentUserId,
          tipo_compartido: 'enlace',
        });
        
        // Incrementar contador de compartidos optimistamente
        incrementShares();
      }
      
      toast.success('Enlace copiado al portapapeles');
    } catch {
      toast.error('Error al copiar el enlace');
    }
  }, [post.id, registerView, currentUserId, incrementShares]);

  // Handler para compartir por mensaje directo
  const handleShareByMessage = useCallback(async (destinatarioId: string) => {
    if (!currentUserId) return;
    
    try {
      // Registrar compartición en la base de datos
      await supabase.from('publicacion_compartidos').insert({
        publicacion_id: post.id,
        user_id: currentUserId,
        destinatario_id: destinatarioId,
        tipo_compartido: 'mensaje',
      });
      
      // Incrementar contador de compartidos
      incrementShares();
    } catch (error) {
      console.error('Error registrando compartición por mensaje:', error);
    }
  }, [currentUserId, post.id, incrementShares]);

  // Eliminar publicación con cascada
  const handleDeletePost = useCallback(async () => {
    if (!isOwnPost) return;
    
    try {
      const now = new Date().toISOString();
      
      // 1. Eliminar estados que comparten esta publicación
      await supabase
        .from('estados')
        .update({ activo: false })
        .eq('publicacion_id', post.id);
      
      // 2. Marcar mensajes compartidos como eliminados (actualizar shared_post con flag)
      const { data: mensajesConPost } = await supabase
        .from('mensajes')
        .select('id, shared_post')
        .not('shared_post', 'is', null);
      
      if (mensajesConPost) {
        for (const mensaje of mensajesConPost) {
          const sharedPost = mensaje.shared_post as { id?: string } | null;
          if (sharedPost?.id === post.id) {
            await supabase
              .from('mensajes')
              .update({ 
                shared_post: { ...sharedPost, deleted: true, deleted_at: now }
              })
              .eq('id', mensaje.id);
          }
        }
      }
      
      // 3. Eliminar la publicación (soft delete)
      const { error } = await supabase
        .from('publicaciones')
        .update({ activo: false, deleted_at: now })
        .eq('id', post.id);
      
      if (error) throw error;
      
      toast.success('Publicación y contenido compartido eliminados');
      queryClient.invalidateQueries({ queryKey: ['publicaciones-feed'] });
      queryClient.invalidateQueries({ queryKey: ['estados'] });
      onPostUpdated?.();
    } catch (error) {
      console.error('Error eliminando publicación:', error);
      toast.error('Error al eliminar la publicación');
    }
  }, [isOwnPost, post.id, queryClient, onPostUpdated]);

  const formattedDate = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: es,
  });

  // Renderizar contenido con hashtags y menciones resaltados
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
        const username = part.slice(1); // Quitar el @
        return (
          <span 
            key={i} 
            className="text-primary font-medium cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/perfil/${username}`);
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const isRepost = !!post.repost_of && !!post.original_post;
  const originalPost = post.original_post;
  // Es un estado compartido si tiene estado_id
  const isSharedStatus = !!post.estado_id && !!post.original_status;

  // Crear grupo de estado para el visor cuando es un estado compartido
  const createStatusViewerGroup = (): UserEstadoGroup[] => {
    if (!post.original_status) return [];
    
    const estado: EstadoExtendido = {
      id: post.original_status.id,
      user_id: post.original_status.author?.id || '',
      contenido: post.original_status.contenido,
      imagenes: post.original_status.imagenes,
      tipo: post.original_status.imagenes && post.original_status.imagenes.length > 0 ? 'imagen' : 'texto',
      compartido_en_mensajes: false,
      compartido_en_social: true,
      visibilidad: 'todos',
      vistas: null,
      created_at: post.original_status.created_at,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      activo: true,
      publicacion_id: post.id,
      user: {
        id: post.original_status.author?.id || '',
        name: post.original_status.author?.name || 'Usuario',
        avatar: post.original_status.author?.avatar || null,
        username: post.original_status.author?.username || null,
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

  // Handler para abrir el visor de estado embebido
  const handleOpenStatusViewer = useCallback(() => {
    setStatusViewerProgress(0);
    setStatusViewerPaused(false);
    setIsStatusViewerOpen(true);
  }, []);

  // Auto-avance del progreso del visor de estado
  useEffect(() => {
    if (!isStatusViewerOpen || statusViewerPaused) return;

    const interval = setInterval(() => {
      setStatusViewerProgress((prev) => {
        if (prev >= 100) {
          setIsStatusViewerOpen(false);
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isStatusViewerOpen, statusViewerPaused]);

  return (
    <Card className={cn("border-border/50 shadow-sm hover:shadow-md transition-shadow", animationClasses.fadeIn)}>
      <CardContent className="p-4">
        {/* Repost/Share indicator */}
        {(isRepost || isSharedStatus) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 -mt-1">
            <Repeat2 className="h-3.5 w-3.5" />
            <span>
              {post.author?.name || 'Usuario'} {isSharedStatus ? 'compartió un estado' : 'compartió'}
            </span>
          </div>
        )}

        {/* Header - Diseño similar a la imagen */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar 
              className="w-10 h-10 border-2 border-primary/20 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => {
                if (post.author?.username) {
                  navigate(`/perfil/${post.author.username}`);
                } else if (post.author?.id) {
                  navigate(`/perfil/id/${post.author.id}`);
                }
              }}
            >
              <AvatarImage src={post.author?.avatar || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                {post.author?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p 
                className="font-semibold text-sm text-foreground leading-tight cursor-pointer hover:underline"
                onClick={() => {
                  if (post.author?.username) {
                    navigate(`/perfil/${post.author.username}`);
                  } else if (post.author?.id) {
                    navigate(`/perfil/id/${post.author.id}`);
                  }
                }}
              >
                {post.author?.name || 'Usuario'}
              </p>
              <p className="text-xs text-muted-foreground">
                {post.author?.username && (
                  <span 
                    className="text-muted-foreground hover:text-primary cursor-pointer hover:underline"
                    onClick={() => navigate(`/perfil/${post.author!.username}`)}
                  >
                    @{post.author.username}
                  </span>
                )}
                {post.author?.username && ' · '}
                <span>{formattedDate}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Botón expandir - Abre modal de detalle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleOpenDetail}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            
            {/* Menú de opciones */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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
                {isOwnPost && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar publicación
                  </DropdownMenuItem>
                )}
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
                  <DropdownMenuItem onClick={handleDeletePost} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar publicación
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="mb-3 space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Escribe algo..."
              className="min-h-[80px] resize-none"
              autoFocus
            />
            
            {/* Edit Images Preview */}
            {editImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editImages.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden group">
                    <img 
                      src={img} 
                      alt={`Imagen ${idx + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveEditImage(idx)}
                      className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Image Button */}
            <div className="flex items-center gap-2">
              <CameraCapture
                onCapture={handleAddEditImage}
                buttonText="Añadir imagen"
                buttonVariant="outline"
                buttonClassName="h-9 text-sm"
                showLimits={false}
              />
              {isUploadingImage && (
                <span className="text-xs text-muted-foreground">Subiendo...</span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {editImages.length}/4 imágenes
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancelEdit}
                disabled={isUpdating || isUploadingImage}
              >
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveEdit}
                disabled={isUpdating || isUploadingImage || (!editContent.trim() && editImages.length === 0)}
              >
                {isUpdating ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        ) : post.contenido ? (
          <p className="text-sm text-foreground mb-3 whitespace-pre-wrap break-words overflow-hidden">
            {renderContent(post.contenido)}
          </p>
        ) : null}

        {/* Repost comment */}
        {isRepost && post.repost_comentario && (
          <p className="text-sm text-foreground mb-3 whitespace-pre-wrap break-words overflow-hidden">
            {renderContent(post.repost_comentario)}
          </p>
        )}

        {/* Original post embedded (for reposts of posts) */}
        {isRepost && originalPost && !isSharedStatus && (
          <EmbeddedPostCard
            contenido={originalPost.contenido}
            imagenes={originalPost.imagenes}
            createdAt={originalPost.created_at}
            author={originalPost.author}
            className="mb-3"
            onClick={() => handleOpenEmbeddedDetail(originalPost.id)}
          />
        )}

        {/* Original status embedded (for shared statuses) */}
        {isSharedStatus && post.original_status && (
          <EmbeddedStatusCard
            contenido={post.original_status.contenido}
            imagenes={post.original_status.imagenes}
            createdAt={post.original_status.created_at}
            author={post.original_status.author}
            className="mb-3"
            onClick={handleOpenStatusViewer}
          />
        )}

        {/* Images (only for non-reposts) */}
        {!isRepost && post.imagenes && post.imagenes.length > 0 && (
          <div className={cn(
            "grid gap-1 rounded-lg overflow-hidden mb-3 cursor-pointer",
            post.imagenes.length === 1 && "grid-cols-1",
            post.imagenes.length === 2 && "grid-cols-2",
            post.imagenes.length >= 3 && "grid-cols-2"
          )}>
            {post.imagenes.slice(0, 4).map((imagen, index) => (
              <div 
                key={index}
                onClick={() => openGallery(index)}
                className={cn(
                  "relative bg-muted hover:opacity-90 transition-opacity",
                  post.imagenes!.length === 1 && "aspect-video",
                  post.imagenes!.length === 2 && "aspect-square",
                  post.imagenes!.length >= 3 && index === 0 && "row-span-2 aspect-square",
                  post.imagenes!.length >= 3 && index > 0 && "aspect-square"
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
                    <span className="text-xl font-bold text-foreground">
                      +{post.imagenes!.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions - Diseño similar a la imagen de referencia */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50 gap-2 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-4 md:gap-5 flex-wrap">
            {/* Like */}
            <button 
              onClick={handleLike}
              disabled={!currentUserId}
              className={cn(
                "flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50",
                isLiked && "text-red-500"
              )}
            >
              <Heart className={cn("h-4 w-4 sm:h-[18px] sm:w-[18px]", isLiked && "fill-current")} />
              <span className="text-xs sm:text-sm">{likesCount}</span>
            </button>
            
            {/* Comentar */}
            <button 
              className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircle className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              <span className="text-xs sm:text-sm">{commentsCount}</span>
            </button>
            
            {/* Compartir */}
            <button 
              onClick={handleOpenShare}
              className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Share2 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              <span className="text-xs sm:text-sm">{sharesCount}</span>
            </button>
            
            {/* Guardar */}
            <button
              onClick={handleSave}
              disabled={!currentUserId}
              className={cn(
                "flex items-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-50",
                isSaved && "text-primary"
              )}
            >
              {isSaved ? (
                <BookmarkCheck className="h-4 w-4 sm:h-[18px] sm:w-[18px] fill-current" />
              ) : (
                <Bookmark className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              )}
            </button>
          </div>
          
          {/* Vistas */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground shrink-0">
            <Eye className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            <span className="text-xs sm:text-sm">{viewCount}</span>
          </div>
        </div>

        {/* Sección de comentarios */}
        <CommentSection
          publicacionId={post.id}
          currentUserId={currentUserId}
          currentUserAvatar={post.author?.avatar}
          currentUserName={post.author?.name}
          initialCommentsCount={commentsCount}
        />
      </CardContent>

      {/* Modal de compartir */}
      <ShareStatusModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        estadoId={post.id}
        statusContent={
          // Si es un repost, usar el contenido del post original si el repost no tiene comentario propio
          isRepost && originalPost
            ? (post.repost_comentario || originalPost.contenido || '')
            : (post.contenido || '')
        }
        statusImage={
          // Si es un repost sin imágenes propias, usar las del post original
          isRepost && originalPost && (!post.imagenes || post.imagenes.length === 0)
            ? originalPost.imagenes?.[0]
            : post.imagenes?.[0]
        }
        contentType="post"
        onShareAsStatus={handleShareAsStatus}
        onShareToProfile={handleShareToProfile}
        onShareByMessage={handleShareByMessage}
      />

      {/* Galería de imágenes */}
      {post.imagenes && post.imagenes.length > 0 && (
        <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
          <DialogContent className="max-w-4xl p-0">
            <div className="relative bg-black rounded-lg">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-white">
                    Imagen {selectedImageIndex + 1} de {post.imagenes.length}
                  </DialogTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsGalleryOpen(false)}
                    className={cn("text-white hover:bg-white/20", transitionClasses.button)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Imagen */}
              <div className="relative flex items-center justify-center min-h-[60vh] p-16 animate-scale-in">
                <img
                  src={post.imagenes[selectedImageIndex]}
                  alt={`Imagen ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>

              {/* Navegación */}
              {post.imagenes.length > 1 && (
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={goToPrevious}
                    className={cn("pointer-events-auto h-10 w-10 rounded-full bg-white/90 hover:bg-white", transitionClasses.button)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={goToNext}
                    className={cn("pointer-events-auto h-10 w-10 rounded-full bg-white/90 hover:bg-white", transitionClasses.button)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* Footer con descarga */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-center">
                  <Button
                    type="button"
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

      {/* Vista de detalle en Dialog */}
      <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">Detalle de publicación</DialogTitle>
          <ScrollArea className="max-h-[90vh]">
            <div className="p-4">
              <PostDetailView
                post={currentDetailPost}
                currentUserId={currentUserId}
                onBack={() => setIsDetailViewOpen(false)}
                onPostUpdated={onPostUpdated}
                isEmbedded
                onPrevious={handlePreviousPost}
                onNext={handleNextPost}
                hasPrevious={hasPrevious}
                hasNext={hasNext}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Visor de estado embebido */}
      {isSharedStatus && post.original_status && (
        <StatusViewer
          isOpen={isStatusViewerOpen}
          userGroups={createStatusViewerGroup()}
          currentUserIndex={0}
          currentStatusIndex={0}
          progress={statusViewerProgress}
          isPaused={statusViewerPaused}
          currentUserId={currentUserId || undefined}
          onClose={() => setIsStatusViewerOpen(false)}
          onNext={() => setIsStatusViewerOpen(false)}
          onPrev={() => {}}
          onTogglePause={() => setStatusViewerPaused(!statusViewerPaused)}
          onGoToStatus={() => {}}
          onReact={async (estadoId, emoji) => {
            if (!currentUserId) return;
            try {
              // Verificar si ya existe una reacción del usuario
              const { data: existing } = await supabase
                .from('estado_reacciones')
                .select('id, emoji')
                .eq('estado_id', estadoId)
                .eq('user_id', currentUserId)
                .maybeSingle();
              
              if (existing) {
                if (existing.emoji === emoji) {
                  // Eliminar reacción si es la misma
                  await supabase
                    .from('estado_reacciones')
                    .delete()
                    .eq('id', existing.id);
                } else {
                  // Actualizar a nuevo emoji
                  await supabase
                    .from('estado_reacciones')
                    .update({ emoji })
                    .eq('id', existing.id);
                }
              } else {
                // Crear nueva reacción
                await supabase
                  .from('estado_reacciones')
                  .insert({
                    estado_id: estadoId,
                    user_id: currentUserId,
                    emoji,
                  });
              }
            } catch (error) {
              console.error('Error toggling reaction:', error);
            }
          }}
        />
      )}
    </Card>
  );
}

export const PostCard = memo(function PostCard({ 
  post, 
  index = 0, 
  isLoading = false,
  currentUserId,
  onPostUpdated,
  allPosts = [],
  onNavigateToPost,
}: PostCardProps) {
  if (isLoading || !post) {
    return <PostCardSkeleton index={index} />;
  }

  return (
    <PostCardContent 
      post={post} 
      currentUserId={currentUserId} 
      onPostUpdated={onPostUpdated}
      allPosts={allPosts}
      onNavigateToPost={onNavigateToPost}
    />
  );
});
