import { createOptimizedEntityListHook } from './useOptimizedEntityList';
import type { Database } from '@/integrations/supabase/types';

export type UserRoleList = Database['public']['Tables']['user_roles']['Row'];

/**
 * Hook optimizado para obtener la lista de todos los roles de usuarios
 */
export const useOptimizedUserRolesList = createOptimizedEntityListHook<UserRoleList>({
  tableName: 'user_roles',
  queryKey: 'userRolesList',
  selectColumns: '*',
  defaultFilters: {},
  orderBy: { column: 'created_at', ascending: false },
  enableRealtime: true,
  hasSoftDelete: false, // user_roles no tiene columna deleted_at
});
