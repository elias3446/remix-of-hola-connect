/**
 * Modal para crear nueva conversación individual
 * Soporta vista previa de contenido compartido
 */
import { useState, useMemo } from 'react';
import { Search, Loader2, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { transitionClasses, hoverClasses } from '@/hooks/optimizacion';

interface User {
  id: string;
  name: string | null;
  avatar: string | null;
  username: string | null;
}

/** Contenido compartido para vista previa */
export interface SharedContentPreview {
  type: 'status' | 'post';
  content?: string;
  image?: string;
  author?: {
    name: string | null;
    avatar: string | null;
    username: string | null;
  };
}

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (userId: string) => void;
  currentUserId: string | null;
  isLoading?: boolean;
  /** Contenido a compartir (opcional) - muestra vista previa */
  sharedContent?: SharedContentPreview;
}

export function NewConversationModal({
  open,
  onOpenChange,
  onSelectUser,
  currentUserId,
  isLoading = false,
  sharedContent,
}: NewConversationModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Query para obtener usuarios
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users-for-chat', currentUserId],
    queryFn: async (): Promise<User[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar, username')
        .neq('id', currentUserId || '')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!currentUserId,
  });

  // Filtrar usuarios por búsqueda
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter((user) => {
      return (
        user.name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query)
      );
    });
  }, [users, searchQuery]);

  const handleSelectUser = (userId: string) => {
    onSelectUser(userId);
    setSearchQuery('');
  };

  // Componente de vista previa del contenido compartido
  const SharedContentPreviewCard = () => {
    if (!sharedContent) return null;
    
    const authorInitials = sharedContent.author?.name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

    return (
      <div className="mb-4 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Share2 className="h-3 w-3" />
          <span>Compartiendo {sharedContent.type === 'status' ? 'estado' : 'publicación'}</span>
        </div>
        
        <div className="flex gap-3">
          {/* Imagen del contenido */}
          {sharedContent.image && (
            <div className="shrink-0">
              <img 
                src={sharedContent.image} 
                alt="Contenido" 
                className="w-16 h-16 rounded-md object-cover"
              />
            </div>
          )}
          
          {/* Info del contenido */}
          <div className="flex-1 min-w-0">
            {/* Autor */}
            {sharedContent.author && (
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={sharedContent.author.avatar || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {authorInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate">
                  {sharedContent.author.name}
                </span>
              </div>
            )}
            
            {/* Texto del contenido */}
            {sharedContent.content && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {sharedContent.content}
              </p>
            )}
            
            {/* Fallback si no hay contenido ni imagen */}
            {!sharedContent.content && !sharedContent.image && (
              <p className="text-sm text-muted-foreground italic">
                Sin contenido
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {sharedContent ? 'Enviar a...' : 'Nueva conversación'}
          </DialogTitle>
        </DialogHeader>

        {/* Vista previa del contenido compartido */}
        <SharedContentPreviewCard />

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar usuario..."
            className="pl-9"
          />
        </div>

        {/* Lista de usuarios */}
        <ScrollArea className="h-72">
          {isLoadingUsers ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <p className="text-muted-foreground">
                {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  disabled={isLoading}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left",
                    transitionClasses.colors,
                    hoverClasses.bgAccent,
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar || ''} alt={user.name || ''} />
                    <AvatarFallback>
                      {user.name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name || 'Usuario'}</p>
                    {user.username && (
                      <p className="text-sm text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    )}
                  </div>
                  {isLoading && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
