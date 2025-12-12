/**
 * Burbuja de mensaje individual estilo WhatsApp
 * Muestra estado de lectura (✓, ✓✓, ✓✓ azul)
 * Soporta contenido compartido (publicaciones/estados)
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, CheckCheck, MoreVertical, Pencil, Trash2, Reply, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatImageGallery } from './ChatImageGallery';
import { SharedPostCard, type SharedPostData } from './SharedPostCard';
import type { MensajeExtendido, MessageStatus } from '@/hooks/messages/types';
import { transitionClasses, animationClasses } from '@/hooks/optimizacion';

interface MessageBubbleProps {
  message: MensajeExtendido;
  isOwn: boolean;
  showAvatar?: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string) => void;
  currentUserId?: string;
  /** Todas las imágenes de la conversación para navegación global */
  allConversationImages?: string[];
  /** Todos los estados/publicaciones compartidos del mismo usuario para navegación secuencial */
  allSharedPosts?: any[];
  /** Índice del estado actual en allSharedPosts */
  sharedPostIndex?: number;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function MessageStatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case 'sending':
      return <div className="w-3 h-3 border border-muted-foreground/50 rounded-full animate-pulse" />;
    case 'sent':
      return <Check className="w-3 h-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-primary" />;
    case 'failed':
      return <span className="text-destructive text-xs">!</span>;
    default:
      return null;
  }
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar = true,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onReact,
  onRemoveReaction,
  currentUserId,
  allConversationImages,
  allSharedPosts,
  sharedPostIndex = 0,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.contenido);
  const [showActions, setShowActions] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const handleEdit = () => {
    if (onEdit && editContent.trim() !== message.contenido) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const userReaction = message.reactions?.find(r => r.user_id === currentUserId);

  // Mensaje eliminado
  if (message.isDeleted) {
    return (
      <div className={cn(
        "flex items-end gap-2 mb-2",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}>
        <div className={cn(
          "max-w-[70%] px-3 py-2 rounded-2xl italic text-muted-foreground text-sm",
          isOwn ? "bg-muted" : "bg-muted/50"
        )}>
          🚫 Este mensaje fue eliminado
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-end gap-2 mb-2 group",
        isOwn ? "flex-row-reverse" : "flex-row",
        animationClasses.fadeIn
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        // Solo ocultar si no hay menú o popover abierto
        if (!menuOpen && !emojiOpen) {
          setShowActions(false);
        }
      }}
    >
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.sender?.avatar || ''} />
          <AvatarFallback className="text-xs">
            {message.sender?.name?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Contenedor del mensaje */}
      <div className={cn(
        "relative max-w-[70%] flex flex-col",
        isOwn ? "items-end" : "items-start"
      )}>
        {/* Nombre del sender (solo para mensajes de otros) */}
        {!isOwn && message.sender?.name && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {message.sender.name}
          </span>
        )}

        {/* Burbuja */}
        <div className={cn(
          "relative px-3 py-2 rounded-2xl overflow-hidden max-w-full",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md",
          transitionClasses.colors
        )}>
          {/* Contenido */}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-w-[200px] bg-transparent border-none resize-none focus:outline-none text-sm"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleEdit}>
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Contenido compartido (publicación/estado) */}
              {message.shared_post && (
                <div className="w-full max-w-[220px] mb-2">
                  <SharedPostCard
                    data={message.shared_post as SharedPostData}
                    isOwn={isOwn}
                    allSharedPosts={allSharedPosts}
                    initialIndex={sharedPostIndex}
                    currentUserId={currentUserId}
                  />
                </div>
              )}

              {/* Imágenes con galería navegable */}
              {message.imagenes && message.imagenes.length > 0 && (
                <ChatImageGallery
                  images={message.imagenes}
                  allConversationImages={allConversationImages}
                  className="mb-2"
                />
              )}

              {/* Texto */}
              {message.contenido && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.contenido}
                </p>
              )}

              {/* Footer: hora + estado */}
              <div className={cn(
                "flex items-center gap-1 mt-1",
                isOwn ? "justify-end" : "justify-start"
              )}>
                {message.isEdited && (
                  <span className="text-[10px] opacity-60">editado</span>
                )}
                <span className="text-[10px] opacity-60">
                  {format(new Date(message.created_at), 'HH:mm', { locale: es })}
                </span>
                {isOwn && message.status && (
                  <MessageStatusIcon status={message.status} />
                )}
              </div>
            </>
          )}
        </div>

        {/* Reacciones */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn(
            "flex flex-wrap gap-1 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}>
            {/* Agrupar reacciones por emoji */}
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => {
                  if (userReaction?.emoji === emoji) {
                    onRemoveReaction?.(message.id);
                  } else {
                    onReact?.(message.id, emoji);
                  }
                }}
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs bg-background border",
                  userReaction?.emoji === emoji && "border-primary"
                )}
              >
                {emoji} {count > 1 && count}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Acciones (visible on hover) */}
      {showActions && !isEditing && (
        <div className={cn(
          "flex items-center gap-1",
          animationClasses.fadeIn
        )}>
          {/* Emoji picker */}
          <Popover open={emojiOpen} onOpenChange={(open) => {
            setEmojiOpen(open);
            if (!open && !menuOpen) setShowActions(false);
          }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 z-50" side="top">
              <div className="flex gap-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact?.(message.id, emoji);
                      setEmojiOpen(false);
                      setShowActions(false);
                    }}
                    className="p-1 hover:bg-muted rounded text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Menu de opciones */}
          <DropdownMenu open={menuOpen} onOpenChange={(open) => {
            setMenuOpen(open);
            if (!open && !emojiOpen) setShowActions(false);
          }}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? "end" : "start"} className="z-50">
              {isOwn && (
                <DropdownMenuItem onClick={() => {
                  setIsEditing(true);
                  setMenuOpen(false);
                  setShowActions(false);
                }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => {
                onDeleteForMe?.(message.id);
                setMenuOpen(false);
                setShowActions(false);
              }}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar para mí
              </DropdownMenuItem>
              {isOwn && (
                <DropdownMenuItem 
                  onClick={() => {
                    onDeleteForEveryone?.(message.id);
                    setMenuOpen(false);
                    setShowActions(false);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar para todos
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
