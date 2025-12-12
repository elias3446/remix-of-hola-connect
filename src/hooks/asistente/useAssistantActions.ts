import { useCallback } from 'react';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';
import { useOptimizedTipoReportes } from '@/hooks/entidades/useOptimizedTipoReportes';
import { useOptimizedUsers } from '@/hooks/entidades/useOptimizedUsers';
import { useCreateUser } from '@/hooks/users/useCreateUser';
import { useUpdateUser } from '@/hooks/users/useUpdateUser';
import { useDeleteUser } from '@/hooks/users/useDeleteUser';
import { useDashboardStats } from '@/hooks/controlador/useDashboardStats';
import { useRolePermissions, type UserPermission } from '@/hooks/controlador/useRolePermissions';
import { useOptimizedUserRoles } from '@/hooks/entidades/useOptimizedUserRoles';
import { toast } from 'sonner';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

interface ParsedAction {
  action: 'create' | 'read' | 'update' | 'delete' | 'list' | 'analyze';
  entity: 'usuario' | 'reporte' | 'categoria' | 'tipo_reporte';
  data?: Record<string, unknown>;
  explanation?: string;
  warnings?: string[];
  requiresConfirmation?: boolean;
}

/**
 * Hook para ejecutar acciones del asistente en las entidades del sistema
 */
