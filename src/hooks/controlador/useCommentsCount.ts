import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook ligero para obtener el conteo de comentarios en tiempo real.
 * Sigue el mismo patrón de realtime usado en useComentarios.
 */
export function useCommentsCount(publicacionId: string | undefined, initialCount: number = 0) {
  const [commentsCount, setCommentsCount] = useState(initialCount);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const queryClient = useQueryClient();

  // Sincronizar con initialCount cuando cambia la publicación
  useEffect(() => {
    setCommentsCount(initialCount);
  }, [initialCount, publicacionId]);

  // Función para obtener el conteo actual (solo comentarios principales, sin respuestas)
  const fetchCount = useCallback(async () => {
    if (!publicacionId) return;

    try {
      const { count, error } = await supabase
        .from('comentarios')
        .select('id', { count: 'exact', head: true })
        .eq('publicacion_id', publicacionId)
        .eq('activo', true)
        .is('deleted_at', null)
        .is('comentario_padre_id', null); // Solo comentarios principales

      if (error) throw error;
      setCommentsCount(count ?? 0);
    } catch (error) {
      console.error('Error fetching comments count:', error);
    }
  }, [publicacionId]);

  // Suscripción realtime (mismo patrón que useComentarios)
  useEffect(() => {
    if (!publicacionId) return;

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`comments-count-${publicacionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comentarios',
          filter: `publicacion_id=eq.${publicacionId}`,
        },
        () => {
          // Al recibir cualquier cambio, refetch el conteo
          fetchCount();
          
          // También invalidar queries de comentarios
          queryClient.invalidateQueries({ queryKey: ['comentarios', publicacionId] });
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
  }, [publicacionId, fetchCount, queryClient]);

  return { commentsCount, refetch: fetchCount };
}
