import { useMemo, useCallback } from 'react';
import { useComparisonFilters, type ComparisonFiltersConfig, type FilterOption } from './useComparisonFilters';
import { useOptimizedUsers, type User } from '@/hooks/entidades/useOptimizedUsers';
import { useOptimizedUserRolesList } from '@/hooks/entidades/useOptimizedUserRolesList';
import { Constants } from '@/integrations/supabase/types';

export interface UsuariosAnalysisStats {
  total: number;
  activos: number;
  confirmados: number;
  nuevos: number;
  crecimiento: number;
}

// Colores del sistema de diseño
const ESTADO_COLORS: Record<string, string> = {
  activo: 'hsl(142, 76%, 45%)',
  inactivo: 'hsl(217, 14%, 70%)',
  bloqueado: 'hsl(0, 84%, 60%)',
};

const CONFIRMACION_COLORS: Record<string, string> = {
  confirmado: 'hsl(142, 76%, 45%)',
  no_confirmado: 'hsl(38, 92%, 50%)',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'hsl(262, 83%, 58%)',
  administrador: 'hsl(217, 91%, 60%)',
  mantenimiento: 'hsl(38, 92%, 50%)',
  usuario_regular: 'hsl(142, 76%, 45%)',
  estudiante_personal: 'hsl(195, 84%, 50%)',
  operador_analista: 'hsl(340, 82%, 52%)',
  seguridad_uce: 'hsl(0, 84%, 60%)',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  administrador: 'Administrador',
  mantenimiento: 'Mantenimiento',
  usuario_regular: 'Usuario Regular',
  estudiante_personal: 'Estudiante/Personal',
  operador_analista: 'Operador/Analista',
  seguridad_uce: 'Seguridad UCE',
};

const PERMISSION_LABELS: Record<string, string> = {
  ver_reporte: 'Ver Reportes',
  crear_reporte: 'Crear Reportes',
  editar_reporte: 'Editar Reportes',
  eliminar_reporte: 'Eliminar Reportes',
  ver_usuario: 'Ver Usuarios',
  crear_usuario: 'Crear Usuarios',
  editar_usuario: 'Editar Usuarios',
  eliminar_usuario: 'Eliminar Usuarios',
  ver_categoria: 'Ver Categorías',
  crear_categoria: 'Crear Categorías',
  editar_categoria: 'Editar Categorías',
  eliminar_categoria: 'Eliminar Categorías',
  ver_estado: 'Ver Estados',
  crear_estado: 'Crear Estados',
  editar_estado: 'Editar Estados',
  eliminar_estado: 'Eliminar Estados',
};

const PERMISSION_COLORS: Record<string, string> = {
  ver_reporte: 'hsl(217, 91%, 60%)',
  crear_reporte: 'hsl(142, 76%, 45%)',
  editar_reporte: 'hsl(38, 92%, 50%)',
  eliminar_reporte: 'hsl(0, 84%, 60%)',
  ver_usuario: 'hsl(195, 84%, 50%)',
  crear_usuario: 'hsl(262, 83%, 58%)',
  editar_usuario: 'hsl(340, 82%, 52%)',
  eliminar_usuario: 'hsl(25, 95%, 53%)',
  ver_categoria: 'hsl(180, 70%, 45%)',
  crear_categoria: 'hsl(150, 70%, 45%)',
  editar_categoria: 'hsl(60, 70%, 45%)',
  eliminar_categoria: 'hsl(330, 70%, 45%)',
  ver_estado: 'hsl(280, 70%, 50%)',
  crear_estado: 'hsl(200, 70%, 50%)',
  editar_estado: 'hsl(120, 70%, 45%)',
  eliminar_estado: 'hsl(10, 70%, 50%)',
};

/**
 * Hook especializado para análisis de usuarios con filtros de comparación
 */
