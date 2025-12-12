/**
 * Vista completa del perfil de red social
 * Incluye header, tabs y lista de posts usando PostFeed
 */
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Image, Bookmark, Star, TrendingUp } from 'lucide-react';
import { TrendingDashboard } from '@/components/dashboard/TrendingDashboard';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';
import { useUserProfile, useUserFollowers, useUserFollowing } from '@/hooks/entidades/useUserProfile';
import { useUserRelations } from '@/hooks/entidades/useUserRelations';
import { useUserBlocks } from '@/hooks/entidades/useUserBlocks';
import { useRealtimeRelations } from '@/hooks/entidades/useRealtimeRelations';
import { useMutedUsers } from '@/hooks/messages/useMutedUsers';
import { useConversations } from '@/hooks/messages/useConversations';
import { SocialProfileHeader } from './SocialProfileHeader';
import { UserListModal } from './UserListModal';
import { PostFeed } from './PostFeed';
import { SavedTabContent } from './SavedTabContent';
import { LoadingScreen } from '@/components/LoadingScreen';

interface SocialProfileViewProps {
  username?: string;
  userId?: string;
}

export function SocialProfileView({ username, userId }: SocialProfileViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: currentUserProfile } = useOptimizedProfile(user?.id);
  const currentUserId = currentUserProfile?.id;
  const [isNavigatingToMessages, setIsNavigatingToMessages] = useState(false);

  // Cargar perfil del usuario a ver
  const { data: profile, isLoading: loadingProfile } = useUserProfile({
    username,
    userId,
  });

  const profileUserId = profile?.id;
  const isOwnProfile = currentUserId === profileUserId;

  // Cargar relaciones
  const {
    getRelationInfo,
    follow,
    unfollow,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    isPending: relationsPending,
    relations,
  } = useUserRelations({ currentUserId });

  // Suscribirse a cambios en tiempo real de las relaciones
  useRealtimeRelations({ currentUserId, enabled: !!currentUserId });

  // Cargar bloqueos
  const {
    getBlockInfo,
    blockUser,
    unblockUser,
    isPending: blocksPending,
  } = useUserBlocks({ currentUserId });

  // Cargar usuarios silenciados
  const {
    isUserMuted,
    muteUser,
    unmuteUser,
  } = useMutedUsers();

  // Conversaciones para crear nueva
  const { createConversation } = useConversations();

  // Estado para modales
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  // Cargar seguidores y siguiendo SOLO cuando se abren los modales (lazy loading)
  const { data: followers, isLoading: loadingFollowers } = useUserFollowers(
    profileUserId || null, 
    showFollowers // Solo cargar cuando el modal está abierto
  );
  const { data: following, isLoading: loadingFollowing } = useUserFollowing(
    profileUserId || null,
    showFollowing // Solo cargar cuando el modal está abierto
  );

  // Obtener info de relación con el perfil
  const relationInfo = useMemo(() => {
    if (!profileUserId) {
      return {
        followStatus: 'not_following' as const,
        friendStatus: 'none' as const,
        isFollowing: false,
        isFollowingMe: false,
        isFriend: false,
        hasPendingRequestFromThem: false,
        hasPendingSentRequest: false,
      };
    }
    return getRelationInfo(profileUserId);
  }, [profileUserId, getRelationInfo]);

  // Obtener info de bloqueo con el perfil
  const blockInfo = useMemo(() => {
    if (!profileUserId) {
      return {
        isBlockedByMe: false,
        isBlockingMe: false,
        hasAnyBlock: false,
      };
    }
    return getBlockInfo(profileUserId);
  }, [profileUserId, getBlockInfo]);

  // Verificar si el usuario está silenciado
  const isMuted = useMemo(() => {
    if (!profileUserId) return false;
    return isUserMuted(profileUserId);
  }, [profileUserId, isUserMuted]);

  // IDs de usuarios que sigo (para mostrar en modales)
  const followingIds = useMemo(() => {
    return relations
      .filter(r => r.seguidor_id === currentUserId && r.tipo === 'seguidor' && r.estado === 'aceptado')
      .map(r => r.user_id);
  }, [relations, currentUserId]);

  // Handlers
  const handleFollow = useCallback(() => {
    if (profileUserId) follow(profileUserId);
  }, [profileUserId, follow]);

  const handleUnfollow = useCallback(() => {
    if (profileUserId) unfollow(profileUserId);
  }, [profileUserId, unfollow]);

  const handleSendFriendRequest = useCallback(() => {
    if (profileUserId) sendFriendRequest(profileUserId);
  }, [profileUserId, sendFriendRequest]);

  const handleCancelFriendRequest = useCallback(() => {
    if (profileUserId) cancelFriendRequest(profileUserId);
  }, [profileUserId, cancelFriendRequest]);

  const handleAcceptFriendRequest = useCallback(() => {
    if (profileUserId) acceptFriendRequest(profileUserId);
  }, [profileUserId, acceptFriendRequest]);

  const handleRejectFriendRequest = useCallback(() => {
    if (profileUserId) rejectFriendRequest(profileUserId);
  }, [profileUserId, rejectFriendRequest]);

  const handleRemoveFriend = useCallback(() => {
    if (profileUserId) removeFriend(profileUserId);
  }, [profileUserId, removeFriend]);

  const handleBlock = useCallback(() => {
    if (profileUserId) blockUser(profileUserId);
  }, [profileUserId, blockUser]);

  const handleUnblock = useCallback(() => {
    if (profileUserId) unblockUser(profileUserId);
  }, [profileUserId, unblockUser]);

  const handleMute = useCallback(async () => {
    if (profileUserId) await muteUser(profileUserId);
  }, [profileUserId, muteUser]);

  const handleUnmute = useCallback(async () => {
    if (profileUserId) await unmuteUser(profileUserId);
  }, [profileUserId, unmuteUser]);

  const handleMessage = useCallback(async () => {
    if (!profileUserId || isNavigatingToMessages) return;
    
    // Mostrar pantalla de carga
    setIsNavigatingToMessages(true);
    
    try {
      // Crear o abrir conversación existente
      const conversationId = await createConversation(profileUserId);
      if (conversationId) {
        navigate(`/mensajes?chat=${conversationId}`);
      } else {
        navigate('/mensajes');
      }
    } catch (error) {
      console.error('Error al crear conversación:', error);
      setIsNavigatingToMessages(false);
    }
  }, [profileUserId, createConversation, navigate, isNavigatingToMessages]);

  const handleFollowFromModal = useCallback((targetUserId: string) => {
    follow(targetUserId);
  }, [follow]);

  const handleUnfollowFromModal = useCallback((targetUserId: string) => {
    unfollow(targetUserId);
  }, [unfollow]);

  const isPending = relationsPending || blocksPending;

  if (loadingProfile) {
    return (
      <div className="w-full space-y-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Usuario no encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mostrar pantalla de carga mientras navega a mensajes
  if (isNavigatingToMessages) {
    return <LoadingScreen message="Abriendo conversación..." />;
  }

  return (
    <div className={cn("w-full space-y-4", animationClasses.fadeIn)}>

      {/* Header del perfil */}
      <SocialProfileHeader
        profile={profile}
        isLoading={loadingProfile}
        isOwnProfile={isOwnProfile}
        relationInfo={relationInfo}
        blockInfo={blockInfo}
        isMuted={isMuted}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        onSendFriendRequest={handleSendFriendRequest}
        onCancelFriendRequest={handleCancelFriendRequest}
        onAcceptFriendRequest={handleAcceptFriendRequest}
        onRejectFriendRequest={handleRejectFriendRequest}
        onRemoveFriend={handleRemoveFriend}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
        onMute={handleMute}
        onUnmute={handleUnmute}
        onMessage={handleMessage}
        isPending={isPending}
        onFollowersClick={() => setShowFollowers(true)}
        onFollowingClick={() => setShowFollowing(true)}
      />

      {/* Tabs - Solo mostrar si no hay bloqueo */}
      {!blockInfo.hasAnyBlock && (
        <Card className={cn("overflow-hidden", transitionClasses.card)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 h-auto gap-0 bg-transparent p-0 border-b rounded-none">
              <TabsTrigger
                value="posts"
                className="flex items-center justify-center gap-1.5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs sm:text-sm"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="hidden xs:inline sm:inline">Posts</span>
              </TabsTrigger>
              <TabsTrigger
                value="featured"
                className="flex items-center justify-center gap-1.5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs sm:text-sm"
              >
                <Star className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Destacados</span>
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="flex items-center justify-center gap-1.5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs sm:text-sm"
              >
                <Image className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Media</span>
              </TabsTrigger>
              {isOwnProfile && (
                <>
                  <TabsTrigger
                    value="saved"
                    className="flex items-center justify-center gap-1.5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs sm:text-sm"
                  >
                    <Bookmark className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Guardadas</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="trending"
                    className="flex items-center justify-center gap-1.5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs sm:text-sm"
                  >
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Trending</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="posts" className="p-4 mt-0">
              <PostFeed 
                userId={currentUserId} 
                authorId={profileUserId} 
                placeholderCount={3} 
                emptyMessage="Este usuario aún no tiene publicaciones"
              />
            </TabsContent>

            <TabsContent value="featured" className="p-4 mt-0">
              <PostFeed 
                userId={currentUserId} 
                profileUserId={profileUserId}
                placeholderCount={3} 
                featuredOnly 
                emptyMessage="Este usuario aún no tiene publicaciones destacadas"
              />
            </TabsContent>

            <TabsContent value="media" className="p-4 mt-0">
              <PostFeed 
                userId={currentUserId} 
                authorId={profileUserId} 
                placeholderCount={3} 
                filterMedia 
                emptyMessage="Este usuario aún no tiene publicaciones con media"
              />
            </TabsContent>

            {isOwnProfile && (
              <>
                <TabsContent value="saved" className="p-4 mt-0">
                  <SavedTabContent userId={currentUserId} />
                </TabsContent>
                <TabsContent value="trending" className="p-4 mt-0">
                  <TrendingDashboard userId={currentUserId} />
                </TabsContent>
              </>
            )}
          </Tabs>
        </Card>
      )}

      {/* Modal de seguidores */}
      <UserListModal
        isOpen={showFollowers}
        onClose={() => setShowFollowers(false)}
        title="Seguidores"
        users={followers || []}
        isLoading={loadingFollowers}
        currentUserId={currentUserId}
        followingIds={followingIds}
        onFollow={handleFollowFromModal}
        onUnfollow={handleUnfollowFromModal}
      />

      {/* Modal de siguiendo */}
      <UserListModal
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        title="Siguiendo"
        users={following || []}
        isLoading={loadingFollowing}
        currentUserId={currentUserId}
        followingIds={followingIds}
        onFollow={handleFollowFromModal}
        onUnfollow={handleUnfollowFromModal}
      />
    </div>
  );
}
