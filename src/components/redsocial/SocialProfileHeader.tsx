/**
 * Header del perfil de red social estilo Facebook/Twitter
 * Muestra cover, avatar, nombre, stats y botones de acción completos
 * Incluye: seguir, amistad, bloquear, silenciar, mensajes
 */
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  UserX,
  MessageCircle, 
  MoreHorizontal,
  Calendar,
  ArrowLeft,
  Ban,
  VolumeX,
  Volume2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HeartHandshake,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import type { UserProfileData } from '@/hooks/entidades/useUserProfile';
import type { RelationInfo } from '@/hooks/entidades/useUserRelations';
import type { BlockInfo } from '@/hooks/entidades/useUserBlocks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SocialProfileHeaderProps {
  profile: UserProfileData | null;
  isLoading: boolean;
  isOwnProfile: boolean;
  relationInfo: RelationInfo;
  blockInfo: BlockInfo;
  isMuted: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  onSendFriendRequest: () => void;
  onCancelFriendRequest: () => void;
  onAcceptFriendRequest: () => void;
  onRejectFriendRequest: () => void;
  onRemoveFriend: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onMute: () => void;
  onUnmute: () => void;
  onMessage: () => void;
  isPending: boolean;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
}

function SocialProfileHeaderComponent({
  profile,
  isLoading,
  isOwnProfile,
  relationInfo,
  blockInfo,
  isMuted,
  onFollow,
  onUnfollow,
  onSendFriendRequest,
  onCancelFriendRequest,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onRemoveFriend,
  onBlock,
  onUnblock,
  onMute,
  onUnmute,
  onMessage,
  isPending,
  onFollowersClick,
  onFollowingClick,
}: SocialProfileHeaderProps) {
  const navigate = useNavigate();

  if (isLoading || !profile) {
    return <SocialProfileHeaderSkeleton />;
  }

  const memberSince = formatDistanceToNow(new Date(profile.created_at), {
    addSuffix: false,
    locale: es,
  });

  const avatarFallback = (profile.name || profile.username || 'U')
    .substring(0, 2)
    .toUpperCase();

  const { isFollowing, isFriend, friendStatus, hasPendingRequestFromThem, hasPendingSentRequest, isFollowingMe } = relationInfo;
  const { isBlockedByMe, isBlockingMe, hasAnyBlock } = blockInfo;

  // Si hay bloqueo, mostrar vista limitada
  if (hasAnyBlock) {
    return (
      <div className={cn("bg-card rounded-xl overflow-hidden shadow-sm border border-border/50", animationClasses.fadeIn)}>
        <div className="h-32 sm:h-48 bg-gradient-to-br from-muted/50 via-muted/30 to-muted/20 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 sm:-mt-20 gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-background shadow-xl opacity-50">
                <AvatarImage src={profile.avatar || undefined} />
                <AvatarFallback className="text-3xl sm:text-4xl font-bold bg-muted text-muted-foreground">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>

              <div className="text-center sm:text-left pb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {profile.name || 'Usuario'}
                </h1>
                {profile.username && (
                  <p className="text-muted-foreground">@{profile.username}</p>
                )}
                <Badge variant="destructive" className="mt-2 gap-1">
                  <Ban className="h-3 w-3" />
                  {isBlockedByMe ? 'Usuario bloqueado' : 'Te ha bloqueado'}
                </Badge>
              </div>
            </div>

            {isBlockedByMe && (
              <div className="flex items-center justify-center sm:justify-end gap-2 pb-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Ban className="h-4 w-4" />
                      Desbloquear
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Desbloquear usuario?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Este usuario podrá volver a seguirte, enviarte mensajes y solicitudes de amistad.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={onUnblock}>Desbloquear</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {isBlockingMe && (
            <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-medium">Este usuario te ha bloqueado</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                No puedes interactuar con este perfil.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-xl overflow-hidden shadow-sm border border-border/50", animationClasses.fadeIn)}>
      {/* Cover Image - Gradiente de fondo */}
      <div className="h-32 sm:h-48 bg-gradient-to-br from-primary/30 via-primary/20 to-accent/20 relative">
        {/* Botón volver */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Profile Info Section */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        {/* Avatar - Posicionado sobre el cover */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 sm:-mt-20 gap-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-background shadow-xl">
              <AvatarImage src={profile.avatar || undefined} />
              <AvatarFallback className="text-3xl sm:text-4xl font-bold bg-primary text-primary-foreground">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>

            {/* Name & Username */}
            <div className="text-center sm:text-left pb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {profile.name || 'Usuario'}
              </h1>
              {profile.username && (
                <p className="text-muted-foreground">@{profile.username}</p>
              )}
              
              {/* Badges de relación */}
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                {isFriend && (
                  <Badge variant="secondary" className="gap-1">
                    <UserCheck className="h-3 w-3" />
                    Amigos
                  </Badge>
                )}
                {isFollowingMe && !isFriend && (
                  <Badge variant="outline" className="gap-1">
                    <UserPlus className="h-3 w-3" />
                    Te sigue
                  </Badge>
                )}
                {hasPendingRequestFromThem && (
                  <Badge variant="default" className="gap-1 animate-pulse">
                    <Clock className="h-3 w-3" />
                    Solicitud pendiente
                  </Badge>
                )}
                {isMuted && (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <VolumeX className="h-3 w-3" />
                    Silenciado
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center sm:justify-end gap-2 pb-2">
            {isOwnProfile ? (
              <Button
                variant="outline"
                onClick={() => navigate('/perfil/editar')}
                className="gap-2"
              >
                Editar perfil
              </Button>
            ) : (
              <>
                {/* Solicitud de amistad pendiente de aceptar */}
                {hasPendingRequestFromThem && (
                  <div className="flex gap-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onAcceptFriendRequest}
                      disabled={isPending}
                      className="gap-1"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Aceptar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRejectFriendRequest}
                      disabled={isPending}
                      className="gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Rechazar</span>
                    </Button>
                  </div>
                )}

                {/* Botón de seguir/dejar de seguir */}
                {!hasPendingRequestFromThem && (
                  isFollowing ? (
                    <Button
                      variant="outline"
                      onClick={onUnfollow}
                      disabled={isPending}
                      className="gap-2"
                    >
                      <UserMinus className="h-4 w-4" />
                      <span className="hidden sm:inline">Siguiendo</span>
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={onFollow}
                      disabled={isPending}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Seguir</span>
                    </Button>
                  )
                )}

                {/* Botón de mensaje */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onMessage}
                  className="shrink-0"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>

                {/* Menú de más opciones */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* Opciones de amistad */}
                    {friendStatus === 'none' && !hasPendingRequestFromThem && (
                      <DropdownMenuItem onClick={onSendFriendRequest}>
                        <HeartHandshake className="h-4 w-4 mr-2" />
                        Enviar solicitud de amistad
                      </DropdownMenuItem>
                    )}
                    
                    {hasPendingSentRequest && (
                      <DropdownMenuItem onClick={onCancelFriendRequest}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar solicitud enviada
                      </DropdownMenuItem>
                    )}
                    
                    {isFriend && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <UserX className="h-4 w-4 mr-2" />
                            Eliminar amistad
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar amistad?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ya no serán amigos. Podrás enviar una nueva solicitud más tarde.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={onRemoveFriend}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    <DropdownMenuSeparator />

                    {/* Silenciar/Desilenciar */}
                    {isMuted ? (
                      <DropdownMenuItem onClick={onUnmute}>
                        <Volume2 className="h-4 w-4 mr-2" />
                        Dejar de silenciar
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={onMute}>
                        <VolumeX className="h-4 w-4 mr-2" />
                        Silenciar usuario
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Bloquear */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive focus:text-destructive"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Bloquear usuario
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Bloquear a {profile.name || 'este usuario'}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              <li>No podrá seguirte ni enviarte solicitudes</li>
                              <li>No podrá enviarte mensajes</li>
                              <li>Si te seguía, dejará de hacerlo automáticamente</li>
                              <li>Cualquier solicitud de amistad será eliminada</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={onBlock}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Bloquear
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 text-foreground text-sm sm:text-base">
            {profile.bio}
          </p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Se unió hace {memberSince}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/50">
          <button
            onClick={() => {}}
            className={cn("text-center group", transitionClasses.normal)}
          >
            <span className="font-bold text-foreground text-lg">
              {profile.postsCount}
            </span>
            <span className="text-muted-foreground text-sm ml-1 group-hover:text-foreground">
              Posts
            </span>
          </button>
          
          <button
            onClick={onFollowersClick}
            className={cn("text-center group", transitionClasses.normal, "hover:underline")}
          >
            <span className="font-bold text-foreground text-lg">
              {profile.followersCount}
            </span>
            <span className="text-muted-foreground text-sm ml-1 group-hover:text-foreground">
              Seguidores
            </span>
          </button>
          
          <button
            onClick={onFollowingClick}
            className={cn("text-center group", transitionClasses.normal, "hover:underline")}
          >
            <span className="font-bold text-foreground text-lg">
              {profile.followingCount}
            </span>
            <span className="text-muted-foreground text-sm ml-1 group-hover:text-foreground">
              Siguiendo
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SocialProfileHeaderSkeleton() {
  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-sm border border-border/50">
      <Skeleton className="h-32 sm:h-48 w-full" />
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 sm:-mt-20 gap-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            <Skeleton className="h-28 w-28 sm:h-36 sm:w-36 rounded-full border-4 border-background" />
            <div className="text-center sm:text-left pb-2 space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
        <Skeleton className="h-16 w-full mt-4" />
        <div className="flex items-center gap-4 mt-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/50">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  );
}

export const SocialProfileHeader = memo(SocialProfileHeaderComponent);
