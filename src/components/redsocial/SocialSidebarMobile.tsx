/**
 * Sidebar de Red Social para móviles
 * Contiene búsqueda, tendencias, sugerencias
 */
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserSearchCard } from './UserSearchCard';
import { AdvancedSearchCard } from './AdvancedSearchCard';
import { UserStatsCard } from './UserStatsCard';
import { TrendingHashtagsCard } from './TrendingHashtagsCard';
import { TrendingPostsCard } from './TrendingPostsCard';
import { SuggestedUsersCard } from './SuggestedUsersCard';

interface SocialSidebarMobileProps {
  userId?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  userEmail?: string | null;
  onUserClick?: (userId: string) => void;
  onPostClick?: (postId: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  onViewAllTrending?: () => void;
}

export function SocialSidebarMobile({
  userId,
  userName,
  userAvatar,
  userEmail,
  onUserClick,
  onPostClick,
  onHashtagClick,
  onViewAllTrending,
}: SocialSidebarMobileProps) {
  const [open, setOpen] = useState(false);

  // Cerrar el menú automáticamente al cambiar a desktop (lg: 1024px)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches && open) {
        setOpen(false);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [open]);

  const handleUserClick = (id: string) => {
    setOpen(false);
    onUserClick?.(id);
  };

  const handlePostClick = (id: string) => {
    setOpen(false);
    onPostClick?.(id);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="p-0 bg-background flex flex-col sm:max-w-md !overflow-x-hidden"
      >
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle className="text-left">Explorar</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 space-y-4 max-w-full box-border">
            <UserSearchCard onUserSelect={handleUserClick} />
            
            <AdvancedSearchCard />
            
            <UserStatsCard
              userId={userId}
              userName={userName}
              userAvatar={userAvatar}
              userEmail={userEmail}
            />
            
            <TrendingHashtagsCard onHashtagClick={onHashtagClick} />
            
            <TrendingPostsCard 
              onPostClick={handlePostClick}
              onViewAll={onViewAllTrending}
            />
            
            <SuggestedUsersCard
              currentUserId={userId}
              onUserClick={handleUserClick}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
