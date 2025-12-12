import { useMemo } from 'react';
import { useOptimizedUserRolesList } from '@/hooks/entidades/useOptimizedUserRolesList';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];

export interface RolesAnalysisStats {
  totalRoles: number;
  usuariosConRoles: number;
  permisosActivos: number;
  rolMasComun: string;
}

export interface RoleDistributionData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface PermisosPorRolData {
  name: string;
  value: number;
  color: string;
}

export interface MatrizPermisosData {
  name: string;
  value: number;
  color: string;
}

// Colores del sistema de diseño
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'hsl(330, 81%, 60%)',   // Rosa/Magenta
  admin: 'hsl(217, 91%, 60%)',         // Azul
  moderador: 'hsl(280, 65%, 60%)',     // Púrpura
  usuario_regular: 'hsl(217, 91%, 45%)', // Azul oscuro
};

const ROLE_NAMES: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  moderador: 'Moderador',
  usuario_regular: 'Usuario',
};

const PERMISSION_NAMES: Record<string, string> = {
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

export function useRolesAnalysis() {
  const { data: userRoles = [], isLoading, refetch } = useOptimizedUserRolesList();

  // Estadísticas principales
  const stats = useMemo<RolesAnalysisStats>(() => {
    const usuariosConRoles = userRoles.length;
    
    // Obtener roles únicos utilizados en el sistema
    const rolesUnicos = new Set<string>();
    userRoles.forEach(ur => {
      ur.roles?.forEach(role => rolesUnicos.add(role));
    });
    
    // Contar permisos activos únicos en uso
    const permisosEnUso = new Set<string>();
    userRoles.forEach(ur => {
      ur.permisos?.forEach(permiso => permisosEnUso.add(permiso));
    });

    // Encontrar el rol más común
    const roleCount: Record<string, number> = {};
    userRoles.forEach(ur => {
      ur.roles?.forEach(role => {
        roleCount[role] = (roleCount[role] || 0) + 1;
      });
    });

    const rolMasComun = Object.entries(roleCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    return {
      totalRoles: rolesUnicos.size,
      usuariosConRoles,
      permisosActivos: permisosEnUso.size,
      rolMasComun: ROLE_NAMES[rolMasComun] || rolMasComun,
    };
  }, [userRoles]);

  // Distribución de roles (para pie chart)
  const roleDistribution = useMemo<RoleDistributionData[]>(() => {
    const roleCount: Record<string, number> = {};
    let totalAssignments = 0;

    userRoles.forEach(ur => {
      ur.roles?.forEach(role => {
        roleCount[role] = (roleCount[role] || 0) + 1;
        totalAssignments++;
      });
    });

    return Object.entries(roleCount)
      .filter(([_, count]) => count > 0)
      .map(([role, count]) => ({
        name: ROLE_NAMES[role] || role,
        value: count,
        color: ROLE_COLORS[role] || 'hsl(217, 91%, 60%)',
        percentage: totalAssignments > 0 ? Math.round((count / totalAssignments) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [userRoles]);

  // Permisos por rol (para bar chart)
  const permisosPorRol = useMemo<PermisosPorRolData[]>(() => {
    const rolePermisosCount: Record<string, Set<string>> = {};

    userRoles.forEach(ur => {
      ur.roles?.forEach(role => {
        if (!rolePermisosCount[role]) {
          rolePermisosCount[role] = new Set();
        }
        ur.permisos?.forEach(permiso => {
          rolePermisosCount[role].add(permiso);
        });
      });
    });

    return Object.entries(rolePermisosCount)
      .map(([role, permisos]) => ({
        name: ROLE_NAMES[role] || role,
        value: permisos.size,
        color: ROLE_COLORS[role] || 'hsl(217, 91%, 60%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [userRoles]);

  // Matriz de permisos (cuántos roles tienen cada permiso)
  const matrizPermisos = useMemo<MatrizPermisosData[]>(() => {
    const permisoCount: Record<string, number> = {};

    userRoles.forEach(ur => {
      ur.permisos?.forEach(permiso => {
        permisoCount[permiso] = (permisoCount[permiso] || 0) + 1;
      });
    });

    return Object.entries(permisoCount)
      .map(([permiso, count]) => ({
        name: PERMISSION_NAMES[permiso] || permiso,
        value: count,
        color: 'url(#gradientPurpleCyan)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [userRoles]);

  return {
    stats,
    roleDistribution,
    permisosPorRol,
    matrizPermisos,
    isLoading,
    refetch,
  };
}
