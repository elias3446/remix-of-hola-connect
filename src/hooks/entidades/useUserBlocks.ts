/**
 * Hook para gestionar bloqueos entre usuarios
 * 
 * Funcionalidad:
 * - Bloquear/desbloquear usuarios
 * - Verificar si un usuario está bloqueado
 * - Verificar si estoy bloqueado por un usuario
 * - Al bloquear: elimina follows automáticamente en ambas direcciones
 */
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BlockInfo {
  /** Si yo he bloqueado al usuario */
  isBlockedByMe: boolean;
  /** Si el usuario me ha bloqueado */
  isBlockingMe: boolean;
  /** Si hay algún bloqueo (en cualquier dirección) */
  hasAnyBlock: boolean;
}

interface BlockRelation {
  id: string;
  user_id: string;
  seguidor_id: string;
  tipo: string;
  estado: string;
}

interface UseUserBlocksOptions {
  currentUserId?: string | null;
  enabled?: boolean;
}

export function useUserBlocks(options: UseUserBlocksOptions = {}) {
  const { currentUserId, enabled = true } = options;
  const queryClient = useQueryClient();

  // Query para obtener todos los bloqueos relacionados con el usuario
  const { data: blocks, isLoading } = useQuery({
    queryKey: ['user-blocks', currentUserId],
    queryFn: async (): Promise<BlockRelation[]> => {
      if (!currentUserId) return [];

      const { data, error } = await supabase
        .from('relaciones')
        .select('*')
        .eq('estado', 'bloqueado')
        .or(`user_id.eq.${currentUserId},seguidor_id.eq.${currentUserId}`);

      if (error) throw error;
      return (data || []) as BlockRelation[];
    },
    enabled: enabled && !!currentUserId,
    staleTime: 30000,
  });

  // Obtener información de bloqueo con un usuario específico
  const getBlockInfo = useCallback((targetUserId: string): BlockInfo => {
    const defaultInfo: BlockInfo = {
      isBlockedByMe: false,
      isBlockingMe: false,
      hasAnyBlock: false,
    };

    if (!blocks || !currentUserId || !targetUserId) return defaultInfo;

    // Yo bloqueo al target: seguidor_id = yo, user_id = target
    const blockedByMe = blocks.some(
      b => b.seguidor_id === currentUserId && b.user_id === targetUserId
    );

    // El target me bloquea: seguidor_id = target, user_id = yo
    const blockingMe = blocks.some(
      b => b.seguidor_id === targetUserId && b.user_id === currentUserId
    );

    return {
      isBlockedByMe: blockedByMe,
      isBlockingMe: blockingMe,
      hasAnyBlock: blockedByMe || blockingMe,
    };
  }, [blocks, currentUserId]);

  // Bloquear usuario
  const blockMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('No autenticado');

      // 1. Insertar registro de bloqueo
      const { error: blockError } = await supabase
        .from('relaciones')
        .insert({
          user_id: targetUserId,
          seguidor_id: currentUserId,
          tipo: 'seguidor',
          estado: 'bloqueado',
        });

      if (blockError) throw blockError;

      // 2. Eliminar follows en ambas direcciones
      // - Si yo seguía al target
      await supabase
        .from('relaciones')
        .delete()
        .eq('user_id', targetUserId)
        .eq('seguidor_id', currentUserId)
        .eq('tipo', 'seguidor')
        .eq('estado', 'aceptado');

      // - Si el target me seguía
      await supabase
        .from('relaciones')
        .delete()
        .eq('user_id', currentUserId)
        .eq('seguidor_id', targetUserId)
        .eq('tipo', 'seguidor')
        .eq('estado', 'aceptado');

      // 3. Eliminar solicitudes de amistad en ambas direcciones
      await supabase
        .from('relaciones')
        .delete()
        .eq('tipo', 'amigo')
        .or(`and(user_id.eq.${targetUserId},seguidor_id.eq.${currentUserId}),and(user_id.eq.${currentUserId},seguidor_id.eq.${targetUserId})`);

      // 4. Registrar en auditoría (silencioso, no bloquea si falla)
    },
    onMutate: async (targetUserId) => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ['user-blocks', currentUserId] });
      await queryClient.cancelQueries({ queryKey: ['user-relations', currentUserId] });

      // Snapshot previo para rollback
      const previousBlocks = queryClient.getQueryData(['user-blocks', currentUserId]);

      // Optimistic update
      queryClient.setQueryData(['user-blocks', currentUserId], (old: BlockRelation[] | undefined) => [
        ...(old || []),
        {
          id: `temp-${Date.now()}`,
          user_id: targetUserId,
          seguidor_id: currentUserId,
          tipo: 'seguidor',
          estado: 'bloqueado',
        },
      ]);

      return { previousBlocks };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousBlocks) {
        queryClient.setQueryData(['user-blocks', currentUserId], context.previousBlocks);
      }
      console.error('Error bloqueando usuario:', error);
      toast.error('Error al bloquear usuario');
    },
    onSuccess: () => {
      toast.success('Usuario bloqueado');
    },
    onSettled: () => {
      // Invalidar todas las queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['user-blocks', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['publicaciones-feed'] });
    },
  });

  // Desbloquear usuario
  const unblockMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('No autenticado');

      const { error } = await supabase
        .from('relaciones')
        .delete()
        .eq('user_id', targetUserId)
        .eq('seguidor_id', currentUserId)
        .eq('estado', 'bloqueado');

      if (error) throw error;

      // Audit log silencioso
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['user-blocks', currentUserId] });

      const previousBlocks = queryClient.getQueryData(['user-blocks', currentUserId]);

      // Optimistic update - remove block
      queryClient.setQueryData(['user-blocks', currentUserId], (old: BlockRelation[] | undefined) =>
        (old || []).filter(
          b => !(b.user_id === targetUserId && b.seguidor_id === currentUserId && b.estado === 'bloqueado')
        )
      );

      return { previousBlocks };
    },
    onError: (error, _, context) => {
      if (context?.previousBlocks) {
        queryClient.setQueryData(['user-blocks', currentUserId], context.previousBlocks);
      }
      console.error('Error desbloqueando usuario:', error);
      toast.error('Error al desbloquear usuario');
    },
    onSuccess: () => {
      toast.success('Usuario desbloqueado');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-blocks', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', currentUserId] });
    },
  });

  // Lista de usuarios que he bloqueado
  const blockedUserIds = (blocks || [])
    .filter(b => b.seguidor_id === currentUserId)
    .map(b => b.user_id);

  // Lista de usuarios que me han bloqueado
  const blockingMeUserIds = (blocks || [])
    .filter(b => b.user_id === currentUserId)
    .map(b => b.seguidor_id);

  return {
    blocks: blocks || [],
    isLoading,
    getBlockInfo,
    blockUser: blockMutation.mutate,
    blockUserAsync: blockMutation.mutateAsync,
    unblockUser: unblockMutation.mutate,
    unblockUserAsync: unblockMutation.mutateAsync,
    blockedUserIds,
    blockingMeUserIds,
    isPending: blockMutation.isPending || unblockMutation.isPending,
  };
}
