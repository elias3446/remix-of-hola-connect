import { useMemo } from 'react';
import { hasRole, hasPermission } from '@/hooks/entidades';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];
type UserRoles = Database['public']['Tables']['user_roles']['Row'];

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  roles?: UserRole[];
  permissions?: UserPermission[];
}

interface UseMenuVisibilityOptions {
  userRoles?: UserRoles | null;
}

/**
 * Hook para determinar qué elementos del menú son visibles según roles y permisos
 * @param options.userRoles - Los roles del usuario provenientes del caché de React Query
 */
export function useMenuVisibility(options: UseMenuVisibilityOptions = {}) {
  const { userRoles } = options;

  const isAdmin = useMemo(() => {
    if (!userRoles) return false;
    return hasRole(userRoles, 'super_admin') || hasRole(userRoles, 'administrador');
  }, [userRoles]);

  const canViewMenuItem = useMemo(() => {
    return (item: MenuItem): boolean => {
      // Si no hay restricciones, mostrar a todos
      if (!item.roles && !item.permissions) return true;
      
      // Super admin y administrador ven todo
      if (isAdmin) return true;
      
      // Verificar roles
      if (item.roles && userRoles) {
        const hasRequiredRole = item.roles.some(role => hasRole(userRoles, role));
        if (hasRequiredRole) return true;
      }
      
      // Verificar permisos
      if (item.permissions && userRoles) {
        const hasRequiredPermission = item.permissions.some(perm => hasPermission(userRoles, perm));
        if (hasRequiredPermission) return true;
      }
      
      return false;
    };
  }, [userRoles, isAdmin]);

  const filterMenuItems = useMemo(() => {
    return <T extends MenuItem>(items: T[]): T[] => {
      return items.filter(canViewMenuItem);
    };
  }, [canViewMenuItem]);

  return {
    userRoles,
    isAdmin,
    canViewMenuItem,
    filterMenuItems,
    hasRole: (role: UserRole) => hasRole(userRoles ?? null, role),
    hasPermission: (permission: UserPermission) => hasPermission(userRoles ?? null, permission),
  };
}

export type { MenuItem };