export function useUsuariosEntityAnalysis() {
  const { data: usuarios = [], isLoading: isLoadingUsers } = useOptimizedUsers();
  const { data: userRolesList = [], isLoading: isLoadingRoles } = useOptimizedUserRolesList();

  const isLoading = isLoadingUsers || isLoadingRoles;

  // Filtrar solo usuarios no eliminados
  const usuariosActivos = useMemo(() => {
    return usuarios.filter(u => !u.deleted_at);
  }, [usuarios]);

  // Generar opciones de estados
  const statusOptions = useMemo<FilterOption[]>(() => {
    return [
      { id: 'activo', label: 'Activo', color: ESTADO_COLORS.activo },
      { id: 'inactivo', label: 'Inactivo', color: ESTADO_COLORS.inactivo },
      { id: 'bloqueado', label: 'Bloqueado', color: ESTADO_COLORS.bloqueado },
    ];
  }, []);

  // Generar opciones de confirmación
  const confirmationOptions = useMemo<FilterOption[]>(() => {
    return [
      { id: 'confirmado', label: 'Confirmado', color: CONFIRMACION_COLORS.confirmado },
      { id: 'no_confirmado', label: 'No Confirmado', color: CONFIRMACION_COLORS.no_confirmado },
    ];
  }, []);

  // Generar opciones de roles
  const roleOptions = useMemo<FilterOption[]>(() => {
    return Constants.public.Enums.user_role.map(role => ({
      id: role,
      label: ROLE_LABELS[role] || role,
      color: ROLE_COLORS[role] || 'hsl(217, 91%, 60%)',
    }));
  }, []);

  // Generar opciones de permisos
  const permissionOptions = useMemo<FilterOption[]>(() => {
    return Constants.public.Enums.user_permission.map(permission => ({
      id: permission,
      label: PERMISSION_LABELS[permission] || permission,
      color: PERMISSION_COLORS[permission] || 'hsl(217, 91%, 60%)',
    }));
  }, []);

  // Generar items buscables para el filtro de búsqueda
  const searchableItems = useMemo<FilterOption[]>(() => {
    return usuariosActivos.map(u => ({
      id: u.id,
      label: u.name || u.username || 'Usuario',
      description: u.email || undefined,
    }));
  }, [usuariosActivos]);

  // Configurar filtros de comparación
  const filtersController = useComparisonFilters({
    enabledTabs: ['busqueda', 'fechas', 'estado', 'confirmacion', 'roles', 'permisos'],
    minItems: 2,
    maxItems: 10,
    statusOptions,
    confirmationOptions,
    roleOptions,
    permissionOptions,
    searchableItems,
  });

  const { filters, hasActiveFilters } = filtersController;

  // Mapa de roles por usuario
  const rolesByUserId = useMemo(() => {
    const map: Record<string, { roles: string[]; permissions: string[] }> = {};
    userRolesList.forEach(ur => {
      if (!map[ur.user_id]) {
        map[ur.user_id] = { roles: [], permissions: [] };
      }
      if (ur.roles) {
        map[ur.user_id].roles = [...new Set([...map[ur.user_id].roles, ...(ur.roles as string[])])];
      }
      if (ur.permisos) {
        map[ur.user_id].permissions = [...new Set([...map[ur.user_id].permissions, ...(ur.permisos as string[])])];
      }
    });
    return map;
  }, [userRolesList]);

  // Aplicar filtros a los datos
  const filteredData = useMemo(() => {
    let result = [...usuariosActivos];

    // Filtrar por rango de fechas
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      result = result.filter((user) => {
        const userDate = new Date(user.created_at);
        if (filters.dateRange.startDate && userDate < filters.dateRange.startDate) {
          return false;
        }
        if (filters.dateRange.endDate && userDate > filters.dateRange.endDate) {
          return false;
        }
        return true;
      });
    }

    // Filtrar por estados
    if (filters.statuses.length > 0) {
      result = result.filter((user) => 
        filters.statuses.includes(user.estado || 'activo')
      );
    }

    // Filtrar por confirmación
    if (filters.confirmations.length > 0) {
      result = result.filter((user) => {
        const confirmationStatus = user.confirmed ? 'confirmado' : 'no_confirmado';
        return filters.confirmations.includes(confirmationStatus);
      });
    }

    // Filtrar por roles
    if (filters.roles.length > 0) {
      result = result.filter((user) => {
        const userRoles = rolesByUserId[user.id]?.roles || [];
        return filters.roles.some(role => userRoles.includes(role));
      });
    }

    // Filtrar por permisos
    if (filters.permissions.length > 0) {
      result = result.filter((user) => {
        const userPermissions = rolesByUserId[user.id]?.permissions || [];
        return filters.permissions.some(perm => userPermissions.includes(perm));
      });
    }

    // Filtrar por items seleccionados
    if (filters.selectedItems.length > 0) {
      result = result.filter((user) => 
        filters.selectedItems.includes(user.id)
      );
    }

    return result;
  }, [usuariosActivos, filters, rolesByUserId]);

  // Calcular estadísticas
  const stats = useMemo<UsuariosAnalysisStats>(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const total = filteredData.length;
    const activos = filteredData.filter(u => u.estado === 'activo').length;
    const confirmados = filteredData.filter(u => u.confirmed === true).length;
    
    const nuevos = filteredData.filter(u => {
      const createdAt = new Date(u.created_at);
      return createdAt >= sevenDaysAgo;
    }).length;

    // Calcular crecimiento comparando últimos 7 días vs 7 días anteriores
    const anteriores = filteredData.filter(u => {
      const createdAt = new Date(u.created_at);
      return createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo;
    }).length;

    const crecimiento = anteriores > 0 
      ? Math.round(((nuevos - anteriores) / anteriores) * 100)
      : nuevos > 0 ? 100 : 0;

    return {
      total,
      activos,
      confirmados,
      nuevos,
      crecimiento,
    };
  }, [filteredData]);

  // Distribución por estado de activación
  const estadoDistribution = useMemo(() => {
    const counts: Record<string, number> = { activo: 0, inactivo: 0, bloqueado: 0 };

    filteredData.forEach(u => {
      const estado = u.estado || 'activo';
      if (counts[estado] !== undefined) {
        counts[estado]++;
      }
    });

    return Object.entries(counts).map(([key, value]) => ({
      name: key === 'activo' ? 'Activos' : key === 'inactivo' ? 'Inactivos' : 'Bloqueados',
      value,
      color: ESTADO_COLORS[key],
    }));
  }, [filteredData]);

  // Distribución por confirmación de email
  const confirmacionDistribution = useMemo(() => {
    const confirmados = filteredData.filter(u => u.confirmed === true).length;
    const noConfirmados = filteredData.length - confirmados;

    return [
      { name: 'Confirmado', value: confirmados, color: CONFIRMACION_COLORS.confirmado },
      { name: 'No Confirmado', value: noConfirmados, color: CONFIRMACION_COLORS.no_confirmado },
    ];
  }, [filteredData]);

  // Distribución por roles
  const rolesDistribution = useMemo(() => {
    const roleCounts: Record<string, number> = {};

    filteredData.forEach(user => {
      const userRoles = rolesByUserId[user.id]?.roles || [];
      userRoles.forEach(role => {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });
    });

    return Object.entries(roleCounts)
      .map(([key, value]) => ({
        name: ROLE_LABELS[key] || key,
        value,
        color: ROLE_COLORS[key] || 'hsl(217, 91%, 60%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData, rolesByUserId]);

  // Distribución por permisos - muestra solo los seleccionados si hay filtros activos
  const permisosDistribution = useMemo(() => {
    const allPermissions = Constants.public.Enums.user_permission;
    
    // Si hay permisos seleccionados en los filtros, mostrar solo esos
    const permissionsToShow = filters.permissions.length > 0 
      ? allPermissions.filter(perm => filters.permissions.includes(perm))
      : allPermissions;
    
    const permissionCounts: Record<string, number> = {};
    
    permissionsToShow.forEach(perm => {
      permissionCounts[perm] = 0;
    });

    // Contar usuarios por permiso
    filteredData.forEach(user => {
      const userPermissions = rolesByUserId[user.id]?.permissions || [];
      userPermissions.forEach(perm => {
        if (permissionCounts[perm] !== undefined) {
          permissionCounts[perm]++;
        }
      });
    });

    const total = Object.values(permissionCounts).reduce((sum, val) => sum + val, 0);

    // Devolver los permisos filtrados en el orden del enum
    return permissionsToShow.map(perm => ({
      name: PERMISSION_LABELS[perm] || perm,
      value: permissionCounts[perm],
      color: PERMISSION_COLORS[perm] || 'hsl(217, 91%, 60%)',
      percentage: total > 0 ? Math.round((permissionCounts[perm] / total) * 100) : 0,
    }));
  }, [filteredData, rolesByUserId, filters.permissions]);

  // Análisis de estados por confirmación
  const estadosPorConfirmacion = useMemo(() => {
    const estados = ['activo', 'inactivo', 'bloqueado'];
    
    return estados.map(estado => {
      const usuariosEnEstado = filteredData.filter(u => (u.estado || 'activo') === estado);
      const total = usuariosEnEstado.length;
      const confirmados = usuariosEnEstado.filter(u => u.confirmed === true).length;
      const sinConfirmar = total - confirmados;
      const percentage = filteredData.length > 0 
        ? Math.round((total / filteredData.length) * 100) 
        : 0;

      return {
        estado,
        label: estado === 'activo' ? 'Activos' : estado === 'inactivo' ? 'Inactivos' : 'Bloqueados',
        total,
        percentage,
        confirmados,
        sinConfirmar,
        color: ESTADO_COLORS[estado],
      };
    });
  }, [filteredData]);

  // Resumen de estados con porcentajes
  const statusSummary = useMemo(() => {
    const total = filteredData.length;
    
    return estadoDistribution.map((item) => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [estadoDistribution, filteredData.length]);

  // Distribución temporal
  const temporalDistribution = useMemo(() => {
    const now = new Date();
    
    let startDate: Date;
    let endDate: Date = filters.dateRange.endDate || now;
    let daysInRange: number;
    let rangeLabel: string;

    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      startDate = filters.dateRange.startDate;
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      daysInRange = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      rangeLabel = `Últimos ${daysInRange} días`;
    } else if (filters.dateRange.startDate) {
      startDate = filters.dateRange.startDate;
      const diffTime = Math.abs(now.getTime() - startDate.getTime());
      daysInRange = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      rangeLabel = `Últimos ${daysInRange} días`;
    } else {
      daysInRange = 7;
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      rangeLabel = 'Últimos 7 días';
    }

    const recentCount = filteredData.filter((user) => {
      const userDate = new Date(user.created_at);
      return userDate >= startDate && userDate <= endDate;
    }).length;

    const dailyAverage = recentCount / daysInRange;

    return {
      recentCount,
      daysInRange,
      rangeLabel,
      dailyAverage: Math.round(dailyAverage * 10) / 10,
      total: filteredData.length,
      crecimiento: stats.crecimiento,
    };
  }, [filteredData, filters.dateRange, stats.crecimiento]);

  // Eficiencia del sistema
  const efficiency = useMemo(() => {
    const total = filteredData.length;
    const activos = stats.activos;
    const confirmados = stats.confirmados;
    const bloqueados = filteredData.filter(u => u.estado === 'bloqueado').length;

    const tasaActivacion = total > 0 ? Math.round((activos / total) * 100) : 0;
    const tasaConfirmacion = total > 0 ? Math.round((confirmados / total) * 100) : 0;
    const tasaBloqueo = total > 0 ? Math.round((bloqueados / total) * 1000) / 10 : 0;
    const retencion = total > 0 ? Math.round(((total - bloqueados) / total) * 1000) / 10 : 0;

    return {
      tasaActivacion,
      tasaConfirmacion,
      tasaBloqueo,
      retencion,
    };
  }, [filteredData, stats]);

  return {
    // Data
    filteredData,
    originalData: usuariosActivos,
    rolesByUserId,
    isLoading,
    
    // Stats
    stats,
    estadoDistribution,
    confirmacionDistribution,
    rolesDistribution,
    permisosDistribution,
    estadosPorConfirmacion,
    statusSummary,
    temporalDistribution,
    efficiency,
    
    // Filters
    filtersController,
    hasActiveFilters,
    
    // Options
    statusOptions,
    confirmationOptions,
    roleOptions,
    permissionOptions,
    searchableItems,
  };
}

export type UseUsuariosEntityAnalysisReturn = ReturnType<typeof useUsuariosEntityAnalysis>;
