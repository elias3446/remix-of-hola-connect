/**
 * Componente de estadísticas de usuario
 * Posts, Seguidores, Siguiendo
 */
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserStats } from '@/hooks/entidades';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';
import { cn } from '@/lib/utils';

interface UserStatsCardProps {
  userId?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  userEmail?: string | null;
  className?: string;
}

export function UserStatsCard({
  userId,
  userName,
  userAvatar,
  userEmail,
  className,
}: UserStatsCardProps) {
  const navigate = useNavigate();
  const { stats, isLoading } = useUserStats({ userId });
  const { data: profile } = useOptimizedProfile(userId || undefined);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleCardClick = () => {
    if (profile?.username) {
      navigate(`/perfil/${profile.username}`);
    } else if (userId) {
      navigate(`/perfil/id/${userId}`);
    }
  };

  if (!userId) return null;

  return (
    <Card 
      className={cn("w-full cursor-pointer hover:shadow-md transition-shadow", className)} 
      style={{ maxWidth: '100%', overflow: 'hidden' }}
      onClick={handleCardClick}
    >
      <CardContent className="p-3" style={{ maxWidth: '100%', overflow: 'hidden' }}>
        {/* Avatar y nombre */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{userName || 'Usuario'}</p>
            {userEmail && (
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="min-w-0">
            {isLoading ? (
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
            ) : (
              <p className="text-lg font-bold">{stats.postsCount}</p>
            )}
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="min-w-0">
            {isLoading ? (
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
            ) : (
              <p className="text-lg font-bold">{stats.followersCount}</p>
            )}
            <p className="text-xs text-muted-foreground">Seguidores</p>
          </div>
          <div className="min-w-0">
            {isLoading ? (
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
            ) : (
              <p className="text-lg font-bold">{stats.followingCount}</p>
            )}
            <p className="text-xs text-muted-foreground">Siguiendo</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
