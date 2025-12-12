/**
 * Sección de comentarios estilo Facebook
 * Con soporte para respuestas anidadas, edición e imágenes
 */
import { useState, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { CameraCapture } from '@/components/ui/camera-capture';
import { 
  useComentarios, 
  useComentarioReplies,
  type Comentario 
} from '@/hooks/entidades/useComentarios';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { useCloudinaryUpload } from '@/hooks/controlador/useCloudinaryUpload';
import { useRegisterPostView } from '@/hooks/controlador/usePostViews';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  MessageCircle, 
  Send, 
  Pencil, 
  Trash2, 
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CommentSectionProps {
  publicacionId: string;
  currentUserId?: string | null;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
  initialCommentsCount?: number;
}

interface CommentInputProps {
  onSubmit: (content: string, images?: string[]) => Promise<void>;
  isSubmitting: boolean;
  placeholder?: string;
  replyToName?: string;
  onCancel?: () => void;
  avatarUrl?: string | null;
  avatarFallback?: string;
}

// Input para escribir comentarios
const CommentInput = memo(function CommentInput({
  onSubmit,
  isSubmitting,
  placeholder = 'Escribe un comentario...',
  replyToName,
  onCancel,
  avatarUrl,
  avatarFallback = 'U',
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [localImage, setLocalImage] = useState<string | null>(null); // Imagen local (dataUrl)
  const { uploadFromDataUrl, isUploading } = useCloudinaryUpload();

  const handleSubmit = async () => {
    if (!content.trim() && !localImage) return;

    try {
      let uploadedImages: string[] | undefined;

      // Si hay imagen local, subirla primero a Cloudinary
      if (localImage) {
        const result = await uploadFromDataUrl(localImage, {
          folder: 'comentarios',
          tags: ['comentario'],
        });
        uploadedImages = [result.secure_url];
      }

      // Luego enviar el comentario a Supabase
      await onSubmit(content.trim(), uploadedImages);
      setContent('');
      setLocalImage(null);
    } catch (error) {
      console.error('Error al enviar comentario:', error);
      toast.error('Error al enviar el comentario');
    }
  };

  const handleImageCapture = (imageDataUrl: string) => {
    if (localImage) {
      toast.error('Solo puedes adjuntar una imagen por comentario');
      return;
    }
    // Guardar imagen localmente (sin subir aún)
    setLocalImage(imageDataUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("space-y-2", animationClasses.fadeIn)}>
      <div className="flex gap-2">
        {avatarUrl !== undefined && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyToName ? `Responder a ${replyToName}...` : placeholder}
            className={cn(
              "min-h-[40px] resize-none border-border/50 focus:border-primary/50",
              transitionClasses.input
            )}
            rows={1}
          />
          
          {/* Preview de imagen local */}
          {localImage && (
            <div className="relative inline-block">
              <img 
                src={localImage} 
                alt="Preview" 
                className="h-20 w-auto rounded-lg object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                onClick={() => setLocalImage(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between pl-10">
        <div>
          <CameraCapture
            onCapture={handleImageCapture}
            buttonText="Adjuntar"
            buttonVariant="ghost"
            buttonClassName="text-muted-foreground hover:text-foreground gap-1.5 h-8 px-3 text-sm"
            maxFileSize={5 * 1024 * 1024}
            allowedFormats={['jpg', 'jpeg', 'png', 'gif', 'webp']}
            showLimits={false}
          />
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading || (!content.trim() && !localImage)}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            {isUploading ? 'Subiendo...' : 'Comentar'}
          </Button>
        </div>
      </div>
    </div>
  );
});

// Máximo nivel de anidamiento visual (después de esto se muestra con referencia)
const MAX_VISUAL_DEPTH = 2;

// Comentario individual
interface CommentItemProps {
  comment: Comentario;
  currentUserId?: string | null;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
  onReply: (commentId: string, authorName: string) => void;
  replyingTo: string | null;
  onCancelReply: () => void;
  onSubmitReply: (content: string, images?: string[], parentId?: string) => Promise<void>;
  isSubmittingReply: boolean;
  depth?: number;
  replyToAuthor?: string | null;
}

const CommentItem = memo(function CommentItem({
  comment,
  currentUserId,
  currentUserAvatar,
  currentUserName,
  onReply,
  replyingTo,
  onCancelReply,
  onSubmitReply,
  isSubmittingReply,
  depth = 0,
  replyToAuthor,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.contenido);
  // Auto-colapsar respuestas de nivel 3+ (depth > MAX_VISUAL_DEPTH)
  const [showReplies, setShowReplies] = useState(depth <= MAX_VISUAL_DEPTH);

  // Limitar el depth visual al máximo permitido
  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);

  const { data: replies = [], isLoading: loadingReplies } = useComentarioReplies(
    showReplies ? comment.id : null,
    showReplies
  );

  const { updateComentario, deleteComentario } = useComentarios({
    publicacionId: comment.publicacion_id,
    currentUserId,
    enabled: false,
  });

  const isOwn = currentUserId === comment.user_id;
  const hasReplies = (comment.replies_count || 0) > 0;

  const formattedDate = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: false,
    locale: es,
  });

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    await updateComentario.mutateAsync({
      comentarioId: comment.id,
      contenido: editContent.trim(),
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteComentario.mutateAsync(comment.id);
  };

  const handleReplySubmit = async (content: string, images?: string[]) => {
    await onSubmitReply(content, images, comment.id);
  };

  // Indentación visual: 
  // - Nivel 0: sin indentación
  // - Nivel 1: ml-10 (solo nivel 1 agrega margen)
  // - Nivel 2: ml-10 adicional (solo nivel 2 agrega margen)
  // - Nivel 3+: sin margen adicional (se quedan en la posición del nivel 2)
  const getIndentClass = () => {
    if (depth === 0) return '';
    if (depth === 1) return 'ml-10';
    if (depth === 2) return 'ml-10'; // Solo nivel 2 agrega ml-10 adicional
    return ''; // Nivel 3+ no agrega más margen
  };

  return (
    <div className={cn("group relative", animationClasses.fadeIn, getIndentClass())}>
      {/* Línea vertical de conexión para respuestas de nivel 3+ */}
      {depth > MAX_VISUAL_DEPTH && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border/50 rounded-full" />
      )}
      
      <div className={cn("flex gap-2", depth > MAX_VISUAL_DEPTH && "pl-4")}>
        <Avatar className="w-8 h-8 flex-shrink-0 relative z-10 bg-background">
          <AvatarImage src={comment.author?.avatar || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {comment.author?.name?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditContent(comment.contenido);
                    setIsEditing(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updateComentario.isPending}
                  className="gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  Comentar
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Comment header */}
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">
                  {comment.author?.name || 'Usuario'}
                </span>
                {/* Mostrar referencia al autor al que responde */}
                {replyToAuthor && (
                  <span className="text-xs text-primary font-medium">
                    @{replyToAuthor}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  hace {formattedDate}
                </span>
                {/* Indicador de nivel del hilo para niveles profundos */}
                {depth > MAX_VISUAL_DEPTH && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    Nivel {depth}
                  </span>
                )}
              </div>

              {/* Comment content */}
              <div className="mt-1">
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {comment.contenido}
                </p>
                
                {/* Images */}
                {comment.imagenes && comment.imagenes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {comment.imagenes.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Imagen ${idx + 1}`}
                        className="max-w-[200px] max-h-[150px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(img, '_blank')}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Comment actions */}
              <div className="flex items-center gap-3 mt-2 text-xs">
                <button
                  onClick={() => onReply(comment.id, comment.author?.name || 'Usuario')}
                  className={cn(
                    "flex items-center gap-1 text-muted-foreground hover:text-primary",
                    transitionClasses.colors
                  )}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Responder
                </button>

                {hasReplies && (
                  <button
                    onClick={() => setShowReplies(!showReplies)}
                    className={cn(
                      "flex items-center gap-1",
                      showReplies 
                        ? "text-muted-foreground hover:text-foreground" 
                        : "text-primary hover:text-primary/80",
                      transitionClasses.colors
                    )}
                  >
                    {showReplies ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Ocultar {comment.replies_count} {comment.replies_count === 1 ? 'respuesta' : 'respuestas'}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        Expandir {comment.replies_count} {comment.replies_count === 1 ? 'respuesta' : 'respuestas'}
                        {depth > MAX_VISUAL_DEPTH && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary ml-1">
                            hilo
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )}

                {isOwn && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className={cn(
                        "flex items-center gap-1 text-muted-foreground hover:text-foreground",
                        transitionClasses.colors
                      )}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>

                    <button
                      onClick={handleDelete}
                      disabled={deleteComentario.isPending}
                      className={cn(
                        "flex items-center gap-1 text-muted-foreground hover:text-destructive",
                        transitionClasses.colors
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* Reply input */}
          {replyingTo === comment.id && (
            <div className="mt-3">
              <CommentInput
                onSubmit={(content, images) => handleReplySubmit(content, images)}
                isSubmitting={isSubmittingReply}
                replyToName={comment.author?.name || undefined}
                onCancel={onCancelReply}
                avatarUrl={currentUserAvatar}
                avatarFallback={currentUserName?.charAt(0)?.toUpperCase() || 'U'}
              />
            </div>
          )}
        </div>
      </div>

      {/* Replies - fuera del contenedor principal para evitar anidamiento */}
      {showReplies && (
        <div className="mt-3 space-y-3">
          {loadingReplies ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            replies.map((reply) => {
              const nextDepth = depth + 1;
              // Mostrar @usuario cuando ya no hay más indentación visual (nivel 3+)
              const showReplyToRef = nextDepth > MAX_VISUAL_DEPTH;
              
              return (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  currentUserAvatar={currentUserAvatar}
                  currentUserName={currentUserName}
                  onReply={onReply}
                  replyingTo={replyingTo}
                  onCancelReply={onCancelReply}
                  onSubmitReply={onSubmitReply}
                  isSubmittingReply={isSubmittingReply}
                  depth={nextDepth}
                  replyToAuthor={showReplyToRef ? comment.author?.name : null}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
});

// Sección principal de comentarios
export const CommentSection = memo(function CommentSection({
  publicacionId,
  currentUserId,
  currentUserAvatar,
  currentUserName,
  initialCommentsCount = 0,
}: CommentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string>('');
  
  // Registro de vistas
  const { registerView } = useRegisterPostView(currentUserId);

  const {
    comentarios,
    isLoading,
    createComentario,
    totalCount,
  } = useComentarios({
    publicacionId,
    currentUserId,
    enabled: true, // Siempre habilitado para mantener el conteo actualizado
  });

  // Usar el conteo real de la base de datos en lugar del inicial
  const displayCount = totalCount;

  const handleSubmitComment = useCallback(async (
    content: string,
    images?: string[],
    parentId?: string
  ) => {
    // Registrar vista al comentar
    registerView(publicacionId);
    
    await createComentario.mutateAsync({
      contenido: content,
      imagenes: images,
      comentario_padre_id: parentId,
    });
    
    setReplyingTo(null);
    setReplyToName('');
  }, [createComentario, publicacionId, registerView]);

  const handleReply = useCallback((commentId: string, authorName: string, flattenToParentId?: string) => {
    // Si flattenToParentId está definido, significa que estamos en nivel 3+ y debemos
    // guardar la respuesta como hijo del padre de nivel 2 (para aplanar)
    setReplyingTo(commentId);
    setReplyToName(authorName);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyToName('');
  }, []);

  return (
    <div className="border-t border-border/50 pt-3 mt-3">
      {/* Toggle comentarios */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "text-sm text-muted-foreground hover:text-foreground mb-2",
          transitionClasses.colors
        )}
      >
        {isExpanded ? 'Ocultar' : 'Ver'} comentarios ({displayCount})
      </button>

      {isExpanded && (
        <div className={cn("space-y-4", animationClasses.fadeIn)}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">
              Comentarios ({totalCount})
            </h4>
            <button
              onClick={() => setIsExpanded(false)}
              className={cn(
                "text-sm text-muted-foreground hover:text-primary",
                transitionClasses.colors
              )}
            >
              Ocultar
            </button>
          </div>

          {/* Input para nuevo comentario */}
          {currentUserId && (
            <CommentInput
              onSubmit={(content, images) => handleSubmitComment(content, images)}
              isSubmitting={createComentario.isPending}
              avatarUrl={currentUserAvatar}
              avatarFallback={currentUserName?.charAt(0)?.toUpperCase() || 'U'}
            />
          )}

          {/* Lista de comentarios */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : comentarios.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No hay comentarios aún. ¡Sé el primero en comentar!
            </p>
          ) : (
            <div className="space-y-4">
              {comentarios.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  currentUserAvatar={currentUserAvatar}
                  currentUserName={currentUserName}
                  onReply={handleReply}
                  replyingTo={replyingTo}
                  onCancelReply={handleCancelReply}
                  onSubmitReply={handleSubmitComment}
                  isSubmittingReply={createComentario.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default CommentSection;
