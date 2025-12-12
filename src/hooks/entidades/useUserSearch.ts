/**
 * Hook optimizado para búsqueda de usuarios
 * Incluye búsqueda básica y avanzada (hashtags y menciones)
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/optimizacion';

export interface UserSearchResult {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  email: string | null;
}

export interface HashtagSearchResult {
  id: string;
  nombre: string;
  uso_count: number;
}

export interface MentionSearchResult {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
}

interface UseUserSearchOptions {
  enabled?: boolean;
  limit?: number;
  currentUserId?: string | null; // Para excluir el usuario actual de los resultados
}

export function useUserSearch(options: UseUserSearchOptions = {}) {
  const { enabled = true, limit = 10, currentUserId } = options;
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: users, isLoading } = useQuery({
    queryKey: ['user-search', debouncedSearch, currentUserId],
    queryFn: async (): Promise<UserSearchResult[]> => {
      if (!debouncedSearch || debouncedSearch.length < 1) return [];

      // Limpiar el término de búsqueda
      const searchTermClean = debouncedSearch.trim();
      const isUsernameSearch = searchTermClean.startsWith('@');
      const cleanSearch = isUsernameSearch ? searchTermClean.slice(1) : searchTermClean;

      if (!cleanSearch || cleanSearch.length < 1) return [];

      let query = supabase
        .from('profiles')
        .select('id, name, username, avatar, email')
        .is('deleted_at', null);

      // Excluir usuario actual si se proporciona
      if (currentUserId) {
        query = query.neq('id', currentUserId);
      }

      if (isUsernameSearch) {
        // Si empieza con @, buscar solo por username
        query = query.ilike('username', `%${cleanSearch}%`);
      } else {
        // Buscar por nombre, username o email
        query = query.or(`name.ilike.%${cleanSearch}%,username.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`);
      }

      const { data, error } = await query.limit(limit);

      if (error) {
        console.error('[useUserSearch] Error:', error);
        throw error;
      }
      return data || [];
    },
    enabled: enabled && debouncedSearch.length >= 1,
    staleTime: 30000,
  });

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    users: users || [],
    isLoading,
    clearSearch,
  };
}

/**
 * Hook para búsqueda avanzada de hashtags
 */
export function useHashtagSearch(options: UseUserSearchOptions = {}) {
  const { enabled = true, limit = 20 } = options;
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: hashtags, isLoading } = useQuery({
    queryKey: ['hashtag-search', debouncedSearch],
    queryFn: async (): Promise<HashtagSearchResult[]> => {
      if (!debouncedSearch) {
        // Si no hay búsqueda, retornar hashtags populares
        const { data, error } = await supabase
          .from('hashtags')
          .select('id, nombre, uso_count')
          .order('uso_count', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data || [];
      }

      const { data, error } = await supabase
        .from('hashtags')
        .select('id, nombre, uso_count')
        .ilike('nombre', `%${debouncedSearch}%`)
        .order('uso_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
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
    hashtags: hashtags || [],
    isLoading,
    clearSearch,
  };
}

/**
 * Hook para búsqueda de menciones (@usuarios)
 */
export function useMentionSearch(options: UseUserSearchOptions = {}) {
  const { enabled = true, limit = 10 } = options;
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: mentions, isLoading } = useQuery({
    queryKey: ['mention-search', debouncedSearch],
    queryFn: async (): Promise<MentionSearchResult[]> => {
      if (!debouncedSearch || debouncedSearch.length < 1) return [];

      // Remover @ si existe
      const cleanSearch = debouncedSearch.startsWith('@') 
        ? debouncedSearch.slice(1) 
        : debouncedSearch;

      if (!cleanSearch) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .is('deleted_at', null)
        .or(`name.ilike.%${cleanSearch}%,username.ilike.%${cleanSearch}%`)
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && debouncedSearch.length >= 1,
    staleTime: 30000,
  });

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    mentions: mentions || [],
    isLoading,
    clearSearch,
  };
}

/**
 * Hook combinado para búsqueda avanzada
 */
export function useAdvancedSearch() {
  const [activeTab, setActiveTab] = useState<'hashtags' | 'mentions'>('hashtags');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);

  const hashtagSearch = useHashtagSearch();
  const mentionSearch = useMentionSearch();

  const addHashtag = useCallback((hashtag: string) => {
    const cleanTag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
    if (!selectedHashtags.includes(cleanTag)) {
      setSelectedHashtags(prev => [...prev, cleanTag]);
    }
  }, [selectedHashtags]);

  const removeHashtag = useCallback((hashtag: string) => {
    setSelectedHashtags(prev => prev.filter(h => h !== hashtag));
  }, []);

  const addMention = useCallback((mention: string) => {
    const cleanMention = mention.startsWith('@') ? mention.slice(1) : mention;
    if (!selectedMentions.includes(cleanMention)) {
      setSelectedMentions(prev => [...prev, cleanMention]);
    }
  }, [selectedMentions]);

  const removeMention = useCallback((mention: string) => {
    setSelectedMentions(prev => prev.filter(m => m !== mention));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedHashtags([]);
    setSelectedMentions([]);
    hashtagSearch.clearSearch();
    mentionSearch.clearSearch();
  }, [hashtagSearch, mentionSearch]);

  const hasFilters = useMemo(() => 
    selectedHashtags.length > 0 || selectedMentions.length > 0,
    [selectedHashtags, selectedMentions]
  );

  return {
    activeTab,
    setActiveTab,
    selectedHashtags,
    selectedMentions,
    addHashtag,
    removeHashtag,
    addMention,
    removeMention,
    clearAll,
    hasFilters,
    hashtagSearch,
    mentionSearch,
  };
}
