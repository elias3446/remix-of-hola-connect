/**
 * Header del chat con información del usuario/grupo y acciones
 */
import { ArrowLeft, MoreVertical, Phone, Video, Users, VolumeX, Volume2, Trash2, LogOut, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ConversacionExtendida } from '@/hooks/messages/types';
import { transitionClasses } from '@/hooks/optimizacion';

interface ChatHeaderProps {
  conversation: ConversacionExtendida | null;
  isOnline?: boolean;
  onBack?: () => void;
  onToggleMute?: () => void;
  onClearMessages?: () => void;
  onHideConversation?: () => void;
  onLeaveGroup?: () => void;
  onViewInfo?: () => void;
  isMobile?: boolean;
}

export function ChatHeader({
  conversation,
  isOnline = false,
  onBack,
  onToggleMute,
  onClearMessages,
  onHideConversation,
  onLeaveGroup,
  onViewInfo,
  isMobile = false,
}: ChatHeaderProps) {
  if (!conversation) {
    return (
      <div className="h-16 border-b bg-background flex items-center justify-center">
        <span className="text-muted-foreground">Selecciona una conversación</span>
      </div>
    );
  }

  const isGroup = conversation.es_grupo;
  const isMuted = conversation.is_muted;

  // Nombre y avatar a mostrar
  const displayName = isGroup
    ? conversation.nombre
    : conversation.other_participant?.name || 'Usuario';

  const displayAvatar = isGroup
    ? null
    : conversation.other_participant?.avatar;

  const initials = displayName?.[0]?.toUpperCase() || '?';

  // Status text
  const getStatusText = () => {
    if (isGroup) {
      const count = conversation.participantes?.length || 0;
      return `${count} participantes`;
    }
    return isOnline ? 'En línea' : 'Desconectado';
  };

  return (
    <div className={cn(
      "h-16 border-b bg-background flex items-center gap-3 px-4",
      transitionClasses.colors
    )}>
      {/* Botón atrás (móvil) */}
      {isMobile && onBack && (
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Avatar */}
      <div className="relative cursor-pointer" onClick={onViewInfo}>
        <Avatar className="w-10 h-10">
          {displayAvatar ? (
            <AvatarImage src={displayAvatar} alt={displayName || ''} />
          ) : null}
          <AvatarFallback className={cn(
            isGroup && "bg-primary/20"
          )}>
            {isGroup ? <Users className="w-4 h-4" /> : initials}
          </AvatarFallback>
        </Avatar>

        {!isGroup && isOnline && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewInfo}>
        <h3 className="font-semibold truncate">{displayName}</h3>
        <p className={cn(
          "text-xs truncate",
          isOnline ? "text-green-500" : "text-muted-foreground"
        )}>
          {getStatusText()}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1">
        {/* Silenciado indicator */}
        {isMuted && (
          <VolumeX className="w-4 h-4 text-muted-foreground" />
        )}

        {/* Menu de opciones */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onViewInfo && (
              <DropdownMenuItem onClick={onViewInfo}>
                <Info className="h-4 w-4 mr-2" />
                Ver información
              </DropdownMenuItem>
            )}

            {onToggleMute && (
              <DropdownMenuItem onClick={onToggleMute}>
                {isMuted ? (
                  <>
                    <Volume2 className="h-4 w-4 mr-2" />
                    Activar notificaciones
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4 mr-2" />
                    Silenciar
                  </>
                )}
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {onClearMessages && (
              <DropdownMenuItem onClick={onClearMessages}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar mensajes
              </DropdownMenuItem>
            )}

            {onHideConversation && (
              <DropdownMenuItem onClick={onHideConversation}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar chat
              </DropdownMenuItem>
            )}

            {isGroup && onLeaveGroup && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLeaveGroup} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Salir del grupo
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
