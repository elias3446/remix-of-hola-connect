/**
 * Vista principal del chat con mensajes y input
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMessages } from '@/hooks/messages/useMessages';
import { useConversations } from '@/hooks/messages/useConversations';
import { useUserPresence } from '@/hooks/messages/useUserPresence';
import { useMessaging } from '@/contexts/MessagingContext';
import type { ConversacionExtendida } from '@/hooks/messages/types';
import { animationClasses } from '@/hooks/optimizacion';

interface ChatViewProps {
  conversation: ConversacionExtendida | null;
  currentUserId: string | null;
  onBack?: () => void;
  onViewInfo?: () => void;
  isMobile?: boolean;
}

export function ChatView({
  conversation,
  currentUserId,
  onBack,
  onViewInfo,
  isMobile = false,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const { isUserOnline } = useUserPresence();
  const { hideConversation, leaveGroup, toggleMute } = useConversations();
  const { setActiveConversation } = useMessaging();

  const {
    messages,
    isLoading,
    sendMessage,
    editMessage,
    deleteForMe,
    deleteForEveryone,
    addReaction,
    removeReaction,
    markAsRead,
    clearMessages,
    isSending,
  } = useMessages({
    conversationId: conversation?.id || null,
    enabled: !!conversation,
  });

  // Auto-scroll al fondo cuando hay nuevos mensajes
  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, shouldAutoScroll]);

  // Marcar como leído al abrir la conversación usando el contexto
  useEffect(() => {
    if (conversation) {
      setActiveConversation(conversation.id);
      markAsRead();
    }
    
    return () => {
      setActiveConversation(null);
    };
  }, [conversation?.id, markAsRead, setActiveConversation]);

  // Detectar scroll para pausar auto-scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isAtBottom);
    }
  };

  // Handlers
  const handleSend = async (content: string, images?: string[]) => {
    await sendMessage({ contenido: content, imagenes: images });
    setShouldAutoScroll(true);
  };

  const handleEdit = async (messageId: string, content: string) => {
    await editMessage({ mensaje_id: messageId, contenido: content });
  };

  const handleToggleMute = async () => {
    if (conversation) {
      await toggleMute(conversation.id, !conversation.is_muted);
    }
  };

  const handleClearMessages = async () => {
    await clearMessages();
  };

  const handleHideConversation = async () => {
    if (conversation) {
      await hideConversation(conversation.id);
      onBack?.();
    }
  };

  const handleLeaveGroup = async () => {
    if (conversation) {
      await leaveGroup(conversation.id);
      onBack?.();
    }
  };

  // Verificar si el otro usuario está online
  const isOtherUserOnline = conversation?.other_participant
    ? isUserOnline(conversation.other_participant.id)
    : false;

  // Recopilar todas las imágenes de la conversación para navegación global
  const allConversationImages = useMemo(() => {
    return messages
      .filter(m => m.imagenes && m.imagenes.length > 0)
      .flatMap(m => m.imagenes || []);
  }, [messages]);

  // Recopilar todos los estados/publicaciones compartidos para navegación secuencial
  const allSharedPostsByUser = useMemo(() => {
    const sharedPosts: Record<string, { posts: any[]; messageIds: string[] }> = {};
    
    messages.forEach((msg) => {
      if (msg.shared_post && typeof msg.shared_post === 'object') {
        const post = msg.shared_post as any;
        const userId = post.sharedBy?.id || msg.user_id || 'unknown';
        
        if (!sharedPosts[userId]) {
          sharedPosts[userId] = { posts: [], messageIds: [] };
        }
        sharedPosts[userId].posts.push(post);
        sharedPosts[userId].messageIds.push(msg.id);
      }
    });
    
    return sharedPosts;
  }, [messages]);

  // Función para obtener todos los posts compartidos del mismo remitente
  const getSharedPostsForMessage = (messageId: string, userId: string) => {
    const userPosts = allSharedPostsByUser[userId];
    if (!userPosts || userPosts.posts.length <= 1) {
      return { posts: undefined, index: 0 };
    }
    
    const index = userPosts.messageIds.indexOf(messageId);
    return { 
      posts: userPosts.posts, 
      index: index >= 0 ? index : 0 
    };
  };

  // Componente interno para la lista de mensajes
  const MessagesList = ({ 
    messages: msgs, 
    currentUserId: userId,
    onEdit: handleEditMsg,
    onDeleteForMe: handleDeleteForMe,
    onDeleteForEveryone: handleDeleteForEveryone,
    onReact: handleReact,
    onRemoveReaction: handleRemoveReaction,
  }: {
    messages: typeof messages;
    currentUserId: string | null;
    onEdit: typeof handleEdit;
    onDeleteForMe: typeof deleteForMe;
    onDeleteForEveryone: typeof deleteForEveryone;
    onReact: typeof addReaction;
    onRemoveReaction: typeof removeReaction;
  }) => (
    <div className="space-y-1">
      {msgs.map((message, index) => {
        const isOwn = message.user_id === userId;
        const prevMessage = msgs[index - 1];
        const showAvatar = !prevMessage || prevMessage.user_id !== message.user_id;
        
        // Obtener posts compartidos del mismo usuario para navegación
        const sharedPostInfo = message.shared_post 
          ? getSharedPostsForMessage(message.id, (message.shared_post as any)?.sharedBy?.id || message.user_id)
          : { posts: undefined, index: 0 };

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={isOwn}
            showAvatar={showAvatar}
            onEdit={handleEditMsg}
            onDeleteForMe={handleDeleteForMe}
            onDeleteForEveryone={handleDeleteForEveryone}
            onReact={handleReact}
            onRemoveReaction={handleRemoveReaction}
            currentUserId={userId || undefined}
            allConversationImages={allConversationImages}
            allSharedPosts={sharedPostInfo.posts}
            sharedPostIndex={sharedPostInfo.index}
          />
        );
      })}
    </div>
  );

  // Pantalla vacía si no hay conversación seleccionada
  if (!conversation) {
    return (
      <div className={cn(
        "flex-1 flex flex-col items-center justify-center bg-muted/30",
        animationClasses.fadeIn
      )}>
        <div className="text-center p-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg
              className="w-12 h-12 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Tus mensajes</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Selecciona una conversación para ver los mensajes o inicia una nueva conversación.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <ChatHeader
        conversation={conversation}
        isOnline={isOtherUserOnline}
        onBack={onBack}
        onToggleMute={handleToggleMute}
        onClearMessages={handleClearMessages}
        onHideConversation={handleHideConversation}
        onLeaveGroup={conversation.es_grupo ? handleLeaveGroup : undefined}
        onViewInfo={onViewInfo}
        isMobile={isMobile}
      />

      {/* Mensajes */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 bg-muted/20"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">
              No hay mensajes aún. ¡Envía el primero!
            </p>
          </div>
        ) : (
          <MessagesList 
            messages={messages} 
            currentUserId={currentUserId}
            onEdit={handleEdit}
            onDeleteForMe={deleteForMe}
            onDeleteForEveryone={deleteForEveryone}
            onReact={addReaction}
            onRemoveReaction={removeReaction}
          />
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        disabled={isSending}
      />
    </div>
  );
}
