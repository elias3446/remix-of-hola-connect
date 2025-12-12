import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useAuditLog } from './useAuditLog';
import { useInitializeUserData } from '@/hooks/entidades';
import { resetLayoutShown } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';

export function useSignOut() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { auditLogout } = useAuditLog();
  const { clearUserData } = useInitializeUserData();
  const { setSigningOut } = useAuth();

  // Limpiar mensajes del usuario según configuración
  const clearUserMessages = async (userId: string) => {
    try {
      // Obtener configuración del usuario
      const { data: settings } = await supabase
        .from('settings')
        .select('chat_auto_clear, chat_persistence_enabled')
        .eq('user_id', userId)
        .single();

      // Si chat_auto_clear está habilitado, eliminar mensajes del usuario
      if (settings?.chat_auto_clear) {
        // Obtener conversaciones del usuario
        const { data: participaciones } = await supabase
          .from('participantes_conversacion')
          .select('conversacion_id')
          .eq('user_id', userId);

        if (participaciones && participaciones.length > 0) {
          const conversacionIds = participaciones.map(p => p.conversacion_id);
          
          // Marcar mensajes como ocultos para este usuario en lugar de eliminarlos
          // Esto permite que otros usuarios aún vean los mensajes
          for (const convId of conversacionIds) {
            const { data: mensajes } = await supabase
              .from('mensajes')
              .select('id, hidden_by_users')
              .eq('conversacion_id', convId);

            if (mensajes) {
              for (const mensaje of mensajes) {
                const hiddenUsers = (mensaje.hidden_by_users as string[]) || [];
                if (!hiddenUsers.includes(userId)) {
                  await supabase
                    .from('mensajes')
                    .update({ 
                      hidden_by_users: [...hiddenUsers, userId] 
                    })
                    .eq('id', mensaje.id);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error al limpiar mensajes del usuario:', err);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    setSigningOut(true); // Mostrar LoadingScreen global

    try {
      // Obtener el usuario actual antes de cerrar sesión
      const { data: { user } } = await supabase.auth.getUser();

      // Registrar logout en user_audit antes de cerrar sesión
      if (user) {
        await auditLogout({
          authUserId: user.id,
          email: user.email
        });

        // Limpiar mensajes si la configuración lo indica
        await clearUserMessages(user.id);
      }

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) throw signOutError;

      // Limpiar caché de datos del usuario
      clearUserData();
      
      // Resetear el flag del layout para que muestre loading en el próximo login
      resetLayoutShown();

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cerrar sesión';
      setError(message);
      setSigningOut(false); // Ocultar LoadingScreen en caso de error
      return { error: message };
    } finally {
      setLoading(false);
    }
  };

  return { signOut, loading, error };
}
