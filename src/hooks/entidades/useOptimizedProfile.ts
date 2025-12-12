import { createOptimizedEntityHook, setCachedUserId } from './useOptimizedEntity';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * Hook optimizado para el perfil del usuario
 * Implementa: carga instantánea, actualizaciones optimistas, sincronización real-time
 */
export const useOptimizedProfile = createOptimizedEntityHook<Profile, ProfileUpdate>({
  tableName: 'profiles',
  queryKey: 'profile',
  userIdColumn: 'id',
  selectColumns: '*',
  transformData: (data) => data as Profile,
  transformForUpdate: (data) => {
    // Excluir campos que no deben actualizarse
    const { id, created_at, ...updateData } = data as Profile;
    return {
      ...updateData,
      updated_at: new Date().toISOString(),
    };
  },
});

/**
 * Helper para inicializar el caché con datos del usuario autenticado
 */
export function initializeProfileCache(userId: string | null) {
  setCachedUserId(userId);
}

export type { Profile, ProfileUpdate };
