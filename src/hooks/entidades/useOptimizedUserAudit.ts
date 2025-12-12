import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type UserAuditRow = Database['public']['Tables']['user_audit']['Row'];

export interface UserAudit extends UserAuditRow {
  performed_by_profile?: {
    name: string | null;
    email: string | null;
  } | null;
  user_profile?: {
    name: string | null;
    email: string | null;
  } | null;
}

export function useOptimizedUserAudit() {
  const queryClient = useQueryClient();

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['user_audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_audit')
        .select(`
          *,
          performed_by_profile:profiles!user_audit_performed_by_fkey(name, email),
          user_profile:profiles!user_audit_user_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as UserAudit[];
    },
    staleTime: 30 * 1000, // 30 segundos
    placeholderData: (previousData) => previousData,
  });

  // Suscripción realtime para user_audit
  useEffect(() => {
    const channel = supabase
      .channel('user_audit-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_audit'
        },
        () => {
          // Invalidar caché para refetch con los datos actualizados
          queryClient.invalidateQueries({ queryKey: ['user_audit'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
