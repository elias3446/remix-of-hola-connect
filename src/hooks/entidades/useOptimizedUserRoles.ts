import { createOptimizedEntityHook } from './useOptimizedEntity';
import type { Database } from '@/integrations/supabase/types';

type UserRoles = Database['public']['Tables']['user_roles']['Row'];
type UserRolesUpdate = Database['public']['Tables']['user_roles']['Update'];

/**
 * Hook optimizado para los roles del usuario
 * Implementa: carga instantánea, actualizaciones optimistas, sincronización real-time
 */
export const useOptimizedUserRoles = createOptimizedEntityHook<UserRoles, UserRolesUpdate>({
  tableName: 'user_roles',
  queryKey: 'userRoles',
  userIdColumn: 'user_id',
  selectColumns: '*',
  transformData: (data) => data as UserRoles,
  transformForUpdate: (data) => {
    const { id, user_id, created_at, assigned_at, ...updateData } = data as UserRoles;
    return {
      ...updateData,
      updated_at: new Date().toISOString(),
    };
  },
});

/**
 * Helper para verificar si el usuario tiene un rol específico
 */
export function hasRole(
  userRoles: UserRoles | null,
  role: Database['public']['Enums']['user_role']
): boolean {
  return userRoles?.roles?.includes(role) ?? false;
}

/**
 * Helper para verificar si el usuario tiene un permiso específico
 */
export function hasPermission(
  userRoles: UserRoles | null,
  permission: Database['public']['Enums']['user_permission']
): boolean {
  return userRoles?.permisos?.includes(permission) ?? false;
}

export type { UserRoles, UserRolesUpdate };
