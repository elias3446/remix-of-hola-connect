/**
 * Componente de Usuarios Sugeridos
 * Se oculta automáticamente cuando no hay sugerencias
 */
import { Users, UserPlus, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSuggestedUsers, type SuggestedUser } from '@/hooks/entidades/useSuggestedUsers';
import { cn } from '@/lib/utils';

interface SuggestedUsersCardProps {
  currentUserId?: string | null;
  onUserClick?: (userId: string) => void;
  className?: string;
}

const reasonLabels: Record<SuggestedUser['suggestionReason'], string> = {
  mutual_friends: 'Amigos en común',
  similar_interests: 'Intereses similares',
  popular: 'Popular',
  active: 'Activo',
  new_user: 'Nuevo',
};

export function SuggestedUsersCard({ currentUserId, onUserClick, className }: SuggestedUsersCardProps) {
  const { users, isLoading, isEmpty, followUser, isFollowing } = useSuggestedUsers({
    userId: currentUserId,
    limit: 4,
  });

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleFollow = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    await followUser(userId);
  };

  // No mostrar si no hay usuario actual
  if (!currentUserId) return null;

  // No mostrar si está vacío y no está cargando
  if (isEmpty) return null;

  return (
    <Card className={cn("w-full", className)} style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <CardHeader className="py-3 px-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">Usuarios Sugeridos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-3" style={{ maxWidth: '100%', overflow: 'hidden' }}>
        <div className="space-y-2">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-16 shrink-0" />
                </div>
              ))}
            </>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 py-2 hover:bg-secondary/50 rounded-lg px-2 transition-colors cursor-pointer"
                onClick={() => onUserClick?.(user.id)}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || 'Usuario'}</p>
                  <div className="flex items-center gap-1.5">
                    {user.mutualConnections > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {user.mutualConnections} {user.mutualConnections === 1 ? 'amigo en común' : 'amigos en común'}
                      </span>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {reasonLabels[user.suggestionReason]}
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={(e) => handleFollow(e, user.id)}
                  disabled={isFollowing}
                  className="h-7 text-xs gap-1 shrink-0"
                >
                  <UserPlus className="h-3 w-3" />
                  Seguir
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
