/**
 * Lista de conversaciones con búsqueda y tabs
 */
import { useState, useMemo } from 'react';
import { Search, Plus, Users, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ConversationItem } from './ConversationItem';
import { StatusList } from '@/components/estados';
import { useConversations } from '@/hooks/messages/useConversations';
import { useUserPresence } from '@/hooks/messages/useUserPresence';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';
import type { ConversacionExtendida, MessagesTab } from '@/hooks/messages/types';
import { transitionClasses, animationClasses } from '@/hooks/optimizacion';

interface ConversationListProps {
  selectedConversationId?: string | null;
  onSelectConversation: (conversation: ConversacionExtendida) => void;
  onNewConversation: () => void;
  onNewGroup: () => void;
  activeTab: MessagesTab;
  onTabChange: (tab: MessagesTab) => void;
}

export function ConversationList({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  onNewGroup,
  activeTab,
  onTabChange,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { isUserOnline } = useUserPresence();
  const { user } = useAuth();
  const { data: profile } = useOptimizedProfile(user?.id);

  // Obtener conversaciones según el tab activo
  const filter = activeTab === 'grupos' ? 'groups' : activeTab === 'todos' ? 'all' : 'all';
  const { conversations, isLoading } = useConversations({ filter });

  // Filtrar por búsqueda
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const name = conv.es_grupo
        ? conv.nombre
        : conv.other_participant?.name || '';
      return name?.toLowerCase().includes(query);
    });
  }, [conversations, searchQuery]);

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Header con búsqueda */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Mensajes</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onNewConversation} title="Nueva conversación">
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNewGroup} title="Nuevo grupo">
              <Users className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conversación..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-2 py-2 border-b">
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as MessagesTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="todos" className="flex-1">Todos</TabsTrigger>
            <TabsTrigger value="grupos" className="flex-1">Grupos</TabsTrigger>
            <TabsTrigger value="estados" className="flex-1">Estados</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Lista de conversaciones */}
      <ScrollArea className="flex-1">
        {activeTab === 'estados' ? (
          // Sección Estados
          <StatusList
            currentUserId={profile?.id}
            currentUserAvatar={profile?.avatar}
            currentUserName={profile?.name}
            showAddButton
            orientation="vertical"
            size="md"
            source="mensajes"
          />
        ) : isLoading ? (
          // Skeletons de carga
          <div className="p-2 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          // Sin conversaciones
          <div className={cn(
            "flex flex-col items-center justify-center h-64 text-center p-4",
            animationClasses.fadeIn
          )}>
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">
              {searchQuery ? 'Sin resultados' : 'Sin conversaciones'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? 'No se encontraron conversaciones con ese nombre'
                : 'Inicia una nueva conversación para comenzar'}
            </p>
          </div>
        ) : (
          // Lista de conversaciones
          <div className={animationClasses.fadeIn}>
            {filteredConversations.map((conv) => {
              const isOnline = conv.other_participant
                ? isUserOnline(conv.other_participant.id)
                : false;

              return (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={conv.id === selectedConversationId}
                  isOnline={isOnline}
                  onClick={() => onSelectConversation(conv)}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
