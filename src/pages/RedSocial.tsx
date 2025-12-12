/**
 * Página de Red Social
 * Feed con publicaciones y estados
 */
import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { type SearchFilters } from '@/hooks/entidades';
import { 
  StatusSection, 
  CreatePostCard, 
  PostFeed,
  UserSearchCard,
  AdvancedSearchCard,
  UserStatsCard,
  TrendingHashtagsCard,
  TrendingPostsCard,
  SuggestedUsersCard,
  SocialSidebarMobile,
  StickyAside,
} from '@/components/redsocial';

export default function RedSocial() {
  const { user } = useAuth();
  const { data: profile } = useOptimizedProfile(user?.id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Estado para filtros de búsqueda avanzada
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);
  
  // Obtener parámetros de query para abrir contenido específico
  const openEstadoId = searchParams.get('estado');

  const handleUserClick = (userId: string) => {
    navigate(`/perfil/id/${userId}`);
  };

  const handlePostClick = (postId: string) => {
    navigate(`/red-social/post/${postId}`);
  };

  const handleHashtagClick = useCallback((hashtag: string) => {
    // Agregar hashtag a los filtros de búsqueda
    const cleanTag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
    setSearchFilters(prev => ({
      hashtags: [...(prev?.hashtags || []), cleanTag.toLowerCase()],
      mentions: prev?.mentions || [],
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchFilters(null);
  }, []);

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full">
        {/* Header con EntityPageHeader */}
        <EntityPageHeader
          title="Red Social"
          description="Feed con publicaciones y estados"
          icon={Users}
          entityKey="red-social"
          showCreate={false}
          showBulkUpload={false}
          rightContent={
            <div className="lg:hidden">
              <SocialSidebarMobile
                userId={profile?.id}
                userName={profile?.name}
                userAvatar={profile?.avatar}
                userEmail={profile?.email}
                onUserClick={handleUserClick}
                onPostClick={handlePostClick}
                onHashtagClick={handleHashtagClick}
                onViewAllTrending={() => navigate('/red-social/trending')}
              />
            </div>
          }
        />

        <div className="flex gap-4 lg:gap-6 items-start">
          {/* Feed principal */}
          <div className="flex-1 min-w-0 space-y-4">
            <StatusSection
              currentUserId={profile?.id}
              currentUserAvatar={profile?.avatar}
              currentUserName={profile?.name}
              openEstadoId={openEstadoId}
            />

            <CreatePostCard
              userAvatar={profile?.avatar}
              userName={profile?.name}
              userUsername={profile?.username}
              userId={profile?.id}
            />

            <PostFeed 
              userId={profile?.id} 
              placeholderCount={3}
              searchFilters={searchFilters}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Sidebar derecho - sticky estilo X */}
          <StickyAside>
            <div className="space-y-4">
              <UserSearchCard onUserSelect={handleUserClick} />
              
              <AdvancedSearchCard 
                onFiltersChange={setSearchFilters}
                currentUserId={profile?.id}
              />
              
              <UserStatsCard
                userId={profile?.id}
                userName={profile?.name}
                userAvatar={profile?.avatar}
                userEmail={profile?.email}
              />
              
              <TrendingHashtagsCard onHashtagClick={handleHashtagClick} />
              
              <TrendingPostsCard 
                onPostClick={handlePostClick}
                onViewAll={() => navigate('/red-social/trending')}
              />
              
              <SuggestedUsersCard
                currentUserId={profile?.id}
                onUserClick={handleUserClick}
              />
            </div>
          </StickyAside>
        </div>
      </div>
    </div>
  );
}