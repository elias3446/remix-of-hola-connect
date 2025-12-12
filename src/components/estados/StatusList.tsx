/**
 * Lista horizontal de estados de usuarios (Stories)
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusRing } from './StatusRing';
import { StatusViewer } from './StatusViewer';
import { CreateStatusModal } from './CreateStatusModal';
import { useEstados, useStatusViewer } from '@/hooks/estados';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { UserEstadoGroup } from '@/hooks/estados/types';

type StatusSource = 'mensajes' | 'social';

interface StatusListProps {
  currentUserId?: string | null;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
  showAddButton?: boolean;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Origen para determinar opciones de compartir */
  source?: StatusSource;
  /** ID de estado para abrir automáticamente */
  openEstadoId?: string | null;
}

export function StatusList({
  currentUserId,
  currentUserAvatar,
  currentUserName,
  showAddButton = true,
  orientation = 'horizontal',
  size = 'md',
  className,
  source = 'social',
  openEstadoId,
}: StatusListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    estadosGroupedByUser,
    misEstados,
    isLoading,
    createEstado,
    deleteEstado,
    registerView,
    addReaction,
    isCreating,
  } = useEstados(currentUserId || undefined, { source });

  const {
    isOpen: isViewerOpen,
    currentUserIndex,
    currentStatusIndex,
    progress,
    isPaused,
    currentGroup,
    currentStatus,
    openViewer,
    closeViewer,
    togglePause,
    goToNextStatus,
    goToPrevStatus,
    goToStatusInGroup,
  } = useStatusViewer(estadosGroupedByUser, {}); // Vista se registra directamente en StatusViewer

  // Abrir automáticamente un estado específico si se proporciona openEstadoId
  useEffect(() => {
    if (openEstadoId && estadosGroupedByUser.length > 0 && !isViewerOpen) {
      // Buscar el grupo y el índice del estado
      for (let userIndex = 0; userIndex < estadosGroupedByUser.length; userIndex++) {
        const group = estadosGroupedByUser[userIndex];
        const statusIndex = group.estados.findIndex(e => e.id === openEstadoId);
        if (statusIndex !== -1) {
          // Encontrado: abrir el visor en esa posición
          openViewer(userIndex, statusIndex);
          break;
        }
      }
    }
  }, [openEstadoId, estadosGroupedByUser, isViewerOpen, openViewer]);

  // Separar mi grupo de estados del resto
  const myGroup = estadosGroupedByUser.find(g => g.user_id === currentUserId);
  const otherGroups = estadosGroupedByUser.filter(g => g.user_id !== currentUserId);
  
  // Verificar si el usuario actual tiene estados - usar myGroup para evitar desincronización
  const userHasStatus = myGroup ? myGroup.estados.length > 0 : misEstados.length > 0;
  const userStatusCount = myGroup ? myGroup.estados.length : misEstados.length;

  const handleDelete = async (estadoId: string) => {
    await deleteEstado(estadoId);
    // Si era el único estado, cerrar el visor
    if (userStatusCount <= 1) {
      closeViewer();
    }
  };

  const handleShare = (estadoId: string) => {
    // TODO: Abrir modal de compartir por mensaje
    console.log('Compartir estado:', estadoId);
  };

  const handleReact = async (estadoId: string, emoji: string) => {
    if (!currentUserId) return;
    try {
      await addReaction({ estado_id: estadoId, emoji });
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  const queryClient = useQueryClient();

  // Handler para compartir un estado en el feed como publicación
  const handleShareToProfile = useCallback(async (
    estadoId: string,
    comment: string,
    visibility: string
  ) => {
    if (!currentUserId) return;
    
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
          estado_id: estadoId,
          repost_comentario: comment.trim() || null,
          visibilidad: visibilityMap[visibility] || 'publico',
          contenido: null,
          imagenes: null,
        });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['publicaciones-feed'] });
      toast.success('Estado compartido en tu perfil');
    } catch (error) {
      console.error('Error al compartir estado en perfil:', error);
      toast.error('Error al compartir en tu perfil');
    }
  }, [currentUserId, queryClient]);

  if (isLoading) {
    return (
      <div className={cn(
        "flex gap-4 p-4",
        orientation === 'vertical' && 'flex-col',
        className
      )}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="w-12 h-3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        orientation === 'horizontal' ? 'w-full overflow-hidden' : 'flex flex-col',
        className
      )}>
        {orientation === 'horizontal' ? (
          <ScrollArea className="w-full">
            <div className={cn(
              "flex gap-2 sm:gap-3 p-3 sm:p-4",
              animationClasses.fadeIn
            )}>
              {/* Crear estado (siempre primero) */}
              {showAddButton && currentUserId && (
                <div 
                  onClick={() => setShowCreateModal(true)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-2 shrink-0",
                    "w-[90px] sm:w-[100px] md:w-[120px] h-[130px] sm:h-[145px] md:h-[160px] rounded-xl cursor-pointer",
                    "bg-muted/50 border-2 border-dashed border-muted-foreground/30",
                    "hover:bg-muted hover:border-muted-foreground/50",
                    "transition-all duration-200",
                    animationClasses.fadeIn
                  )}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Crear estado
                  </span>
                </div>
              )}

              {/* Todos los estados (propios y de otros) */}
              {estadosGroupedByUser.map((group, index) => {
                const isOwn = group.user_id === currentUserId;
                const latestStatus = group.estados[0];
                const hasImage = latestStatus?.imagenes && latestStatus.imagenes.length > 0;
                
                return (
                  <div 
                    key={group.user_id} 
                    onClick={() => openViewer(index)}
                    className={cn(
                      "relative flex flex-col items-center justify-end shrink-0",
                      "w-[90px] sm:w-[100px] md:w-[120px] h-[130px] sm:h-[145px] md:h-[160px] rounded-xl cursor-pointer overflow-hidden",
                      "bg-muted-foreground/80 dark:bg-muted/80",
                      "hover:scale-[1.02] transition-transform duration-200",
                      animationClasses.fadeIn
                    )}
                    style={{ 
                      animationDelay: `${index * 50}ms`,
                      backgroundImage: hasImage ? `url(${latestStatus.imagenes![0]})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {/* Overlay oscuro */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    {/* Avatar con anillo en la esquina superior izquierda */}
                    <div className="absolute top-2 left-2">
                      <StatusRing
                        avatarUrl={group.user.avatar}
                        name={group.user.name}
                        username={group.user.username}
                        hasStatus
                        hasUnviewed={group.has_unviewed}
                        statusCount={group.total_count}
                        size="sm"
                      />
                    </div>
                    
                    {/* Icono de placeholder si no hay imagen */}
                    {!hasImage && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted-foreground/30 flex items-center justify-center">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    {/* Nombre del usuario */}
                    <div className="relative z-10 p-1.5 sm:p-2 text-center w-full">
                      <span className="text-[10px] sm:text-xs font-medium text-white line-clamp-2 leading-tight">
                        {isOwn ? 'Tu estado' : (group.user.name || group.user.username)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Si no hay estados */}
              {estadosGroupedByUser.length === 0 && !showAddButton && (
                <div className="flex items-center justify-center h-32 sm:h-40 px-4 text-muted-foreground text-sm">
                  No hay estados recientes
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          // Orientación vertical
          <div className={cn("flex flex-col gap-3", animationClasses.fadeIn)}>
            {/* Mi estado */}
            {showAddButton && currentUserId && (
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer",
                "hover:bg-muted/50",
                transitionClasses.colors
              )}>
                <StatusRing
                  avatarUrl={currentUserAvatar}
                  name={currentUserName}
                  hasStatus={userHasStatus}
                  statusCount={userStatusCount}
                  isOwn
                  size={size}
                  onClick={() => {
                    if (userHasStatus && myGroup) {
                      const myIndex = estadosGroupedByUser.findIndex(g => g.user_id === currentUserId);
                      openViewer(myIndex >= 0 ? myIndex : 0);
                    }
                  }}
                  onAddClick={() => setShowCreateModal(true)}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">Mi estado</p>
                  <p className="text-sm text-muted-foreground">
                    {userHasStatus ? `${userStatusCount} estado${userStatusCount !== 1 ? 's' : ''}` : 'Toca para agregar'}
                  </p>
                </div>
              </div>
            )}

            {/* Todos los estados */}
            {estadosGroupedByUser.length > 0 && (
              <>
                <div className="px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Estados recientes
                  </span>
                </div>
                {estadosGroupedByUser.map((group, index) => {
                  const isOwn = group.user_id === currentUserId;
                  
                  return (
                    <div
                      key={group.user_id}
                      onClick={() => openViewer(index)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer",
                        "hover:bg-muted/50",
                        transitionClasses.colors
                      )}
                    >
                      <StatusRing
                        avatarUrl={group.user.avatar}
                        name={group.user.name}
                        username={group.user.username}
                        hasStatus
                        hasUnviewed={group.has_unviewed}
                        statusCount={group.total_count}
                        size={size}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {isOwn ? 'Tu estado' : (group.user.name || group.user.username)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {group.total_count} estado{group.total_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de crear estado */}
      <CreateStatusModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createEstado}
        isSubmitting={isCreating}
        source={source}
      />

      {/* Visor de estados */}
      <StatusViewer
        isOpen={isViewerOpen}
        userGroups={estadosGroupedByUser}
        currentUserIndex={currentUserIndex}
        currentStatusIndex={currentStatusIndex}
        progress={progress}
        isPaused={isPaused}
        currentUserId={currentUserId || undefined}
        onClose={closeViewer}
        onNext={goToNextStatus}
        onPrev={goToPrevStatus}
        onTogglePause={togglePause}
        onGoToStatus={goToStatusInGroup}
        onDelete={handleDelete}
        onShare={handleShare}
        onReact={handleReact}
        onShareToProfile={handleShareToProfile}
      />
    </>
  );
}
