/**
 * Modal para agregar nuevos integrantes a un grupo
 */
import { useState, useMemo } from 'react';
import { Search, Loader2, UserPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { transitionClasses } from '@/hooks/optimizacion';

interface AddGroupMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMembers: (profileIds: string[]) => Promise<boolean>;
  currentUserId: string | null;
  existingMemberIds: string[];
  isLoading?: boolean;
}

interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
}

export function AddGroupMembersModal({
  open,
  onOpenChange,
  onAddMembers,
  currentUserId,
  existingMemberIds,
  isLoading = false,
}: AddGroupMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Obtener lista de usuarios disponibles
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['available-users-for-group', currentUserId, existingMemberIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .is('deleted_at', null)
        .neq('id', currentUserId || '')
        .order('name');

      if (error) throw error;

      // Filtrar usuarios que ya son miembros
      return (data || []).filter(
        (user) => !existingMemberIds.includes(user.id)
      ) as UserProfile[];
    },
    enabled: open && !!currentUserId,
  });

  // Filtrar por búsqueda
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Toggle selección de usuario
  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Handler para agregar
  const handleAdd = async () => {
    if (selectedUsers.length === 0) return;

    setIsAdding(true);
    const success = await onAddMembers(selectedUsers);
    setIsAdding(false);

    if (success) {
      setSelectedUsers([]);
      setSearchQuery('');
      onOpenChange(false);
    }
  };

  // Reset al cerrar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedUsers([]);
      setSearchQuery('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Agregar integrantes
          </DialogTitle>
        </DialogHeader>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar usuarios..."
            className="pl-9"
          />
        </div>

        {/* Lista de usuarios */}
        <ScrollArea className="h-64">
          {isLoadingUsers ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? 'No se encontraron usuarios'
                  : 'No hay usuarios disponibles para agregar'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.id);

                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-lg text-left",
                      transitionClasses.colors,
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <Avatar className="w-10 h-10">
                      {user.avatar && (
                        <AvatarImage src={user.avatar} alt={user.name || ''} />
                      )}
                      <AvatarFallback>
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user.name || 'Usuario'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{user.username || 'usuario'}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Seleccionados */}
        {selectedUsers.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedUsers.length} usuario(s) seleccionado(s)
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isAdding}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedUsers.length === 0 || isAdding || isLoading}
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Agregando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar ({selectedUsers.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
