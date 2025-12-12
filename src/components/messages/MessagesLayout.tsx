/**
 * Layout principal del sistema de mensajería
 * Diseño responsive estilo WhatsApp Web
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ConversationList } from './ConversationList';
import { ChatView } from './ChatView';
import { NewConversationModal } from './NewConversationModal';
import { NewGroupModal } from './NewGroupModal';
import { GroupMembersPanel } from './GroupMembersPanel';
import { useConversations } from '@/hooks/messages/useConversations';
import type { ConversacionExtendida, MessagesTab } from '@/hooks/messages/types';
import { useResponsive } from '@/hooks/optimizacion';
import { supabase } from '@/integrations/supabase/client';

export function MessagesLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<ConversacionExtendida | null>(null);
  const [activeTab, setActiveTab] = useState<MessagesTab>('todos');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);

  const { breakpoint } = useResponsive();
  const isMobile = breakpoint === 'sm' || breakpoint === 'xs';

  const { conversations, createConversation, createGroup, isCreating, refetch } = useConversations();

  // Obtener profile_id actual
  useEffect(() => {
    const getProfileId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCurrentProfileId(profile.id);
      }
    };

    getProfileId();
  }, []);

  // Abrir conversación desde URL param o pendiente
  useEffect(() => {
    const chatId = searchParams.get('chat') || pendingConversationId;
    if (chatId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === chatId);
      if (conversation) {
        setSelectedConversation(conversation);
        setPendingConversationId(null);
        // Limpiar el param de la URL después de seleccionar
        if (searchParams.get('chat')) {
          setSearchParams({}, { replace: true });
        }
      }
    }
  }, [conversations, searchParams, pendingConversationId, setSearchParams]);

  // Función para seleccionar conversación y actualizar URL
  const handleSelectConversation = useCallback((conv: ConversacionExtendida) => {
    setSelectedConversation(conv);
    setShowGroupMembers(false);
  }, []);

  // Handler para crear conversación individual
  const handleCreateConversation = async (userId: string) => {
    const conversationId = await createConversation(userId);
    if (conversationId) {
      setShowNewConversation(false);
      // Marcar como pendiente para abrir cuando se actualice la lista
      setPendingConversationId(conversationId);
      // Refetch inmediato
      refetch();
    }
  };

  // Handler para crear grupo
  const handleCreateGroup = async (name: string, participants: string[]) => {
    const groupId = await createGroup({ nombre: name, participantes: participants });
    if (groupId) {
      setShowNewGroup(false);
      // Marcar como pendiente para abrir cuando se actualice la lista
      setPendingConversationId(groupId);
      // Refetch inmediato
      refetch();
    }
  };

  // Handler para volver (móvil) o cuando se elimina/oculta conversación
  const handleBack = () => {
    setSelectedConversation(null);
    setShowGroupMembers(false);
  };

  // Handler para ver info/miembros del grupo
  const handleViewInfo = () => {
    if (selectedConversation?.es_grupo) {
      setShowGroupMembers(true);
    }
  };

  // En móvil, mostrar lista o chat (no ambos)
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        {showGroupMembers && selectedConversation?.es_grupo ? (
          <GroupMembersPanel
            conversation={selectedConversation}
            currentUserId={currentProfileId}
            onClose={() => setShowGroupMembers(false)}
          />
        ) : selectedConversation ? (
          <ChatView
            conversation={selectedConversation}
            currentUserId={currentProfileId}
            onBack={handleBack}
            onViewInfo={handleViewInfo}
            isMobile
          />
        ) : (
          <ConversationList
            selectedConversationId={selectedConversation?.id}
            onSelectConversation={handleSelectConversation}
            onNewConversation={() => setShowNewConversation(true)}
            onNewGroup={() => setShowNewGroup(true)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}

        {/* Modales */}
        <NewConversationModal
          open={showNewConversation}
          onOpenChange={setShowNewConversation}
          onSelectUser={handleCreateConversation}
          currentUserId={currentProfileId}
          isLoading={isCreating}
        />

        <NewGroupModal
          open={showNewGroup}
          onOpenChange={setShowNewGroup}
          onCreateGroup={handleCreateGroup}
          currentUserId={currentProfileId}
          isLoading={isCreating}
        />
      </div>
    );
  }

  // Desktop: mostrar lista y chat lado a lado
  return (
    <div className="h-full flex">
      {/* Lista de conversaciones */}
      <div className="w-80 lg:w-96 flex-shrink-0">
        <ConversationList
          selectedConversationId={selectedConversation?.id}
          onSelectConversation={handleSelectConversation}
          onNewConversation={() => setShowNewConversation(true)}
          onNewGroup={() => setShowNewGroup(true)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Vista del chat */}
      <div className="flex-1 flex flex-col">
        <ChatView
          conversation={selectedConversation}
          currentUserId={currentProfileId}
          onBack={handleBack}
          onViewInfo={handleViewInfo}
        />
      </div>

      {/* Panel de miembros del grupo */}
      {showGroupMembers && selectedConversation?.es_grupo && (
        <GroupMembersPanel
          conversation={selectedConversation}
          currentUserId={currentProfileId}
          onClose={() => setShowGroupMembers(false)}
        />
      )}

      {/* Modales */}
      <NewConversationModal
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onSelectUser={handleCreateConversation}
        currentUserId={currentProfileId}
        isLoading={isCreating}
      />

      <NewGroupModal
        open={showNewGroup}
        onOpenChange={setShowNewGroup}
        onCreateGroup={handleCreateGroup}
        currentUserId={currentProfileId}
        isLoading={isCreating}
      />
    </div>
  );
}
