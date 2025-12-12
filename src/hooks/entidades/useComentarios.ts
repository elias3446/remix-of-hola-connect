/**
 * Hook optimizado para gestionar comentarios de publicaciones
 * Implementa CRUD, respuestas anidadas y actualizaciones en tiempo real
 */
import { useCallback, useRef, useEffect, useState } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface ComentarioAuthor {
  id: string;
  name: string | null;
  avatar: string | null;
  username: string | null;
}

export interface Comentario {
  id: string;
  publicacion_id: string;
  comentario_padre_id: string | null;
  contenido: string;
  imagenes: string[] | null;
  user_id: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  author: ComentarioAuthor | null;
  replies?: Comentario[];
  replies_count?: number;
}

export interface UseComentariosOptions {
  publicacionId: string;
  currentUserId?: string | null;
  enabled?: boolean;
}

export function useComentarios(options: UseComentariosOptions) {
  const { publicacionId, currentUserId, enabled = true } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [showRepliesFor, setShowRepliesFor] = useState<Set<string>>(new Set());

  const queryKey = ['comentarios', publicacionId];

  // Fetch comentarios principales (no respuestas)
  const fetchComentarios = useCallback(async (): Promise<Comentario[]> => {
    const { data: comentarios, error } = await supabase
      .from('comentarios')
      .select(`
        id,
        publicacion_id,
        comentario_padre_id,
        contenido,
        imagenes,
        user_id,
        activo,
        created_at,
        updated_at,
        author:profiles!comentarios_user_id_fkey(
          id,
          name,
          avatar,
          username
        )
      `)
      .eq('publicacion_id', publicacionId)
      .eq('activo', true)
      .is('deleted_at', null)
      .is('comentario_padre_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[useComentarios] Error fetching:', error);
      throw error;
    }

    // Get replies count for each comment
    const commentIds = comentarios?.map(c => c.id) || [];
    const repliesCounts = new Map<string, number>();

    if (commentIds.length > 0) {
      const { data: repliesData } = await supabase
        .from('comentarios')
        .select('comentario_padre_id')
        .in('comentario_padre_id', commentIds)
        .eq('activo', true)
        .is('deleted_at', null);

      repliesData?.forEach(r => {
        if (r.comentario_padre_id) {
          repliesCounts.set(
            r.comentario_padre_id,
            (repliesCounts.get(r.comentario_padre_id) || 0) + 1
          );
        }
      });
    }

    return (comentarios || []).map(c => ({
      ...c,
      author: Array.isArray(c.author) ? c.author[0] : c.author,
      replies_count: repliesCounts.get(c.id) || 0,
    }));
  }, [publicacionId]);

  const {
    data: comentarios = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: fetchComentarios,
    enabled: enabled && !!publicacionId,
    staleTime: 1000 * 30,
  });

  // Fetch replies for a specific comment
  const fetchReplies = useCallback(async (comentarioId: string): Promise<Comentario[]> => {
    const { data: replies, error } = await supabase
      .from('comentarios')
      .select(`
        id,
        publicacion_id,
        comentario_padre_id,
        contenido,
        imagenes,
        user_id,
        activo,
        created_at,
        updated_at,
        author:profiles!comentarios_user_id_fkey(
          id,
          name,
          avatar,
          username
        )
      `)
      .eq('comentario_padre_id', comentarioId)
      .eq('activo', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (replies || []).map(r => ({
      ...r,
      author: Array.isArray(r.author) ? r.author[0] : r.author,
    }));
  }, []);

  const repliesQueryKey = useCallback((commentId: string) => 
    ['comentarios-replies', commentId], []
  );

  // Create comment mutation
  const createComentario = useMutation({
    mutationFn: async (data: {
      contenido: string;
      imagenes?: string[];
      comentario_padre_id?: string;
    }) => {
      if (!currentUserId) throw new Error('Usuario no autenticado');

      const { data: newComment, error } = await supabase
        .from('comentarios')
        .insert({
          publicacion_id: publicacionId,
          user_id: currentUserId,
          contenido: data.contenido,
          imagenes: data.imagenes || null,
          comentario_padre_id: data.comentario_padre_id || null,
        })
        .select(`
          id,
          publicacion_id,
          comentario_padre_id,
          contenido,
          imagenes,
          user_id,
          activo,
          created_at,
          updated_at,
          author:profiles!comentarios_user_id_fkey(
            id,
            name,
            avatar,
            username
          )
        `)
        .single();

      if (error) throw error;
      return newComment;
    },
    onSuccess: async (newComment) => {
      // Update comments cache
      if (newComment.comentario_padre_id) {
        // It's a reply - refetch the parent's replies query immediately
        await queryClient.refetchQueries({ 
          queryKey: ['comentarios-replies', newComment.comentario_padre_id],
          type: 'active'
        });
        
        // Also refetch all active nested replies queries (for deep nesting)
        await queryClient.refetchQueries({
          predicate: (query) => 
            query.queryKey[0] === 'comentarios-replies',
          type: 'active'
        });
        
        // Update replies count in main comments optimistically
        queryClient.setQueryData<Comentario[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map(c => 
            c.id === newComment.comentario_padre_id
              ? { ...c, replies_count: (c.replies_count || 0) + 1 }
              : c
          );
        });
        
        // Also refresh main comments to update nested counts
        await queryClient.refetchQueries({ queryKey, type: 'active' });
      } else {
        // It's a main comment - refetch immediately
        await queryClient.refetchQueries({ queryKey, type: 'active' });
      }
      // Update publicaciones feed count
      queryClient.invalidateQueries({ queryKey: ['publicaciones-feed'] });
    },
    onError: (error) => {
      console.error('Error creando comentario:', error);
      toast.error('Error al crear el comentario');
    },
  });

  // Update comment mutation
  const updateComentario = useMutation({
    mutationFn: async (data: {
      comentarioId: string;
      contenido: string;
    }) => {
      const { error } = await supabase
        .from('comentarios')
        .update({
          contenido: data.contenido,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.comentarioId)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Comentario actualizado');
    },
    onError: (error) => {
      console.error('Error actualizando comentario:', error);
      toast.error('Error al actualizar el comentario');
    },
  });

  // Función recursiva para obtener todos los IDs de comentarios hijos
  const getAllChildrenIds = async (parentId: string): Promise<string[]> => {
    const { data: children } = await supabase
      .from('comentarios')
      .select('id')
      .eq('comentario_padre_id', parentId)
      .eq('activo', true)
      .is('deleted_at', null);
    
    if (!children || children.length === 0) return [];
    
    const childIds = children.map(c => c.id);
    const grandchildIds = await Promise.all(childIds.map(id => getAllChildrenIds(id)));
    
    return [...childIds, ...grandchildIds.flat()];
  };

  // Delete comment mutation (soft delete with cascade to all descendants)
  const deleteComentario = useMutation({
    mutationFn: async (comentarioId: string) => {
      const now = new Date().toISOString();
      
      // Obtener todos los IDs de comentarios descendientes (hijos, nietos, etc.)
      const allChildrenIds = await getAllChildrenIds(comentarioId);
      
      // Eliminar todos los descendientes si existen
      if (allChildrenIds.length > 0) {
        const { error: childrenError } = await supabase
          .from('comentarios')
          .update({
            activo: false,
            deleted_at: now,
          })
          .in('id', allChildrenIds);

        if (childrenError) {
          console.error('Error eliminando respuestas:', childrenError);
        }
      }

      // Luego eliminar el comentario principal
      const { error } = await supabase
        .from('comentarios')
        .update({
          activo: false,
          deleted_at: now,
        })
        .eq('id', comentarioId)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['publicaciones-feed'] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'comentarios-replies' });
      toast.success('Comentario eliminado');
    },
    onError: (error) => {
      console.error('Error eliminando comentario:', error);
      toast.error('Error al eliminar el comentario');
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!enabled || !publicacionId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`comentarios-${publicacionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comentarios',
          filter: `publicacion_id=eq.${publicacionId}`,
        },
        (payload) => {
          // Invalidate main comments
          queryClient.invalidateQueries({ queryKey });
          
          // Invalidate all replies queries for this publication
          queryClient.invalidateQueries({
            predicate: (query) => 
              query.queryKey[0] === 'comentarios-replies'
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, publicacionId, queryClient, queryKey]);

  // Toggle replies visibility
  const toggleReplies = useCallback((comentarioId: string) => {
    setShowRepliesFor(prev => {
      const newSet = new Set(prev);
      if (newSet.has(comentarioId)) {
        newSet.delete(comentarioId);
      } else {
        newSet.add(comentarioId);
      }
      return newSet;
    });
  }, []);

  return {
    comentarios,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    createComentario,
    updateComentario,
    deleteComentario,
    fetchReplies,
    repliesQueryKey,
    showRepliesFor,
    toggleReplies,
    totalCount: comentarios.length,
  };
}

/**
 * Hook for fetching replies of a comment (with nested replies count)
 */
export function useComentarioReplies(
  comentarioId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['comentarios-replies', comentarioId],
    queryFn: async () => {
      if (!comentarioId) return [];
      
      const { data: replies, error } = await supabase
        .from('comentarios')
        .select(`
          id,
          publicacion_id,
          comentario_padre_id,
          contenido,
          imagenes,
          user_id,
          activo,
          created_at,
          updated_at,
          author:profiles!comentarios_user_id_fkey(
            id,
            name,
            avatar,
            username
          )
        `)
        .eq('comentario_padre_id', comentarioId)
        .eq('activo', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get replies count for each reply (for nested replies)
      const replyIds = replies?.map(r => r.id) || [];
      const repliesCounts = new Map<string, number>();

      if (replyIds.length > 0) {
        const { data: nestedRepliesData } = await supabase
          .from('comentarios')
          .select('comentario_padre_id')
          .in('comentario_padre_id', replyIds)
          .eq('activo', true)
          .is('deleted_at', null);

        nestedRepliesData?.forEach(r => {
          if (r.comentario_padre_id) {
            repliesCounts.set(
              r.comentario_padre_id,
              (repliesCounts.get(r.comentario_padre_id) || 0) + 1
            );
          }
        });
      }

      return (replies || []).map(r => ({
        ...r,
        author: Array.isArray(r.author) ? r.author[0] : r.author,
        replies_count: repliesCounts.get(r.id) || 0,
      })) as Comentario[];
    },
    enabled: enabled && !!comentarioId,
    staleTime: 1000 * 30,
  });
}
