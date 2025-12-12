/**
 * Hook para manejar relaciones entre usuarios
 * - Seguir: Instantáneo, no requiere confirmación
 * - Solicitud de amistad: Requiere aceptación del receptor
 * - Integración con bloqueos: verifica bloqueos antes de cualquier acción
 */
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserBlocks } from './useUserBlocks';

export type FollowStatus = 'not_following' | 'following';
export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'rejected';

export interface UserRelation {
  id: string;
  user_id: string;
  seguidor_id: string;
  tipo: 'seguidor' | 'amigo';
  estado: 'pendiente' | 'aceptado' | 'rechazado' | 'bloqueado';
  created_at: string;
}

export interface RelationInfo {
  followStatus: FollowStatus;
  friendStatus: FriendStatus;
  isFollowing: boolean;
  isFollowingMe: boolean;
  isFriend: boolean;
  /** Solicitud de amistad recibida (para mostrar aceptar/rechazar) */
  hasPendingRequestFromThem: boolean;
  /** Solicitud de amistad enviada por mí */
  hasPendingSentRequest: boolean;
}

interface UseUserRelationsOptions {
  currentUserId?: string | null;
  enabled?: boolean;
}

export function useUserRelations(options: UseUserRelationsOptions = {}) {
  const { currentUserId, enabled = true } = options;
  const queryClient = useQueryClient();
  
  // Integración con bloqueos
  const { getBlockInfo, blockedUserIds, blockingMeUserIds } = useUserBlocks({ 
    currentUserId, 
    enabled 
  });

  // Obtener todas las relaciones del usuario actual (excluyendo bloqueos)
  const { data: relations, isLoading } = useQuery({
    queryKey: ['user-relations', currentUserId],
    queryFn: async (): Promise<UserRelation[]> => {
      if (!currentUserId) return [];

      const { data, error } = await supabase
        .from('relaciones')
        .select('*')
        .neq('estado', 'bloqueado')
        .or(`user_id.eq.${currentUserId},seguidor_id.eq.${currentUserId}`);

      if (error) throw error;
      return (data || []) as UserRelation[];
    },
    enabled: enabled && !!currentUserId,
    staleTime: 30000,
  });

  // Verificar si hay bloqueo con un usuario
  const isBlockedWith = useCallback((targetUserId: string): boolean => {
    const blockInfo = getBlockInfo(targetUserId);
    return blockInfo.hasAnyBlock;
  }, [getBlockInfo]);

  // Obtener información de relación con un usuario específico
  const getRelationInfo = useCallback((targetUserId: string): RelationInfo => {
    const defaultInfo: RelationInfo = {
      followStatus: 'not_following',
      friendStatus: 'none',
      isFollowing: false,
      isFollowingMe: false,
      isFriend: false,
      hasPendingRequestFromThem: false,
      hasPendingSentRequest: false,
    };

    if (!relations || !currentUserId) return defaultInfo;

    // Si hay bloqueo, no hay relación posible
    if (isBlockedWith(targetUserId)) return defaultInfo;

    // Buscar si estoy siguiendo al usuario (yo -> target)
    const followingRelation = relations.find(
      r => r.seguidor_id === currentUserId && 
           r.user_id === targetUserId && 
           r.tipo === 'seguidor' &&
           r.estado === 'aceptado'
    );

    // Buscar si el usuario me sigue (target -> yo)
    const followedByRelation = relations.find(
      r => r.seguidor_id === targetUserId && 
           r.user_id === currentUserId && 
           r.tipo === 'seguidor' &&
           r.estado === 'aceptado'
    );

    // Buscar solicitud de amistad enviada por mí (yo -> target)
    const sentFriendRequest = relations.find(
      r => r.seguidor_id === currentUserId && 
           r.user_id === targetUserId && 
           r.tipo === 'amigo'
    );

    // Buscar solicitud de amistad recibida (target -> yo)
    const receivedFriendRequest = relations.find(
      r => r.user_id === currentUserId && 
           r.seguidor_id === targetUserId && 
           r.tipo === 'amigo'
    );

    let friendStatus: FriendStatus = 'none';
    let hasPendingRequestFromThem = false;
    let hasPendingSentRequest = false;

    // Determinar el estado de amistad (priorizar la relación ya aceptada)
    if (sentFriendRequest?.estado === 'aceptado' || receivedFriendRequest?.estado === 'aceptado') {
      friendStatus = 'friends';
    } else if (sentFriendRequest?.estado === 'pendiente') {
      friendStatus = 'pending_sent';
      hasPendingSentRequest = true;
    } else if (receivedFriendRequest?.estado === 'pendiente') {
      friendStatus = 'pending_received';
      hasPendingRequestFromThem = true;
    } else if (sentFriendRequest?.estado === 'rechazado') {
      friendStatus = 'rejected';
    }

    return {
      followStatus: followingRelation ? 'following' : 'not_following',
      friendStatus,
      isFollowing: !!followingRelation,
      isFollowingMe: !!followedByRelation,
      isFriend: friendStatus === 'friends',
      hasPendingRequestFromThem,
      hasPendingSentRequest,
    };
  }, [relations, currentUserId, isBlockedWith]);

  // ========== SEGUIR ==========
  
  // Seguir a un usuario (instantáneo)
  const followMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('No autenticado');
      
      // Verificar bloqueo
      if (isBlockedWith(targetUserId)) {
        throw new Error('No puedes interactuar con este usuario');
      }

      const { error } = await supabase
        .from('relaciones')
        .insert({
          user_id: targetUserId,
          seguidor_id: currentUserId,
          tipo: 'seguidor',
          estado: 'aceptado',
        });

      if (error) throw error;
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['user-relations', currentUserId] });
      const previousRelations = queryClient.getQueryData(['user-relations', currentUserId]);

      // Optimistic update
      queryClient.setQueryData(['user-relations', currentUserId], (old: UserRelation[] | undefined) => [
        ...(old || []),
        {
          id: `temp-${Date.now()}`,
          user_id: targetUserId,
          seguidor_id: currentUserId,
          tipo: 'seguidor',
          estado: 'aceptado',
          created_at: new Date().toISOString(),
        },
      ]);

      return { previousRelations };
    },
    onError: (error, _, context) => {
      if (context?.previousRelations) {
        queryClient.setQueryData(['user-relations', currentUserId], context.previousRelations);
      }
      console.error('Error following:', error);
      toast.error(error instanceof Error ? error.message : 'Error al seguir');
    },
    onSuccess: () => {
      toast.success('Ahora sigues a este usuario');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-relations', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });

  // Dejar de seguir
  const unfollowMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('No autenticado');

      const { error } = await supabase
        .from('relaciones')
        .delete()
        .eq('user_id', targetUserId)
        .eq('seguidor_id', currentUserId)
        .eq('tipo', 'seguidor')
        .eq('estado', 'aceptado');

      if (error) throw error;
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['user-relations', currentUserId] });
      const previousRelations = queryClient.getQueryData(['user-relations', currentUserId]);

      queryClient.setQueryData(['user-relations', currentUserId], (old: UserRelation[] | undefined) =>
        (old || []).filter(
          r => !(r.user_id === targetUserId && r.seguidor_id === currentUserId && r.tipo === 'seguidor')
        )
      );

      return { previousRelations };
    },
    onError: (error, _, context) => {
      if (context?.previousRelations) {
        queryClient.setQueryData(['user-relations', currentUserId], context.previousRelations);
      }
      console.error('Error unfollowing:', error);
      toast.error('Error al dejar de seguir');
    },
    onSuccess: () => {
      toast.success('Has dejado de seguir');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-relations', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['publicaciones-feed'] });
    },
  });

  // ========== SOLICITUD DE AMISTAD ==========

  // Enviar solicitud de amistad
  const sendFriendRequestMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('No autenticado');
      
      if (isBlockedWith(targetUserId)) {
        throw new Error('No puedes interactuar con este usuario');
      }

      const { error } = await supabase
        .from('relaciones')
        .insert({
          user_id: targetUserId,
          seguidor_id: currentUserId,
          tipo: 'amigo',
          estado: 'pendiente',
        });

      if (error) throw error;

      // Crear notificación (silencioso si falla)
      try {
        await supabase.from('notifications').insert([{
          user_id: targetUserId,
          title: 'Nueva solicitud de amistad',
          message: 'Tienes una nueva solicitud de amistad',
          type: 'informacion' as const,
          data: { from_user_id: currentUserId, type: 'friend_request' },
        }]);
      } catch (e) {
        console.warn('Notification failed:', e);
      }
      return targetUserId;
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['user-relations', currentUserId] });
      const previousRelations = queryClient.getQueryData(['user-relations', currentUserId]);

      // Optimistic update
      queryClient.setQueryData(['user-relations', currentUserId], (old: UserRelation[] | undefined) => [
        ...(old || []),
        {
          id: `temp-friend-${Date.now()}`,
          user_id: targetUserId,
          seguidor_id: currentUserId,
          tipo: 'amigo',
          estado: 'pendiente',
          created_at: new Date().toISOString(),
        },
      ]);

      return { previousRelations };
    },
    onError: (error, _, context) => {
      if (context?.previousRelations) {
        queryClient.setQueryData(['user-relations', currentUserId], context.previousRelations);
      }
      console.error('Error sending friend request:', error);
      toast.error(error instanceof Error ? error.message : 'Error al enviar solicitud');
    },
    onSuccess: (targetUserId) => {
      toast.success('Solicitud de amistad enviada');
    },
    onSettled: (targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['user-relations', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['receivedFriendRequests', targetUserId] });
    },
  });

  // Cancelar solicitud de amistad enviada
  const cancelFriendRequestMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('No autenticado');

      const { error } = await supabase
        .from('relaciones')
        .delete()
        .eq('user_id', targetUserId)
        .eq('seguidor_id', currentUserId)
        .eq('tipo', 'amigo')
        .eq('estado', 'pendiente');

      if (error) throw error;
      return targetUserId;
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['user-relations', currentUserId] });
      const previousRelations = queryClient.getQueryData(['user-relations', currentUserId]);

      // Optimistic update - remove the pending request
      queryClient.setQueryData(['user-relations', currentUserId], (old: UserRelation[] | undefined) =>
        (old || []).filter(
          r => !(r.user_id === targetUserId && r.seguidor_id === currentUserId && r.tipo === 'amigo' && r.estado === 'pendiente')
        )
      );

      return { previousRelations };
    },
    onError: (error, _, context) => {
      if (context?.previousRelations) {
        queryClient.setQueryData(['user-relations', currentUserId], context.previousRelations);
      }
      console.error('Error canceling friend request:', error);
      toast.error('Error al cancelar solicitud');
    },
    onSuccess: (targetUserId) => {
      toast.success('Solicitud cancelada');
    },
    onSettled: (targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['user-relations', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['receivedFriendRequests', targetUserId] });
    },
  });

  // Aceptar solicitud de amistad
  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('No autenticado');

      const { error } = await supabase
        .from('relaciones')
        .update({ estado: 'aceptado' })
        .eq('user_id', currentUserId)
        .eq('seguidor_id', targetUserId)
        .eq('tipo', 'amigo')
        .eq('estado', 'pendiente');

      if (error) throw error;

      // Notificar al solicitante (silencioso si falla)
      try {
        await supabase.from('notifications').insert([{
          user_id: targetUserId,
          title: 'Solicitud aceptada',
          message: 'Tu solicitud de amistad fue aceptada',
          type: 'informacion' as const,
          data: { from_user_id: currentUserId, type: 'friend_request_accepted' },
        }]);
      } catch (e) {
        console.warn('Notification failed:', e);
      }
      return targetUserId;
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['user-relations', currentUserId] });
      const previousRelations = queryClient.getQueryData(['user-relations', currentUserId]);

      // Optimistic update - change estado from pendiente to aceptado
      queryClient.setQueryData(['user-relations', currentUserId], (old: UserRelation[] | undefined) =>
        (old || []).map(r =>
          r.user_id === currentUserId && r.seguidor_id === targetUserId && r.tipo === 'amigo' && r.estado === 'pendiente'
            ? { ...r, estado: 'aceptado' as const }
            : r
        )
      );

      return { previousRelations };
    },
    onError: (error, _, context) => {
      if (context?.previousRelations) {
        queryClient.setQueryData(['user-relations', currentUserId], context.previousRelations);
      }
      console.error('Error accepting friend request:', error);
      toast.error('Error al aceptar solicitud');
    },
    onSuccess: (targetUserId) => {
      toast.success('Solicitud de amistad aceptada');
    },
    onSettled: (targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['user-relations', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['receivedFriendRequests', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['userFriends', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['userFriends', targetUserId] });
    },
  });

  // Rechazar solicitud de amistad
  const rejectFriendRequestMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('No autenticado');

      // En lugar de actualizar a 'rechazado', eliminar la solicitud
      const { error } = await supabase
        .from('relaciones')
        .delete()
        .eq('user_id', currentUserId)
        .eq('seguidor_id', targetUserId)
        .eq('tipo', 'amigo')
        .eq('estado', 'pendiente');

      if (error) throw error;
      return targetUserId;
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['user-relations', currentUserId] });
      const previousRelations = queryClient.getQueryData(['user-relations', currentUserId]);

      // Optimistic update - remove the pending request
      queryClient.setQueryData(['user-relations', currentUserId], (old: UserRelation[] | undefined) =>
        (old || []).filter(
          r => !(r.user_id === currentUserId && r.seguidor_id === targetUserId && r.tipo === 'amigo' && r.estado === 'pendiente')
        )
      );

      return { previousRelations };
    },
    onError: (error, _, context) => {
      if (context?.previousRelations) {
        queryClient.setQueryData(['user-relations', currentUserId], context.previousRelations);
      }
      console.error('Error rejecting friend request:', error);
      toast.error('Error al rechazar solicitud');
    },
    onSuccess: (targetUserId) => {
      toast.success('Solicitud rechazada');
    },
    onSettled: (targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['user-relations', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['receivedFriendRequests', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests', targetUserId] });
    },
  });

  // Eliminar amistad
  const removeFriendMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('No autenticado');

      // Eliminar en ambas direcciones
      const { error } = await supabase
        .from('relaciones')
        .delete()
        .eq('tipo', 'amigo')
        .eq('estado', 'aceptado')
        .or(`and(user_id.eq.${targetUserId},seguidor_id.eq.${currentUserId}),and(user_id.eq.${currentUserId},seguidor_id.eq.${targetUserId})`);

      if (error) throw error;
      return targetUserId;
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['user-relations', currentUserId] });
      const previousRelations = queryClient.getQueryData(['user-relations', currentUserId]);

      // Optimistic update - remove friendship relations
      queryClient.setQueryData(['user-relations', currentUserId], (old: UserRelation[] | undefined) =>
        (old || []).filter(
          r => !(r.tipo === 'amigo' && r.estado === 'aceptado' && 
            ((r.user_id === targetUserId && r.seguidor_id === currentUserId) ||
             (r.user_id === currentUserId && r.seguidor_id === targetUserId)))
        )
      );

      return { previousRelations };
    },
    onError: (error, _, context) => {
      if (context?.previousRelations) {
        queryClient.setQueryData(['user-relations', currentUserId], context.previousRelations);
      }
      console.error('Error removing friend:', error);
      toast.error('Error al eliminar amistad');
    },
    onSuccess: (targetUserId) => {
      toast.success('Amistad eliminada');
    },
    onSettled: (targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['user-relations', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['userFriends', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['userFriends', targetUserId] });
    },
  });

  return {
    relations: relations || [],
    isLoading,
    getRelationInfo,
    isBlockedWith,
    blockedUserIds,
    blockingMeUserIds,
    // Seguir
    follow: followMutation.mutate,
    followAsync: followMutation.mutateAsync,
    unfollow: unfollowMutation.mutate,
    unfollowAsync: unfollowMutation.mutateAsync,
    // Solicitud de amistad
    sendFriendRequest: sendFriendRequestMutation.mutate,
    cancelFriendRequest: cancelFriendRequestMutation.mutate,
    acceptFriendRequest: acceptFriendRequestMutation.mutate,
    rejectFriendRequest: rejectFriendRequestMutation.mutate,
    removeFriend: removeFriendMutation.mutate,
    isPending: 
      followMutation.isPending || 
      unfollowMutation.isPending ||
      sendFriendRequestMutation.isPending || 
      acceptFriendRequestMutation.isPending || 
      rejectFriendRequestMutation.isPending ||
      cancelFriendRequestMutation.isPending ||
      removeFriendMutation.isPending,
  };
}
