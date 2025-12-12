/**
 * Item de conversación en la lista lateral
 */
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, VolumeX, Check, CheckCheck, Share2, Clock, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { ConversacionExtendida } from '@/hooks/messages/types';
import { transitionClasses, hoverClasses } from '@/hooks/optimizacion';
import type { SharedPostData } from './SharedPostCard';

interface ConversationItemProps {
  conversation: ConversacionExtendida;
  isSelected?: boolean;
  isOnline?: boolean;
  onClick?: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return 'Ayer';
  }
  return format(date, 'dd/MM/yy', { locale: es });
}

export function ConversationItem({
  conversation,
  isSelected = false,
  isOnline = false,
  onClick,
}: ConversationItemProps) {
  const lastMessage = conversation.ultimo_mensaje;
  const isGroup = conversation.es_grupo;
  const unreadCount = conversation.unread_count || 0;
  const isMuted = conversation.is_muted;

  // Determinar nombre y avatar a mostrar
  const displayName = isGroup
    ? conversation.nombre
    : conversation.other_participant?.name || 'Usuario';
  
  const displayAvatar = isGroup
    ? null
    : conversation.other_participant?.avatar;

  const initials = displayName?.[0]?.toUpperCase() || '?';

  // Verificar si hay contenido compartido
  const getSharedPostData = (): SharedPostData | null => {
    if (!lastMessage?.shared_post) return null;
    try {
      if (typeof lastMessage.shared_post === 'string') {
        return JSON.parse(lastMessage.shared_post) as SharedPostData;
      }
      return lastMessage.shared_post as unknown as SharedPostData;
    } catch {
      return null;
    }
  };

  const sharedPost = getSharedPostData();

  // Formatear preview del último mensaje
  const getMessagePreview = (): { icon?: React.ReactNode; text: string } => {
    if (!lastMessage) return { text: 'Sin mensajes' };
    
    if (lastMessage.isDeleted) {
      return { text: '🚫 Mensaje eliminado' };
    }

    // Contenido compartido
    if (sharedPost) {
      const isStatus = sharedPost.type === 'status';
      const icon = isStatus 
        ? <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        : <Share2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />;
      const previewText = sharedPost.content || sharedPost.title || (isStatus ? 'Estado' : 'Publicación');
      return { icon, text: previewText };
    }

    if (lastMessage.imagenes && lastMessage.imagenes.length > 0) {
      return { 
        icon: <ImageIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />,
        text: 'Imagen' 
      };
    }

    return { text: lastMessage.contenido || '' };
  };

  const messagePreview = getMessagePreview();

  // Mostrar estado del mensaje (solo para mensajes propios)
  const renderMessageStatus = () => {
    if (!lastMessage || lastMessage.sender?.id !== conversation.other_participant?.id) {
      return null;
    }

    switch (lastMessage.status) {
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-primary" />;
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 text-left",
        "border-b border-border/50",
        transitionClasses.colors,
        hoverClasses.bgAccent,
        isSelected && "bg-accent"
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          {displayAvatar ? (
            <AvatarImage src={displayAvatar} alt={displayName || ''} />
          ) : null}
          <AvatarFallback className={cn(
            isGroup && "bg-primary/20"
          )}>
            {isGroup ? <Users className="w-5 h-5" /> : initials}
          </AvatarFallback>
        </Avatar>

        {/* Indicador online (solo para chats individuales) */}
        {!isGroup && isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "font-medium truncate",
            unreadCount > 0 && "text-foreground"
          )}>
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {lastMessage?.created_at && formatDate(lastMessage.created_at)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {renderMessageStatus()}
            {messagePreview.icon}
            <span className={cn(
              "text-sm truncate",
              unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {isGroup && lastMessage?.sender?.name && (
                <span className="text-muted-foreground">
                  {lastMessage.sender.name.split(' ')[0]}:{' '}
                </span>
              )}
              {messagePreview.text}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {isMuted && (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
            {unreadCount > 0 && !isMuted && (
              <Badge className="h-5 min-w-5 px-1.5 rounded-full text-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
