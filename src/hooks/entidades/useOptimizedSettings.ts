import { createOptimizedEntityHook } from './useOptimizedEntity';
import type { Database } from '@/integrations/supabase/types';

type Settings = Database['public']['Tables']['settings']['Row'];
type SettingsUpdate = Database['public']['Tables']['settings']['Update'];

/**
 * Hook optimizado para las configuraciones del usuario
 * Implementa: carga instantánea, actualizaciones optimistas, sincronización real-time
 */
export const useOptimizedSettings = createOptimizedEntityHook<Settings, SettingsUpdate>({
  tableName: 'settings',
  queryKey: 'settings',
  userIdColumn: 'user_id',
  selectColumns: '*',
  transformData: (data) => data as Settings,
  transformForUpdate: (data) => {
    const { id, user_id, created_at, ...updateData } = data as Settings;
    return {
      ...updateData,
      updated_at: new Date().toISOString(),
    };
  },
});

export type { Settings, SettingsUpdate };
