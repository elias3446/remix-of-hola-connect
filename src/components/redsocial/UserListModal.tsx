/**
 * Modal para mostrar lista de seguidores/siguiendo
 */
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { transitionClasses } from '@/hooks/optimizacion';

interface UserListItem {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  bio?: string | null;
}

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: UserListItem[];
  isLoading: boolean;
  currentUserId?: string | null;
  followingIds?: string[];
  onFollow?: (userId: string) => void;
  onUnfollow?: (userId: string) => void;
}

function UserListModalComponent({
  isOpen,
  onClose,
  title,
  users,
  isLoading,
  currentUserId,
  followingIds = [],
  onFollow,
  onUnfollow,
}: UserListModalProps) {
  const navigate = useNavigate();

  const handleUserClick = (username: string | null, userId: string) => {
    onClose();
    if (username) {
      navigate(`/perfil/${username}`);
    } else {
      navigate(`/perfil/id/${userId}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 p-6 pb-4 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No hay usuarios para mostrar
            </div>
          ) : (
            <div className="space-y-1 p-4">
              {users.map((user) => {
                const isFollowing = followingIds.includes(user.id);
                const isOwnProfile = currentUserId === user.id;
                const avatarFallback = (user.name || user.username || 'U')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50",
                      transitionClasses.normal
                    )}
                  >
                    <div 
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleUserClick(user.username, user.id)}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {avatarFallback}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate text-sm">
                          {user.name || 'Usuario'}
                        </p>
                        {user.username && (
                          <p className="text-xs text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isOwnProfile && currentUserId && (
                      <Button
                        variant={isFollowing ? "outline" : "default"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFollowing) {
                            onUnfollow?.(user.id);
                          } else {
                            onFollow?.(user.id);
                          }
                        }}
                        className="shrink-0 h-8 px-3 text-xs"
                      >
                        {isFollowing ? (
                          <>
                            <UserMinus className="h-3.5 w-3.5 mr-1" />
                            Siguiendo
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            Seguir
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const UserListModal = memo(UserListModalComponent);
