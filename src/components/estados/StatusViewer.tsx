/**
 * Visor de estados en pantalla completa (Stories Viewer)
 */
import { useState } from 'react';
import { 
  X, 
  Trash2, 
  Pause, 
  Play,
  Eye,
  Repeat2,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useStatusViewsCache } from '@/hooks/estados/useStatusViewsCache';
import { useStatusReactionsCache } from '@/hooks/estados/useStatusReactionsCache';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StatusProgressBar } from './StatusProgressBar';
import { ShareStatusModal } from './ShareStatusModal';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  animationClasses, 
  transitionClasses, 
} from '@/hooks/optimizacion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { UserEstadoGroup } from '@/hooks/estados/types';

interface StatusViewerProps {
  isOpen: boolean;
  userGroups: UserEstadoGroup[];
  currentUserIndex: number;
  currentStatusIndex: number;
  progress: number;
  isPaused: boolean;
  currentUserId?: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTogglePause: () => void;
  onGoToStatus: (index: number) => void;
  onDelete?: (estadoId: string) => void;
  onShare?: (estadoId: string) => void;
  onReact?: (estadoId: string, emoji: string) => void;
  onShareToProfile?: (estadoId: string, comment: string, visibility: string) => void;
}

export function StatusViewer({
  isOpen,
  userGroups,
  currentUserIndex,
  currentStatusIndex,
  progress,
  isPaused,
  currentUserId,
  onClose,
  onNext,
  onPrev,
  onTogglePause,
  onGoToStatus,
  onDelete,
  onShare,
  onReact,
  onShareToProfile,
}: StatusViewerProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [wasPausedBeforeModal, setWasPausedBeforeModal] = useState(false);

  const currentGroup = userGroups[currentUserIndex];
  const currentStatus = currentGroup?.estados[currentStatusIndex];
  const isOwnStatus = currentStatus?.user_id === currentUserId;

  // Usar hooks de caché para vistas y reacciones
  const { viewCount } = useStatusViewsCache(currentStatus?.id, currentUserId);
  const { reactions, userReaction, setOptimisticReaction } = useStatusReactionsCache(currentStatus?.id, currentUserId);

  // Pausar reproducción cuando se abre un modal
  const handleOpenModal = (openFn: (value: boolean) => void) => {
    setWasPausedBeforeModal(isPaused);
    if (!isPaused) {
      onTogglePause(); // Pausar
    }
    openFn(true);
  };

  // Restaurar estado de pausa cuando se cierra un modal
  const handleCloseModal = (closeFn: (value: boolean) => void) => {
    closeFn(false);
    if (!wasPausedBeforeModal) {
      onTogglePause(); // Reanudar solo si no estaba pausado antes
    }
  };

  // Verificar si hay más estados disponibles
  const canGoPrev = currentStatusIndex > 0 || currentUserIndex > 0;
  const canGoNext = currentStatusIndex < (currentGroup?.estados.length || 0) - 1 || currentUserIndex < userGroups.length - 1;

  if (!isOpen || !currentGroup || !currentStatus) return null;

  const timeAgo = formatDistanceToNow(new Date(currentStatus.created_at), {
    addSuffix: false,
    locale: es,
  });

  // Función para abrir/cerrar panel de reacciones con pausa
  const handleToggleReactions = () => {
    if (!showReactions) {
      // Abrir panel de reacciones
      setWasPausedBeforeModal(isPaused);
      if (!isPaused) {
        onTogglePause(); // Pausar
      }
      setShowReactions(true);
    } else {
      // Cerrar panel de reacciones
      setShowReactions(false);
      if (!wasPausedBeforeModal) {
        onTogglePause(); // Reanudar solo si no estaba pausado antes
      }
    }
  };

  // Función para manejar reacciones
  const handleReaction = async (emoji: string) => {
    if (onReact && currentStatus && currentUserId) {
      // Actualizar estado local inmediatamente para feedback visual rápido
      setOptimisticReaction(emoji);
      await onReact(currentStatus.id, emoji);
      // El realtime se encargará de actualizar las reacciones completas
    }
    // Cerrar panel y reanudar
    setShowReactions(false);
    if (!wasPausedBeforeModal) {
      onTogglePause(); // Reanudar solo si no estaba pausado antes
    }
  };

  const handleDeleteConfirm = () => {
    if (onDelete && currentStatus) {
      onDelete(currentStatus.id);
    }
    setShowDeleteConfirm(false);
  };

  const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

  return (
    <>
      <div className={cn(
        "fixed inset-0 z-50 bg-black",
        animationClasses.fadeIn
      )}>
        {/* Contenedor principal */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Área clickeable para pausar/reanudar y navegación - siempre visible al hover */}
          <div className="absolute inset-0 flex z-10">
            {/* Zona izquierda para ir atrás */}
            <div 
              className="w-1/4 h-full cursor-pointer" 
              onClick={(e) => {
                e.stopPropagation();
                if (canGoPrev) {
                  onPrev();
                  if (isPaused) onTogglePause();
                }
              }}
            />
            {/* Zona central para pausar/reanudar */}
            <div 
              className="w-1/2 h-full cursor-pointer flex items-center justify-center group"
              onClick={(e) => {
                e.stopPropagation();
                // Cerrar panel de reacciones al reanudar
                if (isPaused && showReactions) {
                  setShowReactions(false);
                }
                onTogglePause();
              }}
            >
              <div className={cn(
                "w-16 h-16 rounded-full bg-black/30 flex items-center justify-center",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              )}>
                {isPaused ? <Play className="h-8 w-8 text-white" /> : <Pause className="h-8 w-8 text-white" />}
              </div>
            </div>
            {/* Zona derecha para ir adelante */}
            <div 
              className="w-1/4 h-full cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (canGoNext) {
                  onNext();
                  if (isPaused) onTogglePause();
                }
              }}
            />
          </div>

          {/* Header */}
          <div className={cn(
            "absolute top-0 left-0 right-0 z-10 p-4 pt-2",
            "bg-gradient-to-b from-black/60 to-transparent"
          )}>
            {/* Progress bars */}
            <StatusProgressBar
              totalStatuses={currentGroup.estados.length}
              currentIndex={currentStatusIndex}
              progress={progress}
              className="mb-4"
            />

            {/* User info & controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-white/50">
                  <AvatarImage src={currentGroup.user.avatar || undefined} />
                  <AvatarFallback>
                    {currentGroup.user.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm">
                      {currentGroup.user.name || currentGroup.user.username}
                    </p>
                    {/* Indicador de publicación compartida */}
                    {(currentStatus as any).publicacion_id && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-xs text-white/90">
                        <Repeat2 className="h-3 w-3" />
                        Publicación
                      </span>
                    )}
                  </div>
                  {/* Mostrar autor original si es una publicación compartida */}
                  {(currentStatus as any).original_author && (
                    <p className="text-white/80 text-xs flex items-center gap-1">
                      <span className="text-white/60">de</span>
                      <span className="font-medium">
                        {(currentStatus as any).original_author.name || (currentStatus as any).original_author.username}
                      </span>
                    </p>
                  )}
                  <p className="text-white/70 text-xs">
                    hace {timeAgo}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Botón de pausa */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Cerrar panel de reacciones al reanudar
                    if (isPaused && showReactions) {
                      setShowReactions(false);
                    }
                    onTogglePause();
                  }}
                  className={cn(
                    "text-white hover:bg-white/20",
                    transitionClasses.fast
                  )}
                >
                  {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </Button>

                {/* Botón de eliminar (solo para propios) */}
                {isOwnStatus && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModal(setShowDeleteConfirm);
                    }}
                    className={cn(
                      "text-white hover:bg-white/20",
                      transitionClasses.fast
                    )}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}

                {/* Botón de cerrar */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className={cn(
                    "text-white hover:bg-white/20",
                    transitionClasses.fast
                  )}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={cn(
            "relative w-full max-w-lg h-full flex flex-col items-center justify-center",
            "px-4",
            animationClasses.fadeIn
          )}>
            {/* Imagen(es) */}
            {currentStatus.imagenes && currentStatus.imagenes.length > 0 && (
              <div className="w-full flex-1 flex items-center justify-center py-20">
                <img
                  src={currentStatus.imagenes[0]}
                  alt="Estado"
                  className={cn(
                    "max-w-full max-h-full object-contain rounded-lg",
                    animationClasses.scaleIn
                  )}
                />
              </div>
            )}

            {/* Texto */}
            {currentStatus.contenido && (
              <div className={cn(
                "absolute inset-x-4 text-center",
                !currentStatus.imagenes?.length ? "top-1/2 -translate-y-1/2" : "bottom-32",
              )}>
                <p className={cn(
                  "text-white text-lg md:text-xl font-medium",
                  "drop-shadow-lg break-words overflow-hidden",
                  "max-w-full line-clamp-6",
                  !currentStatus.imagenes?.length && "text-2xl md:text-3xl"
                )}>
                  {currentStatus.contenido}
                </p>
              </div>
            )}

          </div>

          {/* Footer con acciones */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 z-10 p-4 pb-6",
            "bg-gradient-to-t from-black/60 to-transparent"
          )}>
            {/* Mostrar reacciones existentes */}
            {reactions.length > 0 && (
              <div className="flex items-center gap-2 mb-3 max-w-lg mx-auto">
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                  {reactions.map((r) => (
                    <div 
                      key={r.emoji} 
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full",
                        userReaction === r.emoji && "bg-white/20"
                      )}
                      title={r.users.join(', ')}
                    >
                      <span className="text-lg">{r.emoji}</span>
                      <span className="text-white text-xs font-medium">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between max-w-lg mx-auto">
              {/* Vistas (solo para propios) */}
              {isOwnStatus && (
                <div className="flex items-center gap-2 text-white/80">
                  <Eye className="h-5 w-5" />
                  <span className="text-sm">
                    {viewCount} vista{viewCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Reacciones (disponible para todos los usuarios autenticados) */}
              {currentUserId && (
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleReactions();
                    }}
                    className={cn(
                      "text-white hover:bg-white/20 gap-2",
                      userReaction && "bg-white/10",
                      transitionClasses.fast
                    )}
                  >
                    {userReaction ? (
                      <span className="text-lg">{userReaction}</span>
                    ) : (
                      <Heart className="h-5 w-5" />
                    )}
                    <span>{userReaction ? 'Tu reacción' : 'Reaccionar'}</span>
                  </Button>

                  {/* Panel de reacciones */}
                  {showReactions && (
                    <div className={cn(
                      "absolute bottom-full left-0 mb-2 p-2 rounded-full",
                      "bg-black/80 backdrop-blur-sm flex gap-1",
                      animationClasses.scaleIn
                    )}>
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaction(emoji);
                          }}
                          className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-full",
                            "hover:bg-white/20 text-xl",
                            userReaction === emoji && "bg-white/30 ring-2 ring-white/50",
                            transitionClasses.fast
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Espacio vacío si no hay usuario autenticado */}
              {!currentUserId && <div />}

              {/* Compartir */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal(setShowShareModal);
                }}
                className={cn(
                  "text-white hover:bg-white/20 gap-2",
                  transitionClasses.fast
                )}
              >
                <Share2 className="h-5 w-5" />
                <span>Compartir</span>
              </Button>
            </div>
          </div>

          {/* Flechas de navegación (siempre visibles) */}
          {canGoPrev && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className={cn(
                "absolute left-2 md:left-4 top-1/2 -translate-y-1/2",
                "text-white bg-black/30 hover:bg-white/20",
                "w-10 h-10 md:w-12 md:h-12 rounded-full",
                transitionClasses.normal
              )}
            >
              <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
            </Button>
          )}

          {canGoNext && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className={cn(
                "absolute right-2 md:right-4 top-1/2 -translate-y-1/2",
                "text-white bg-black/30 hover:bg-white/20",
                "w-10 h-10 md:w-12 md:h-12 rounded-full",
                transitionClasses.normal
              )}
            >
              <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
            </Button>
          )}
        </div>

        {/* Modal de compartir */}
        <ShareStatusModal
          isOpen={showShareModal}
          onClose={() => handleCloseModal(setShowShareModal)}
          estadoId={currentStatus.id}
          statusContent={currentStatus.contenido || ''}
          statusImage={currentStatus.imagenes?.[0]}
          onShareInternal={onShare}
          onShareToProfile={onShareToProfile}
        />
      </div>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog 
        open={showDeleteConfirm} 
        onOpenChange={(open) => {
          if (!open) {
            handleCloseModal(setShowDeleteConfirm);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El estado será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}