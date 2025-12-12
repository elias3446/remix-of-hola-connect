/**
 * Hook para gestionar grupos de chat
 * 
 * Funcionalidad:
 * - Agregar/eliminar participantes
 * - Asignar/quitar administradores
 * - Actualizar información del grupo
 * - Transferir administración automática al salir
 * - Ver historial del grupo
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { ParticipanteExtendido, ConversationRole } from './types';

interface GroupHistory {
  id: string;
  action_type: string;
  performed_by: string;
  affected_user_id: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  performer?: {
    name: string | null;
    avatar: string | null;
  };
  affected?: {
    name: string | null;
    avatar: string | null;
  };
}

interface UseGroupManagementOptions {
  conversationId: string | null;
  enabled?: boolean;
}

interface UseGroupManagementReturn {
  /** Información del grupo */
  groupInfo: {
    id: string;
    nombre: string | null;
    es_grupo: boolean;
    created_at: string;
    created_by: string | null;
  } | null;
  /** Lista de participantes */
  participants: ParticipanteExtendido[];
  /** Historial del grupo */
  history: GroupHistory[];
  /** Si el usuario actual es administrador */
  isAdmin: boolean;
  /** Estado de carga */
  isLoading: boolean;
  /** Agregar participantes */
  addParticipants: (profileIds: string[]) => Promise<boolean>;
  /** Eliminar participante */
  removeParticipant: (profileId: string) => Promise<boolean>;
  /** Hacer administrador */
  makeAdmin: (profileId: string) => Promise<boolean>;
  /** Quitar administrador */
  removeAdmin: (profileId: string) => Promise<boolean>;
  /** Actualizar nombre del grupo */
  updateGroupName: (name: string) => Promise<boolean>;
  /** Refrescar datos */
  refetch: () => void;
}

