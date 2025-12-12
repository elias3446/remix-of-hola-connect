import { useMemo, useCallback } from 'react';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];

// Todos los permisos disponibles
// Nota: 'ver_estado', 'crear_estado', etc. corresponden a "Tipos de Reportes" en la UI
const ALL_PERMISSIONS: UserPermission[] = [
  // Reportes
  'ver_reporte', 'crear_reporte', 'editar_reporte', 'eliminar_reporte',
  // Usuarios
  'ver_usuario', 'crear_usuario', 'editar_usuario', 'eliminar_usuario',
  // Categorías
  'ver_categoria', 'crear_categoria', 'editar_categoria', 'eliminar_categoria',
  // Tipos de Reportes (en BD como "estado")
  'ver_estado', 'crear_estado', 'editar_estado', 'eliminar_estado',
];

// Mapeo de permisos a nombres legibles para la UI
export const PERMISSION_LABELS: Record<UserPermission, string> = {
  'ver_reporte': 'Ver Reportes',
  'crear_reporte': 'Crear Reportes',
  'editar_reporte': 'Editar Reportes',
  'eliminar_reporte': 'Eliminar Reportes',
  'ver_usuario': 'Ver Usuarios',
  'crear_usuario': 'Crear Usuarios',
  'editar_usuario': 'Editar Usuarios',
  'eliminar_usuario': 'Eliminar Usuarios',
  'ver_categoria': 'Ver Categorías',
  'crear_categoria': 'Crear Categorías',
  'editar_categoria': 'Editar Categorías',
  'eliminar_categoria': 'Eliminar Categorías',
  'ver_estado': 'Ver Tipos de Reportes',
  'crear_estado': 'Crear Tipos de Reportes',
  'editar_estado': 'Editar Tipos de Reportes',
  'eliminar_estado': 'Eliminar Tipos de Reportes',
};

// Agrupación de permisos por entidad para la UI
export const PERMISSION_GROUPS = {
  reportes: ['ver_reporte', 'crear_reporte', 'editar_reporte', 'eliminar_reporte'] as UserPermission[],
  usuarios: ['ver_usuario', 'crear_usuario', 'editar_usuario', 'eliminar_usuario'] as UserPermission[],
  categorias: ['ver_categoria', 'crear_categoria', 'editar_categoria', 'eliminar_categoria'] as UserPermission[],
  tiposReportes: ['ver_estado', 'crear_estado', 'editar_estado', 'eliminar_estado'] as UserPermission[],
};

// Mapeo de roles a permisos por defecto
const ROLE_PERMISSIONS_MAP: Record<UserRole, UserPermission[]> = {
  super_admin: ALL_PERMISSIONS,
  
  administrador: ALL_PERMISSIONS,
  
  mantenimiento: [
    'ver_reporte', 'crear_reporte', 'editar_reporte',
    'ver_usuario',
    'ver_categoria', 'crear_categoria', 'editar_categoria',
    'ver_estado', 'crear_estado', 'editar_estado',
  ],
  
  usuario_regular: [
    'ver_reporte', 'crear_reporte',
    'ver_categoria',
    'ver_estado', 'crear_estado',
  ],
  
  estudiante_personal: [
    'ver_reporte', 'crear_reporte',
    'ver_categoria',
    'ver_estado', 'crear_estado',
  ],
  
  operador_analista: [
    'ver_reporte', 'crear_reporte', 'editar_reporte',
    'ver_usuario',
    'ver_categoria',
    'ver_estado', 'crear_estado', 'editar_estado',
  ],
  
  seguridad_uce: [
    'ver_reporte', 'crear_reporte', 'editar_reporte',
    'ver_usuario',
    'ver_categoria',
    'ver_estado', 'crear_estado', 'editar_estado',
  ],
};

interface UseRolePermissionsReturn {
  /** Obtener permisos para un rol específico */
  getPermissionsForRole: (role: UserRole) => UserPermission[];
  /** Obtener permisos combinados para múltiples roles */
  getPermissionsForRoles: (roles: UserRole[]) => UserPermission[];
  /** Verificar si un permiso está incluido en un rol */
  roleHasPermission: (role: UserRole, permission: UserPermission) => boolean;
  /** Verificar si un permiso es obligatorio (no se puede desmarcar) basado en los roles seleccionados */
  isPermissionLocked: (permission: UserPermission, selectedRoles: UserRole[]) => boolean;
  /** Obtener los permisos obligatorios para los roles seleccionados */
  getLockedPermissions: (selectedRoles: UserRole[]) => UserPermission[];
  /** Mapa completo de roles a permisos */
  rolePermissionsMap: Record<UserRole, UserPermission[]>;
  /** Lista de todos los permisos disponibles */
  allPermissions: UserPermission[];
}

/**
 * Hook universal para gestionar la relación entre roles y permisos.
 * Cuando se selecciona un rol, automáticamente se pueden obtener los permisos asociados.
 * Los permisos obligatorios de cada rol no pueden ser desmarcados mientras el rol esté activo.
 */
export function useRolePermissions(): UseRolePermissionsReturn {
  // Obtener permisos para un rol específico
  const getPermissionsForRole = useCallback((role: UserRole): UserPermission[] => {
    return ROLE_PERMISSIONS_MAP[role] || [];
  }, []);

  // Obtener permisos combinados para múltiples roles (sin duplicados)
  const getPermissionsForRoles = useCallback((roles: UserRole[]): UserPermission[] => {
    const permissionsSet = new Set<UserPermission>();
    
    roles.forEach((role) => {
      const rolePermissions = ROLE_PERMISSIONS_MAP[role] || [];
      rolePermissions.forEach((permission) => permissionsSet.add(permission));
    });
    
    return Array.from(permissionsSet);
  }, []);

  // Verificar si un rol tiene un permiso específico
  const roleHasPermission = useCallback((role: UserRole, permission: UserPermission): boolean => {
    const permissions = ROLE_PERMISSIONS_MAP[role] || [];
    return permissions.includes(permission);
  }, []);

  // Obtener los permisos obligatorios para los roles seleccionados
  const getLockedPermissions = useCallback((selectedRoles: UserRole[]): UserPermission[] => {
    const lockedSet = new Set<UserPermission>();
    
    selectedRoles.forEach((role) => {
      const rolePermissions = ROLE_PERMISSIONS_MAP[role] || [];
      rolePermissions.forEach((permission) => lockedSet.add(permission));
    });
    
    return Array.from(lockedSet);
  }, []);

  // Verificar si un permiso es obligatorio (no se puede desmarcar)
  const isPermissionLocked = useCallback((permission: UserPermission, selectedRoles: UserRole[]): boolean => {
    // Un permiso está bloqueado si alguno de los roles seleccionados lo requiere
    return selectedRoles.some((role) => {
      const rolePermissions = ROLE_PERMISSIONS_MAP[role] || [];
      return rolePermissions.includes(permission);
    });
  }, []);

  return {
    getPermissionsForRole,
    getPermissionsForRoles,
    roleHasPermission,
    isPermissionLocked,
    getLockedPermissions,
    rolePermissionsMap: ROLE_PERMISSIONS_MAP,
    allPermissions: ALL_PERMISSIONS,
  };
}

// Exportar también las constantes para uso directo
export { ROLE_PERMISSIONS_MAP, ALL_PERMISSIONS };
export type { UserRole, UserPermission };
