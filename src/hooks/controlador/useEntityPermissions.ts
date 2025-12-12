import { useMemo } from 'react';
import { useMenuVisibility } from './useMenuVisibility';
import { useUserDataReady } from '@/hooks/entidades';
import type { Database } from '@/integrations/supabase/types';

type UserPermission = Database['public']['Enums']['user_permission'];

/**
 * Mapeo de entidades a sus permisos correspondientes
 */
const entityPermissionMap: Record<string, {
  ver: UserPermission;
  crear: UserPermission;
  editar: UserPermission;
  eliminar: UserPermission;
}> = {
  'tipo-reportes': {
    ver: 'ver_estado',
    crear: 'crear_estado',
    editar: 'editar_estado',
    eliminar: 'eliminar_estado',
  },
  'categorias': {
    ver: 'ver_categoria',
    crear: 'crear_categoria',
    editar: 'editar_categoria',
    eliminar: 'eliminar_categoria',
  },
  'usuarios': {
    ver: 'ver_usuario',
    crear: 'crear_usuario',
    editar: 'editar_usuario',
    eliminar: 'eliminar_usuario',
  },
  'reportes': {
    ver: 'ver_reporte',
    crear: 'crear_reporte',
    editar: 'editar_reporte',
    eliminar: 'eliminar_reporte',
  },
};

interface UseEntityPermissionsOptions {
  entityKey: string;
}

/**
 * Hook para determinar permisos de una entidad específica
 * Usa useUserDataReady para obtener los roles de forma estable
 * @param options.entityKey - Clave de la entidad (ej: 'tipo-reportes', 'categorias')
 */
export function useEntityPermissions({ entityKey }: UseEntityPermissionsOptions) {
  // Usar useUserDataReady para obtener los roles de forma estable
  const { userRoles, isReady } = useUserDataReady();
  const { isAdmin, hasPermission } = useMenuVisibility({ userRoles });

  const permissions = entityPermissionMap[entityKey];

  const canView = useMemo(() => {
    if (!isReady) return false;
    if (isAdmin) return true;
    if (!permissions) return false;
    return hasPermission(permissions.ver);
  }, [isAdmin, permissions, hasPermission, isReady]);

  const canCreate = useMemo(() => {
    if (!isReady) return false;
    if (isAdmin) return true;
    if (!permissions) return false;
    return hasPermission(permissions.crear);
  }, [isAdmin, permissions, hasPermission, isReady]);

  const canEdit = useMemo(() => {
    if (!isReady) return false;
    if (isAdmin) return true;
    if (!permissions) return false;
    return hasPermission(permissions.editar);
  }, [isAdmin, permissions, hasPermission, isReady]);

  const canDelete = useMemo(() => {
    if (!isReady) return false;
    if (isAdmin) return true;
    if (!permissions) return false;
    return hasPermission(permissions.eliminar);
  }, [isAdmin, permissions, hasPermission, isReady]);

  const canBulkUpload = useMemo(() => {
    if (!isReady) return false;
    if (isAdmin) return true;
    if (!permissions) return false;
    return hasPermission(permissions.crear);
  }, [isAdmin, permissions, hasPermission, isReady]);

  // Verifica si puede cambiar el estado (toggle activo/inactivo)
  const canToggleStatus = useMemo(() => {
    if (!isReady) return false;
    if (isAdmin) return true;
    if (!permissions) return false;
    return hasPermission(permissions.editar);
  }, [isAdmin, permissions, hasPermission, isReady]);

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canBulkUpload,
    canToggleStatus,
    isAdmin,
    isReady,
    permissions,
  };
}

export { entityPermissionMap };