export function useGroupManagement(options: UseGroupManagementOptions): UseGroupManagementReturn {
  const { conversationId, enabled = true } = options;
  const queryClient = useQueryClient();
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  // Obtener profile_id actual
  useEffect(() => {
    const getProfileId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCurrentProfileId(profile.id);
      }
    };

    getProfileId();
  }, []);

  // Query para obtener información del grupo
  const { data: groupData, isLoading, refetch } = useQuery({
    queryKey: ['group', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      // Obtener info del grupo
      const { data: group, error: groupError } = await supabase
        .from('conversaciones')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (groupError) throw groupError;

      // Obtener participantes
      const { data: participants, error: partError } = await supabase
        .from('participantes_conversacion')
        .select(`
          *,
          profile:profiles(id, name, avatar, username, estado)
        `)
        .eq('conversacion_id', conversationId)
        .is('hidden_at', null);

      if (partError) throw partError;

      // Obtener historial
      const { data: history } = await supabase
        .from('group_history')
        .select(`
          *,
          performer:profiles!group_history_performed_by_fkey(name, avatar),
          affected:profiles!group_history_affected_user_id_fkey(name, avatar)
        `)
        .eq('conversacion_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);

      return {
        group,
        participants: participants || [],
        history: history || [],
      };
    },
    enabled: enabled && !!conversationId,
  });

  // Verificar si el usuario actual es administrador
  const isAdmin = currentProfileId
    ? groupData?.participants?.some(
        p => p.user_id === currentProfileId && p.role === 'administrador'
      ) || false
    : false;

  // Mutación para agregar participantes
  const addParticipantsMutation = useMutation({
    mutationFn: async (profileIds: string[]): Promise<boolean> => {
      if (!conversationId || !isAdmin) return false;

      const participantsToAdd = profileIds.map(pid => ({
        conversacion_id: conversationId,
        user_id: pid,
        role: 'miembro' as ConversationRole,
      }));

      const { error } = await supabase
        .from('participantes_conversacion')
        .insert(participantsToAdd);

      if (error) throw error;

      // Registrar en historial
      for (const pid of profileIds) {
        await supabase.from('group_history').insert({
          conversacion_id: conversationId,
          action_type: 'member_added',
          performed_by: currentProfileId,
          affected_user_id: pid,
        });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', conversationId] });
      toast.success('Participantes agregados');
    },
    onError: (error) => {
      console.error('Error agregando participantes:', error);
      toast.error('Error al agregar participantes');
    },
  });

  // Función para eliminar participante
  const removeParticipant = useCallback(async (profileId: string): Promise<boolean> => {
    if (!conversationId || !isAdmin) return false;

    try {
      // Verificar si es el último admin
      const admins = groupData?.participants?.filter(p => p.role === 'administrador') || [];
      
      if (admins.length === 1 && admins[0].user_id === profileId) {
        // Asignar admin al siguiente miembro más antiguo
        const nextMember = groupData?.participants?.find(
          p => p.role === 'miembro' && p.user_id !== profileId
        );

        if (nextMember) {
          await supabase
            .from('participantes_conversacion')
            .update({ role: 'administrador' })
            .eq('conversacion_id', conversationId)
            .eq('user_id', nextMember.user_id);

          await supabase.from('group_history').insert({
            conversacion_id: conversationId,
            action_type: 'admin_promoted',
            performed_by: currentProfileId,
            affected_user_id: nextMember.user_id,
          });
        }
      }

      // Marcar como hidden (salido) en lugar de eliminar
      const { error } = await supabase
        .from('participantes_conversacion')
        .update({ hidden_at: new Date().toISOString() })
        .eq('conversacion_id', conversationId)
        .eq('user_id', profileId);

      if (error) throw error;

      // Registrar en historial
      await supabase.from('group_history').insert({
        conversacion_id: conversationId,
        action_type: 'member_removed',
        performed_by: currentProfileId,
        affected_user_id: profileId,
      });

      queryClient.invalidateQueries({ queryKey: ['group', conversationId] });
      toast.success('Participante eliminado');
      return true;
    } catch (error) {
      console.error('Error eliminando participante:', error);
      toast.error('Error al eliminar participante');
      return false;
    }
  }, [conversationId, currentProfileId, groupData?.participants, isAdmin, queryClient]);

  // Función para hacer administrador
  const makeAdmin = useCallback(async (profileId: string): Promise<boolean> => {
    if (!conversationId || !isAdmin) return false;

    try {
      const { error } = await supabase
        .from('participantes_conversacion')
        .update({ role: 'administrador' })
        .eq('conversacion_id', conversationId)
        .eq('user_id', profileId);

      if (error) throw error;

      await supabase.from('group_history').insert({
        conversacion_id: conversationId,
        action_type: 'admin_promoted',
        performed_by: currentProfileId,
        affected_user_id: profileId,
      });

      queryClient.invalidateQueries({ queryKey: ['group', conversationId] });
      toast.success('Administrador asignado');
      return true;
    } catch (error) {
      console.error('Error asignando administrador:', error);
      toast.error('Error al asignar administrador');
      return false;
    }
  }, [conversationId, currentProfileId, isAdmin, queryClient]);

  // Función para quitar administrador
  const removeAdmin = useCallback(async (profileId: string): Promise<boolean> => {
    if (!conversationId || !isAdmin) return false;

    // Verificar que no sea el único admin
    const admins = groupData?.participants?.filter(p => p.role === 'administrador') || [];
    if (admins.length <= 1) {
      toast.error('Debe haber al menos un administrador');
      return false;
    }

    try {
      const { error } = await supabase
        .from('participantes_conversacion')
        .update({ role: 'miembro' })
        .eq('conversacion_id', conversationId)
        .eq('user_id', profileId);

      if (error) throw error;

      await supabase.from('group_history').insert({
        conversacion_id: conversationId,
        action_type: 'admin_demoted',
        performed_by: currentProfileId,
        affected_user_id: profileId,
      });

      queryClient.invalidateQueries({ queryKey: ['group', conversationId] });
      toast.success('Administrador removido');
      return true;
    } catch (error) {
      console.error('Error removiendo administrador:', error);
      toast.error('Error al remover administrador');
      return false;
    }
  }, [conversationId, currentProfileId, groupData?.participants, isAdmin, queryClient]);

  // Función para actualizar nombre del grupo
  const updateGroupName = useCallback(async (name: string): Promise<boolean> => {
    if (!conversationId || !isAdmin) return false;

    try {
      const oldName = groupData?.group?.nombre;

      const { error } = await supabase
        .from('conversaciones')
        .update({ nombre: name, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) throw error;

      await supabase.from('group_history').insert({
        conversacion_id: conversationId,
        action_type: 'name_changed',
        performed_by: currentProfileId,
        old_value: oldName,
        new_value: name,
      });

      queryClient.invalidateQueries({ queryKey: ['group', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Nombre actualizado');
      return true;
    } catch (error) {
      console.error('Error actualizando nombre:', error);
      toast.error('Error al actualizar nombre');
      return false;
    }
  }, [conversationId, currentProfileId, groupData?.group?.nombre, isAdmin, queryClient]);

  return {
    groupInfo: groupData?.group || null,
    participants: (groupData?.participants || []) as ParticipanteExtendido[],
    history: (groupData?.history || []) as GroupHistory[],
    isAdmin,
    isLoading,
    addParticipants: addParticipantsMutation.mutateAsync,
    removeParticipant,
    makeAdmin,
    removeAdmin,
    updateGroupName,
    refetch,
  };
}
