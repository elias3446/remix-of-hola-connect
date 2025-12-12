/**
 * Hook avanzado para búsqueda de hashtags, menciones y publicaciones
 * Implementa búsqueda con coincidencias parciales, sugerencias en tiempo real,
 * y filtrado inteligente similar a Facebook/Twitter
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/optimizacion';

// ============ TYPES ============

export interface HashtagResult {
  id: string;
  nombre: string;
  uso_count: number;
  isFollowed?: boolean;
}

export interface MentionResult {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  isFollowing?: boolean;
}

export interface SearchFilters {
  hashtags: string[];
  mentions: string[];
}

export interface FilteredPost {
  id: string;
  contenido: string | null;
  imagenes: string[] | null;
  created_at: string;
  user_id: string | null;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
  } | null;
  matchedHashtags?: string[];
  matchedMentions?: string[];
}

// ============ HASHTAG SEARCH HOOK ============

interface UseHashtagSearchOptions {
  enabled?: boolean;
  limit?: number;
  currentUserId?: string | null;
  showTrending?: boolean;
}

export function useHashtagSearch(options: UseHashtagSearchOptions = {}) {
  const { enabled = true, limit = 15, currentUserId, showTrending = true } = options;
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 200);
  
  // Limpiar el # si el usuario lo incluye
  const cleanSearch = useMemo(() => {
    const term = debouncedSearch.trim();
    return term.startsWith('#') ? term.slice(1) : term;
  }, [debouncedSearch]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['hashtag-search-advanced', cleanSearch, currentUserId, limit],
    queryFn: async (): Promise<HashtagResult[]> => {
      // Si hay búsqueda, buscar con coincidencia parcial
      if (cleanSearch && cleanSearch.length >= 1) {
        const { data: hashtags, error } = await supabase
          .from('hashtags')
          .select('id, nombre, uso_count')
          .ilike('nombre', `%${cleanSearch}%`)
          .order('uso_count', { ascending: false })
          .limit(limit);

        if (error) throw error;

        // Obtener hashtags seguidos por el usuario
        let followedIds: string[] = [];
        if (currentUserId) {
          const { data: follows } = await supabase
            .from('user_hashtag_follows')
            .select('hashtag_id')
            .eq('user_id', currentUserId);
          followedIds = follows?.map(f => f.hashtag_id) || [];
        }

        return (hashtags || []).map(h => ({
          id: h.id,
          nombre: h.nombre,
          uso_count: h.uso_count || 0,
          isFollowed: followedIds.includes(h.id),
        }));
      }

      // Sin búsqueda: mostrar trending o populares
      if (showTrending) {
        const { data: hashtags, error } = await supabase
          .from('hashtags')
          .select('id, nombre, uso_count')
          .order('uso_count', { ascending: false })
          .limit(limit);

        if (error) throw error;

        let followedIds: string[] = [];
        if (currentUserId) {
          const { data: follows } = await supabase
            .from('user_hashtag_follows')
            .select('hashtag_id')
            .eq('user_id', currentUserId);
          followedIds = follows?.map(f => f.hashtag_id) || [];
        }

        return (hashtags || []).map(h => ({
          id: h.id,
          nombre: h.nombre,
          uso_count: h.uso_count || 0,
          isFollowed: followedIds.includes(h.id),
        }));
      }

      return [];
    },
    enabled,
    staleTime: 30000,
  });

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    cleanSearch,
    hashtags: data || [],
    isLoading: isLoading || isFetching,
    clearSearch,
  };
}

// ============ MENTION SEARCH HOOK ============

interface UseMentionSearchOptions {
  enabled?: boolean;
  limit?: number;
  currentUserId?: string | null;
  excludeCurrentUser?: boolean;
}

export function useMentionSearch(options: UseMentionSearchOptions = {}) {
  const { enabled = true, limit = 10, currentUserId, excludeCurrentUser = true } = options;
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 200);

  // Limpiar el @ si el usuario lo incluye
  const cleanSearch = useMemo(() => {
    const term = debouncedSearch.trim();
    return term.startsWith('@') ? term.slice(1) : term;
  }, [debouncedSearch]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['mention-search-advanced', cleanSearch, currentUserId, limit],
    queryFn: async (): Promise<MentionResult[]> => {
      if (!cleanSearch || cleanSearch.length < 1) return [];

      let query = supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .is('deleted_at', null);

      // Excluir usuario actual
      if (excludeCurrentUser && currentUserId) {
        query = query.neq('id', currentUserId);
      }

      // Búsqueda por nombre o username con coincidencia parcial
      query = query.or(`name.ilike.%${cleanSearch}%,username.ilike.%${cleanSearch}%`);
      
      const { data: users, error } = await query.limit(limit);

      if (error) throw error;

      // Obtener relaciones de seguimiento
      let followingIds: string[] = [];
      if (currentUserId) {
        const { data: relations } = await supabase
          .from('relaciones')
          .select('user_id')
          .eq('seguidor_id', currentUserId)
          .eq('estado', 'aceptado');
        followingIds = relations?.map(r => r.user_id).filter(Boolean) as string[] || [];
      }

      return (users || []).map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        isFollowing: followingIds.includes(u.id),
      }));
    },
    enabled: enabled && cleanSearch.length >= 1,
    staleTime: 30000,
  });

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    cleanSearch,
    mentions: data || [],
    isLoading: isLoading || isFetching,
    clearSearch,
  };
}

// ============ FILTERED POSTS BY HASHTAGS/MENTIONS HOOK ============

interface UseFilteredPostsOptions {
  filters: SearchFilters;
  enabled?: boolean;
  limit?: number;
  currentUserId?: string | null;
}

export function useFilteredPosts(options: UseFilteredPostsOptions) {
  const { filters, enabled = true, limit = 20, currentUserId } = options;
  const hasFilters = filters.hashtags.length > 0 || filters.mentions.length > 0;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['filtered-posts', filters, currentUserId, limit],
    queryFn: async (): Promise<FilteredPost[]> => {
      const results: FilteredPost[] = [];
      const addedPostIds = new Set<string>();

      // Buscar por hashtags
      if (filters.hashtags.length > 0) {
        // Primero obtener los IDs de los hashtags
        const { data: hashtagData } = await supabase
          .from('hashtags')
          .select('id, nombre')
          .in('nombre', filters.hashtags.map(h => h.toLowerCase()));

        const hashtagIds = hashtagData?.map(h => h.id) || [];

        if (hashtagIds.length > 0) {
          // Obtener publicaciones con esos hashtags
          const { data: postHashtags } = await supabase
            .from('publicacion_hashtags')
            .select(`
              publicacion_id,
              hashtags!inner(nombre),
              publicaciones!inner(
                id,
                contenido,
                imagenes,
                created_at,
                user_id,
                activo,
                deleted_at,
                author:profiles!publicaciones_user_id_fkey(
                  id,
                  name,
                  username,
                  avatar
                )
              )
            `)
            .in('hashtag_id', hashtagIds)
            .eq('publicaciones.activo', true)
            .is('publicaciones.deleted_at', null)
            .order('publicaciones(created_at)', { ascending: false })
            .limit(limit);

          postHashtags?.forEach((ph: any) => {
            const post = ph.publicaciones;
            if (post && !addedPostIds.has(post.id)) {
              addedPostIds.add(post.id);
              results.push({
                id: post.id,
                contenido: post.contenido,
                imagenes: post.imagenes,
                created_at: post.created_at,
                user_id: post.user_id,
                author: Array.isArray(post.author) ? post.author[0] : post.author,
                matchedHashtags: [ph.hashtags?.nombre].filter(Boolean),
              });
            }
          });
        }
      }

      // Buscar por menciones
      if (filters.mentions.length > 0) {
        // Primero obtener los IDs de los usuarios mencionados
        const { data: mentionedUsers } = await supabase
          .from('profiles')
          .select('id, username')
          .in('username', filters.mentions.map(m => m.toLowerCase()));

        const mentionedUserIds = mentionedUsers?.map(u => u.id) || [];

        if (mentionedUserIds.length > 0) {
          // Obtener publicaciones que mencionan a esos usuarios
          const { data: postMentions } = await supabase
            .from('publicacion_menciones')
            .select(`
              publicacion_id,
              mentioned_user_id,
              profiles!publicacion_menciones_mentioned_user_id_fkey(username),
              publicaciones!inner(
                id,
                contenido,
                imagenes,
                created_at,
                user_id,
                activo,
                deleted_at,
                author:profiles!publicaciones_user_id_fkey(
                  id,
                  name,
                  username,
                  avatar
                )
              )
            `)
            .in('mentioned_user_id', mentionedUserIds)
            .eq('publicaciones.activo', true)
            .is('publicaciones.deleted_at', null)
            .order('publicaciones(created_at)', { ascending: false })
            .limit(limit);

          postMentions?.forEach((pm: any) => {
            const post = pm.publicaciones;
            if (post && !addedPostIds.has(post.id)) {
              addedPostIds.add(post.id);
              results.push({
                id: post.id,
                contenido: post.contenido,
                imagenes: post.imagenes,
                created_at: post.created_at,
                user_id: post.user_id,
                author: Array.isArray(post.author) ? post.author[0] : post.author,
                matchedMentions: [pm.profiles?.username].filter(Boolean),
              });
            } else if (post && addedPostIds.has(post.id)) {
              // Agregar mención adicional al post existente
              const existing = results.find(r => r.id === post.id);
              if (existing && pm.profiles?.username) {
                existing.matchedMentions = [...(existing.matchedMentions || []), pm.profiles.username];
              }
            }
          });
        }
      }

      // Ordenar por fecha
      return results.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, limit);
    },
    enabled: enabled && hasFilters,
    staleTime: 30000,
  });

  return {
    posts: data || [],
    isLoading: isLoading || isFetching,
    hasFilters,
    refetch,
  };
}

// ============ COMBINED ADVANCED SEARCH HOOK ============

interface UseAdvancedSearchOptions {
  currentUserId?: string | null;
  onSearch?: (filters: SearchFilters) => void;
}

export function useAdvancedSearch(options: UseAdvancedSearchOptions = {}) {
  const { currentUserId, onSearch } = options;
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'hashtags' | 'mentions'>('hashtags');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Hooks de búsqueda
  const hashtagSearch = useHashtagSearch({ 
    currentUserId, 
    showTrending: true,
    limit: 15,
  });
  
  const mentionSearch = useMentionSearch({ 
    currentUserId,
    excludeCurrentUser: true,
    limit: 10,
  });

  // Filters object
  const filters = useMemo<SearchFilters>(() => ({
    hashtags: selectedHashtags,
    mentions: selectedMentions,
  }), [selectedHashtags, selectedMentions]);

  // Hook para posts filtrados
  const filteredPosts = useFilteredPosts({
    filters,
    currentUserId,
    enabled: isSearching,
    limit: 50,
  });

  // Actions
  const addHashtag = useCallback((hashtag: string) => {
    const cleanTag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
    const normalizedTag = cleanTag.toLowerCase().trim();
    
    if (normalizedTag && !selectedHashtags.includes(normalizedTag)) {
      setSelectedHashtags(prev => [...prev, normalizedTag]);
      hashtagSearch.clearSearch();
    }
  }, [selectedHashtags, hashtagSearch]);

  const removeHashtag = useCallback((hashtag: string) => {
    setSelectedHashtags(prev => prev.filter(h => h !== hashtag));
  }, []);

  const addMention = useCallback((mention: string) => {
    const cleanMention = mention.startsWith('@') ? mention.slice(1) : mention;
    const normalizedMention = cleanMention.toLowerCase().trim();
    
    if (normalizedMention && !selectedMentions.includes(normalizedMention)) {
      setSelectedMentions(prev => [...prev, normalizedMention]);
      mentionSearch.clearSearch();
    }
  }, [selectedMentions, mentionSearch]);

  const removeMention = useCallback((mention: string) => {
    setSelectedMentions(prev => prev.filter(m => m !== mention));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedHashtags([]);
    setSelectedMentions([]);
    setIsSearching(false);
    hashtagSearch.clearSearch();
    mentionSearch.clearSearch();
  }, [hashtagSearch, mentionSearch]);

  const executeSearch = useCallback(() => {
    if (selectedHashtags.length > 0 || selectedMentions.length > 0) {
      setIsSearching(true);
      onSearch?.(filters);
    }
  }, [selectedHashtags, selectedMentions, filters, onSearch]);

  const hasFilters = useMemo(() => 
    selectedHashtags.length > 0 || selectedMentions.length > 0,
    [selectedHashtags, selectedMentions]
  );

  return {
    // Tab state
    activeTab,
    setActiveTab,
    
    // Selected filters
    selectedHashtags,
    selectedMentions,
    filters,
    hasFilters,
    
    // Actions
    addHashtag,
    removeHashtag,
    addMention,
    removeMention,
    clearAll,
    executeSearch,
    
    // Search state
    isSearching,
    setIsSearching,
    
    // Search hooks
    hashtagSearch,
    mentionSearch,
    
    // Filtered results
    filteredPosts,
  };
}

// ============ INLINE HASHTAG/MENTION DETECTOR HOOK ============
// Para detectar hashtags y menciones mientras el usuario escribe (ej: en CreatePostCard)

interface UseInlineDetectorOptions {
  enabled?: boolean;
  currentUserId?: string | null;
}

export function useInlineDetector(text: string, options: UseInlineDetectorOptions = {}) {
  const { enabled = true, currentUserId } = options;
  
  // Detectar si el usuario está escribiendo un hashtag o mención
  const activeInput = useMemo(() => {
    if (!text) return null;
    
    // Buscar el último # o @ que no tenga espacio después
    const hashtagMatch = text.match(/#(\w*)$/);
    const mentionMatch = text.match(/@(\w*)$/);
    
    if (hashtagMatch) {
      return { type: 'hashtag' as const, query: hashtagMatch[1], position: text.lastIndexOf('#') };
    }
    if (mentionMatch) {
      return { type: 'mention' as const, query: mentionMatch[1], position: text.lastIndexOf('@') };
    }
    
    return null;
  }, [text]);

  // Búsqueda de hashtags
  const hashtagQuery = activeInput?.type === 'hashtag' ? activeInput.query : '';
  const { data: hashtagSuggestions } = useQuery({
    queryKey: ['inline-hashtag-suggestions', hashtagQuery],
    queryFn: async () => {
      if (!hashtagQuery) {
        // Mostrar populares
        const { data } = await supabase
          .from('hashtags')
          .select('id, nombre, uso_count')
          .order('uso_count', { ascending: false })
          .limit(5);
        return data || [];
      }
      
      const { data } = await supabase
        .from('hashtags')
        .select('id, nombre, uso_count')
        .ilike('nombre', `%${hashtagQuery}%`)
        .order('uso_count', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: enabled && activeInput?.type === 'hashtag',
    staleTime: 30000,
  });

  // Búsqueda de menciones
  const mentionQuery = activeInput?.type === 'mention' ? activeInput.query : '';
  const { data: mentionSuggestions } = useQuery({
    queryKey: ['inline-mention-suggestions', mentionQuery, currentUserId],
    queryFn: async () => {
      if (!mentionQuery || mentionQuery.length < 1) return [];
      
      let query = supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .is('deleted_at', null)
        .or(`name.ilike.%${mentionQuery}%,username.ilike.%${mentionQuery}%`);
      
      if (currentUserId) {
        query = query.neq('id', currentUserId);
      }
      
      const { data } = await query.limit(5);
      return data || [];
    },
    enabled: enabled && activeInput?.type === 'mention' && mentionQuery.length >= 1,
    staleTime: 30000,
  });

  return {
    activeInput,
    hashtagSuggestions: hashtagSuggestions || [],
    mentionSuggestions: mentionSuggestions || [],
    isActive: !!activeInput,
  };
}

// ============ EXTRACT HASHTAGS AND MENTIONS FROM TEXT ============

export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#(\w+)/g);
  return matches ? [...new Set(matches.map(m => m.slice(1).toLowerCase()))] : [];
}

export function extractMentions(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/@(\w+)/g);
  return matches ? [...new Set(matches.map(m => m.slice(1).toLowerCase()))] : [];
}
