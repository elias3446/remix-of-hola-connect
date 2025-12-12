/**
 * Componente de búsqueda de usuarios estilo Twitter/X
 * Con overlay expandible, búsquedas recientes y resultados en tiempo real
 * - Buscar por nombre, @username o email
 * - Si empieza con @ busca solo por username
 * - Case insensitive
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Clock, TrendingUp, UserPlus, Loader2, Mail, UserCheck, UserX, Clock3, Users, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUserSearch, useOptimizedProfile, useUserRelations, type RelationInfo } from '@/hooks/entidades';
import { cn } from '@/lib/utils';

interface UserSearchCardProps {
  onUserSelect?: (userId: string) => void;
  className?: string;
}

const RECENT_SEARCHES_KEY = 'redsocial_recent_searches';
const MAX_RECENT_SEARCHES = 5;

interface RecentSearch {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  email?: string | null;
  timestamp: number;
}

export function UserSearchCard({ onUserSelect, className }: UserSearchCardProps) {
  const { data: profile } = useOptimizedProfile();
  const currentUserId = profile?.id;
  
  const { searchTerm, setSearchTerm, users, isLoading, clearSearch } = useUserSearch({ 
    currentUserId 
  });
  const { 
    getRelationInfo, 
    follow, 
    unfollow,
    sendFriendRequest, 
    cancelFriendRequest, 
    acceptFriendRequest, 
    rejectFriendRequest, 
    isPending: isRelationPending 
  } = useUserRelations({ 
    currentUserId 
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Marcar como montado después del primer render para evitar auto-focus
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Cargar búsquedas recientes del localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading recent searches:', e);
    }
  }, []);

  // Guardar búsqueda reciente
  const saveRecentSearch = useCallback((user: RecentSearch) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.id !== user.id);
      const updated = [{ ...user, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving recent searches:', e);
      }
      return updated;
    });
  }, []);

  // Eliminar búsqueda reciente
  const removeRecentSearch = useCallback((userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(s => s.id !== userId);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving recent searches:', e);
      }
      return updated;
    });
  }, []);

  // Limpiar todas las búsquedas recientes
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      console.error('Error clearing recent searches:', e);
    }
  }, []);

  // Cerrar el panel
  const closePanel = useCallback(() => {
    setIsExpanded(false);
    clearSearch();
    inputRef.current?.blur();
  }, [clearSearch]);

  // Manejar click/touch fuera del componente
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closePanel();
      }
    };

    // Usar setTimeout para evitar cierre inmediato al abrir
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded, closePanel]);

  // Manejar tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        closePanel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isExpanded, closePanel]);

  const handleFocus = () => {
    // Solo expandir si el componente ya está montado (evita auto-focus inicial)
    if (isMounted) {
      setIsExpanded(true);
    }
  };

  // Manejar click/touch en el input (para móviles donde focus puede no dispararse)
  const handleInputInteraction = () => {
    if (isMounted && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleUserClick = (user: { id: string; name: string | null; username: string | null; avatar: string | null; email?: string | null }) => {
    saveRecentSearch(user as RecentSearch);
    closePanel();
    onUserSelect?.(user.id);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const showResults = searchTerm.length >= 1;
  const showRecent = !showResults && recentSearches.length > 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-3">
        <div ref={containerRef} className="relative w-full">
          {/* Input de búsqueda */}
          <div className={cn(
            "relative w-full transition-all duration-200",
            isExpanded && "z-[60]"
          )}>
            <div className={cn(
              "relative bg-secondary/50 rounded-full border transition-all duration-200",
              isExpanded 
                ? "border-primary shadow-lg ring-1 ring-primary/20 bg-card" 
                : "border-transparent hover:border-muted-foreground/30"
            )}>
              <Search className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                isExpanded ? "text-primary" : "text-muted-foreground"
              )} />
              <Input
                ref={inputRef}
                placeholder="Buscar por nombre, @usuario o email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={handleFocus}
                onClick={handleInputInteraction}
                onTouchStart={handleInputInteraction}
                className="pl-11 pr-10 h-10 bg-transparent border-0 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    clearSearch();
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Dropdown de resultados */}
          {isExpanded && (
            <>
              {/* Overlay de fondo */}
              <div 
                className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[50]" 
                onClick={closePanel}
                onTouchStart={closePanel}
              />
              
              {/* Panel de resultados */}
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-[60] overflow-hidden max-h-[60vh] overflow-y-auto">
                {/* Loading */}
                {isLoading && searchTerm.length >= 1 && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}

                {/* Resultados de búsqueda */}
                {showResults && !isLoading && (
                  <div className="py-2">
                    {users.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Search className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No se encontraron usuarios para "{searchTerm}"
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="px-4 py-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Resultados ({users.length})
                          </span>
                        </div>
                        {users.map((user) => (
                          <UserResultItem
                            key={user.id}
                            user={user}
                            onClick={() => handleUserClick(user)}
                            getInitials={getInitials}
                            relationInfo={getRelationInfo(user.id)}
                            onFollow={() => follow(user.id)}
                            onUnfollow={() => unfollow(user.id)}
                            onSendFriendRequest={() => sendFriendRequest(user.id)}
                            onCancelFriendRequest={() => cancelFriendRequest(user.id)}
                            onAcceptFriendRequest={() => acceptFriendRequest(user.id)}
                            onRejectFriendRequest={() => rejectFriendRequest(user.id)}
                            isActionPending={isRelationPending}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Búsquedas recientes */}
                {showRecent && !isLoading && (
                  <div className="py-2">
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Recientes
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearRecentSearches}
                        className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                      >
                        Borrar todo
                      </Button>
                    </div>
                    {recentSearches.map((user) => (
                      <UserResultItem
                        key={user.id}
                        user={user}
                        onClick={() => handleUserClick(user)}
                        getInitials={getInitials}
                        onRemove={(e) => removeRecentSearch(user.id, e)}
                        showRemove
                      />
                    ))}
                  </div>
                )}

                {/* Estado vacío inicial */}
                {!showResults && !showRecent && !isLoading && (
                  <div className="px-4 py-8 text-center">
                    <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Busca por nombre, @usuario o email
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Usa @ para buscar solo por username
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de item de resultado
interface UserResultItemProps {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
    email?: string | null;
  };
  onClick: () => void;
  getInitials: (name: string | null) => string;
  onRemove?: (e: React.MouseEvent) => void;
  showRemove?: boolean;
  relationInfo?: RelationInfo;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onSendFriendRequest?: () => void;
  onCancelFriendRequest?: () => void;
  onAcceptFriendRequest?: () => void;
  onRejectFriendRequest?: () => void;
  isActionPending?: boolean;
}

function UserResultItem({ 
  user, 
  onClick, 
  getInitials, 
  onRemove, 
  showRemove,
  relationInfo,
  onFollow,
  onUnfollow,
  onSendFriendRequest,
  onCancelFriendRequest,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  isActionPending,
}: UserResultItemProps) {
  
  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const renderActionButtons = () => {
    if (showRemove && onRemove) {
      return (
        <button
          onClick={onRemove}
          className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      );
    }

    if (isActionPending) {
      return (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      );
    }

    const { followStatus, friendStatus, isFollowing, isFriend } = relationInfo || {
      followStatus: 'not_following',
      friendStatus: 'none',
      isFollowing: false,
      isFriend: false,
    };

    return (
      <div className="flex items-center gap-1">
        {/* Botón de Seguir/Siguiendo */}
        {isFollowing ? (
          onUnfollow && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleActionClick(e, onUnfollow)}
              className="h-7 px-2 text-xs gap-1 text-primary"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Siguiendo
            </Button>
          )
        ) : (
          onFollow && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleActionClick(e, onFollow)}
              className="h-7 px-2 text-xs gap-1"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Seguir
            </Button>
          )
        )}

        {/* Botón de Amistad */}
        {friendStatus === 'none' && onSendFriendRequest && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleActionClick(e, onSendFriendRequest)}
            className="h-7 px-2 text-xs gap-1"
            title="Enviar solicitud de amistad"
          >
            <Heart className="h-3.5 w-3.5" />
          </Button>
        )}

        {friendStatus === 'pending_sent' && onCancelFriendRequest && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleActionClick(e, onCancelFriendRequest)}
            className="h-7 px-2 text-xs gap-1 text-amber-500"
            title="Cancelar solicitud de amistad"
          >
            <Clock3 className="h-3.5 w-3.5" />
          </Button>
        )}

        {friendStatus === 'pending_received' && (
          <div className="flex items-center gap-0.5">
            {onAcceptFriendRequest && (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => handleActionClick(e, onAcceptFriendRequest)}
                className="h-7 px-1.5 text-xs"
                title="Aceptar amistad"
              >
                <UserCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {onRejectFriendRequest && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleActionClick(e, onRejectFriendRequest)}
                className="h-7 px-1.5 text-xs text-destructive hover:text-destructive"
                title="Rechazar solicitud"
              >
                <UserX className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {friendStatus === 'friends' && (
          <span className="text-xs text-pink-500 flex items-center gap-1" title="Son amigos">
            <Users className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    );
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 transition-colors text-left group"
    >
      <Avatar className="h-10 w-10 ring-2 ring-border">
        <AvatarImage src={user.avatar || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
          {user.name || 'Usuario'}
        </p>
        <div className="flex flex-col">
          {user.username && (
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
          )}
          {user.email && (
            <p className="text-xs text-muted-foreground/70 truncate flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user.email}
            </p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        {renderActionButtons()}
      </div>
    </button>
  );
}
