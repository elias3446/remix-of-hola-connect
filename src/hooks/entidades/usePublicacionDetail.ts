/**
 * Hook para cargar el detalle de una publicación individual
 * Optimizado para la página de detalle con actualizaciones en tiempo real
 */
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Publicacion, PublicacionAuthor } from './usePublicaciones';

interface UsePublicacionDetailOptions {
  publicacionId?: string | null;
  userId?: string | null;
  enabled?: boolean;
}

export function usePublicacionDetail(options: UsePublicacionDetailOptions = {}) {
  const { publicacionId, userId, enabled = true } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const queryKey = ['publicacion-detail', publicacionId, userId];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Publicacion | null> => {
      if (!publicacionId) return null;

      // Obtener la publicación
      const { data: post, error } = await supabase
        .from('publicaciones')
        .select(`
          id,
          contenido,
          imagenes,
          visibilidad,
          created_at,
          updated_at,
          user_id,
          repost_of,
          repost_comentario,
          estado_id,
          activo,
          author:profiles!publicaciones_user_id_fkey(
            id,
            name,
            avatar,
            username
          )
        `)
        .eq('id', publicacionId)
        .eq('activo', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('[usePublicacionDetail] Error:', error);
        throw error;
      }

      if (!post) return null;

      // Obtener conteos
      const [likesRes, commentsRes, sharesRes] = await Promise.all([
        supabase
          .from('interacciones')
          .select('id', { count: 'exact', head: true })
          .eq('publicacion_id', publicacionId)
          .eq('tipo_interaccion', 'me_gusta'),
        supabase
          .from('comentarios')
          .select('id', { count: 'exact', head: true })
          .eq('publicacion_id', publicacionId)
          .eq('activo', true),
        supabase
          .from('publicacion_compartidos')
          .select('id', { count: 'exact', head: true })
          .eq('publicacion_id', publicacionId),
      ]);

      // Obtener interacciones del usuario
      let hasLiked = false;
      let hasSaved = false;

      if (userId) {
        const [likeRes, savedRes] = await Promise.all([
          supabase
            .from('interacciones')
            .select('id')
            .eq('publicacion_id', publicacionId)
            .eq('user_id', userId)
            .eq('tipo_interaccion', 'me_gusta')
            .maybeSingle(),
          supabase
            .from('publicacion_guardadas')
            .select('id')
            .eq('publicacion_id', publicacionId)
            .eq('user_id', userId)
            .maybeSingle(),
        ]);
        hasLiked = !!likeRes.data;
        hasSaved = !!savedRes.data;
      }

      // Obtener publicación original si es repost
      let originalPost = null;
      if (post.repost_of && !post.estado_id) {
        const { data: originalData } = await supabase
          .from('publicaciones')
          .select(`
            id,
            contenido,
            imagenes,
            created_at,
            activo,
            author:profiles!publicaciones_user_id_fkey(
              id,
              name,
              avatar,
              username
            )
          `)
          .eq('id', post.repost_of)
          .maybeSingle();

        if (originalData?.activo) {
          originalPost = {
            id: originalData.id,
            contenido: originalData.contenido,
            imagenes: originalData.imagenes,
            created_at: originalData.created_at,
            author: Array.isArray(originalData.author) ? originalData.author[0] : originalData.author,
          };
        }
      }

      // Obtener estado original si es compartido
      let originalStatus = null;
      if (post.estado_id) {
        const { data: estadoData } = await supabase
          .from('estados')
          .select(`
            id,
            contenido,
            imagenes,
            created_at,
            activo,
            author:profiles!estados_user_id_fkey(
              id,
              name,
              avatar,
              username
            )
          `)
          .eq('id', post.estado_id)
          .maybeSingle();

        if (estadoData?.activo) {
          originalStatus = {
            id: estadoData.id,
            contenido: estadoData.contenido,
            imagenes: estadoData.imagenes,
            created_at: estadoData.created_at,
            author: Array.isArray(estadoData.author) ? estadoData.author[0] : estadoData.author,
          };
        }
      }

      return {
        ...post,
        author: Array.isArray(post.author) ? post.author[0] : post.author,
        likes_count: likesRes.count || 0,
        comments_count: commentsRes.count || 0,
        shares_count: sharesRes.count || 0,
        has_liked: hasLiked,
        has_saved: hasSaved,
        original_post: originalPost,
        original_status: originalStatus,
      } as Publicacion;
    },
    enabled: enabled && !!publicacionId,
    staleTime: 1000 * 30, // 30 segundos
  });

  // Suscripción en tiempo real para comentarios e interacciones
  useEffect(() => {
    if (!enabled || !publicacionId) return;

    // Limpiar canal anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`post-detail-${publicacionId}`)
      // Escuchar cambios en comentarios
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comentarios',
          filter: `publicacion_id=eq.${publicacionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      // Escuchar cambios en interacciones (likes)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interacciones',
          filter: `publicacion_id=eq.${publicacionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      // Escuchar cambios en compartidos
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'publicacion_compartidos',
          filter: `publicacion_id=eq.${publicacionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
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

  return query;
}