export function useAssistantActions() {
  const { data: userRoles } = useOptimizedUserRoles();
  const { data: reportes, create: createReporte, update: updateReporte, remove: removeReporte } = useOptimizedReportes();
  const { data: categorias, create: createCategoria, update: updateCategoria, remove: removeCategoria } = useOptimizedCategories();
  const { data: tiposReporte, create: createTipo, update: updateTipo, remove: removeTipo } = useOptimizedTipoReportes();
  const { data: usuarios } = useOptimizedUsers();
  const { createUser } = useCreateUser();
  const { updateUser } = useUpdateUser();
  const { deleteUser } = useDeleteUser();
  const { stats, rolesDistribution, statusDistribution, priorityDistribution } = useDashboardStats();

  // Check if user has permission
  const hasPermission = useCallback((permission: UserPermission): boolean => {
    return userRoles?.permisos?.includes(permission) ?? false;
  }, [userRoles]);

  // Parse AI response to extract action
  const parseAIResponse = useCallback((response: string): ParsedAction | null => {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]) as ParsedAction;
      }
      // Try direct JSON parse
      const directParse = JSON.parse(response);
      if (directParse.action && directParse.entity) {
        return directParse as ParsedAction;
      }
    } catch {
      // Not a structured action
    }
    return null;
  }, []);

  // Execute parsed action
  const executeAction = useCallback(async (action: ParsedAction): Promise<ActionResult> => {
    const { action: actionType, entity, data } = action;

    // Permission mapping
    const permissionMap: Record<string, Record<string, UserPermission>> = {
      usuario: {
        create: 'crear_usuario',
        read: 'ver_usuario',
        update: 'editar_usuario',
        delete: 'eliminar_usuario',
        list: 'ver_usuario',
      },
      reporte: {
        create: 'crear_reporte',
        read: 'ver_reporte',
        update: 'editar_reporte',
        delete: 'eliminar_reporte',
        list: 'ver_reporte',
      },
      categoria: {
        create: 'crear_categoria',
        read: 'ver_categoria',
        update: 'editar_categoria',
        delete: 'eliminar_categoria',
        list: 'ver_categoria',
      },
      tipo_reporte: {
        create: 'crear_estado',
        read: 'ver_estado',
        update: 'editar_estado',
        delete: 'eliminar_estado',
        list: 'ver_estado',
      },
    };

    // Check permission
    const requiredPermission = permissionMap[entity]?.[actionType];
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return {
        success: false,
        message: `No tienes permiso para ${actionType} ${entity}. Permiso requerido: ${requiredPermission}`,
      };
    }

    try {
      switch (entity) {
        case 'reporte':
          if (actionType === 'create' && data) {
            const result = await createReporte(data as never);
            return { success: true, message: 'Reporte creado exitosamente', data: result };
          }
          if (actionType === 'update' && data?.id) {
            await updateReporte({ id: data.id as string, updates: data });
            return { success: true, message: 'Reporte actualizado exitosamente' };
          }
          if (actionType === 'delete' && data?.id) {
            await removeReporte(data.id as string);
            return { success: true, message: 'Reporte eliminado exitosamente (soft delete)' };
          }
          if (actionType === 'list') {
            return { success: true, message: `Encontrados ${reportes.length} reportes`, data: reportes };
          }
          break;

        case 'categoria':
          if (actionType === 'create' && data) {
            const result = await createCategoria(data as never);
            return { success: true, message: 'Categoría creada exitosamente', data: result };
          }
          if (actionType === 'update' && data?.id) {
            await updateCategoria(data.id as string, data as never);
            return { success: true, message: 'Categoría actualizada exitosamente' };
          }
          if (actionType === 'delete' && data?.id) {
            await removeCategoria(data.id as string);
            return { success: true, message: 'Categoría eliminada exitosamente (soft delete)' };
          }
          if (actionType === 'list') {
            return { success: true, message: `Encontradas ${categorias.length} categorías`, data: categorias };
          }
          break;

        case 'tipo_reporte':
          if (actionType === 'create' && data) {
            const result = await createTipo(data as never);
            return { success: true, message: 'Tipo de reporte creado exitosamente', data: result };
          }
          if (actionType === 'update' && data?.id) {
            await updateTipo(data.id as string, data as never);
            return { success: true, message: 'Tipo de reporte actualizado exitosamente' };
          }
          if (actionType === 'delete' && data?.id) {
            await removeTipo(data.id as string);
            return { success: true, message: 'Tipo de reporte eliminado exitosamente (soft delete)' };
          }
          if (actionType === 'list') {
            return { success: true, message: `Encontrados ${tiposReporte.length} tipos de reporte`, data: tiposReporte };
          }
          break;

        case 'usuario':
          if (actionType === 'create' && data) {
            const userData = {
              email: data.email as string,
              password: data.password as string || 'TempPass123!',
              name: data.name as string,
              username: data.username as string,
            };
            const result = await createUser(userData);
            if (result.error) {
              return { success: false, message: result.error };
            }
            return { success: true, message: 'Usuario creado exitosamente', data: result.user };
          }
          if (actionType === 'update' && data?.id) {
            const updateData = {
              name: data.name as string | undefined,
              username: data.username as string | undefined,
            };
            const result = await updateUser(data.id as string, updateData);
            if (result.error) {
              return { success: false, message: result.error };
            }
            return { success: true, message: 'Usuario actualizado exitosamente' };
          }
          if (actionType === 'delete' && data?.id) {
            const result = await deleteUser(data.id as string);
            if (result.error) {
              return { success: false, message: result.error };
            }
            return { success: true, message: 'Usuario eliminado exitosamente (soft delete)' };
          }
          if (actionType === 'list') {
            return { success: true, message: `Encontrados ${usuarios.length} usuarios`, data: usuarios };
          }
          break;
      }

      if (actionType === 'analyze') {
        return {
          success: true,
          message: 'Análisis completado',
          data: {
            stats,
            rolesDistribution,
            statusDistribution,
            priorityDistribution,
            reportes: reportes.length,
            categorias: categorias.length,
            tiposReporte: tiposReporte.length,
            usuarios: usuarios.length,
          },
        };
      }

      return { success: false, message: `Acción '${actionType}' no soportada para '${entity}'` };
    } catch (error) {
      console.error('[useAssistantActions] Error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al ejecutar la acción',
      };
    }
  }, [
    hasPermission, reportes, categorias, tiposReporte, usuarios, stats,
    rolesDistribution, statusDistribution, priorityDistribution,
    createReporte, updateReporte, removeReporte,
    createCategoria, updateCategoria, removeCategoria,
    createTipo, updateTipo, removeTipo,
    createUser, updateUser, deleteUser,
  ]);

  // Get system context for AI
  const getSystemContext = useCallback(() => {
    return {
      reportes: {
        total: reportes.length,
        byStatus: reportes.reduce((acc: Record<string, number>, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {}),
        byPriority: reportes.reduce((acc: Record<string, number>, r) => {
          acc[r.priority] = (acc[r.priority] || 0) + 1;
          return acc;
        }, {}),
      },
      categorias: {
        total: categorias.length,
        activas: categorias.filter(c => c.activo).length,
      },
      tiposReporte: {
        total: tiposReporte.length,
        activos: tiposReporte.filter(t => t.activo).length,
      },
      usuarios: {
        total: usuarios.length,
      },
      dashboard: stats,
    };
  }, [reportes, categorias, tiposReporte, usuarios, stats]);

  return {
    parseAIResponse,
    executeAction,
    getSystemContext,
    hasPermission,
  };
}
