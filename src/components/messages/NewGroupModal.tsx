/**
 * Modal para crear nuevo grupo
 */
import { useState, useMemo } from 'react';
import { Search, Loader2, X, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { transitionClasses, hoverClasses } from '@/hooks/optimizacion';

interface User {
  id: string;
  name: string | null;
  avatar: string | null;
  username: string | null;
}

interface NewGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGroup: (name: string, participants: string[]) => Promise<void>;
  currentUserId: string | null;
  isLoading?: boolean;
}

export function NewGroupModal({
  open,
  onOpenChange,
  onCreateGroup,
  currentUserId,
  isLoading = false,
}: NewGroupModalProps) {
  const [step, setStep] = useState<'select' | 'name'>(isLoading ? 'name' : 'select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');

  // Query para obtener usuarios
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users-for-group', currentUserId],
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

  const toggleUser = (user: User) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const handleContinue = () => {
    if (selectedUsers.length >= 1) {
      setStep('name');
    }
  };

  const handleCreate = async () => {
    if (groupName.trim() && selectedUsers.length >= 1) {
      await onCreateGroup(groupName.trim(), selectedUsers.map((u) => u.id));
      // Reset state
      setStep('select');
      setSearchQuery('');
      setSelectedUsers([]);
      setGroupName('');
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep('select');
      setSearchQuery('');
      setSelectedUsers([]);
      setGroupName('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' ? 'Agregar participantes' : 'Nombre del grupo'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <>
            {/* Usuarios seleccionados */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2 border-b">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="flex items-center gap-1 pl-1"
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={user.avatar || ''} />
                      <AvatarFallback className="text-[10px]">
                        {user.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{user.name?.split(' ')[0]}</span>
                    <button
                      onClick={() => toggleUser(user)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

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
            <ScrollArea className="h-64">
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
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUsers.some((u) => u.id === user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleUser(user)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg text-left",
                          transitionClasses.colors,
                          hoverClasses.bgAccent,
                          isSelected && "bg-accent"
                        )}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar || ''} />
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
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <DialogFooter>
              <Button
                onClick={handleContinue}
                disabled={selectedUsers.length < 1}
              >
                Continuar ({selectedUsers.length})
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Input para nombre del grupo */}
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nombre del grupo"
              autoFocus
            />

            <p className="text-sm text-muted-foreground">
              Participantes: {selectedUsers.map((u) => u.name?.split(' ')[0]).join(', ')}
            </p>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('select')}>
                Atrás
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!groupName.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear grupo'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
