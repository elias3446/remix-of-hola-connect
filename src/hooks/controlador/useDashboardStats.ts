import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { useOptimizedUsers } from '@/hooks/entidades/useOptimizedUsers';
import { useOptimizedUserRolesList } from '@/hooks/entidades/useOptimizedUserRolesList';

export interface DashboardStats {
  totalReportes: number;
  usuariosActivos: number;
  publicaciones: number;
  conversaciones: number;
  reportesPendientes: number;
  reportesEnProceso: number;
  reportesResueltos: number;
}

export interface ChartDataPoint {
  date: string;
  label: string;
  value: number;
}

export interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

export interface PriorityDistribution {
  name: string;
  value: number;
}

export interface RoleDistribution {
  name: string;
  value: number;
  color: string;
}

export interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  reportesTrend: ChartDataPoint[];
  statusDistribution: StatusDistribution[];
  priorityDistribution: PriorityDistribution[];
  socialActivityTrend: ChartDataPoint[];
  rolesDistribution: RoleDistribution[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

// Mapeo de nombres de roles a español
const ROLE_NAMES: Record<string, string> = {
  super_admin: 'Super Admin',
  administrador: 'Administrador',
  mantenimiento: 'Mantenimiento',
  usuario_regular: 'Usuario',
  estudiante_personal: 'Estudiante',
  operador_analista: 'Operador',
  seguridad_uce: 'Seguridad',
};

// Colores para roles
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'hsl(0, 84%, 60%)',
  administrador: 'hsl(280, 84%, 60%)',
  mantenimiento: 'hsl(142, 76%, 36%)',
  usuario_regular: 'hsl(217, 91%, 60%)',
  estudiante_personal: 'hsl(38, 92%, 50%)',
  operador_analista: 'hsl(180, 70%, 45%)',
  seguridad_uce: 'hsl(320, 70%, 50%)',
};

// Mapeo de prioridades
const PRIORITY_NAMES: Record<string, string> = {
  urgente: 'Urgente',
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
};

export function useDashboardStats(): UseDashboardStatsReturn {
  const queryClient = useQueryClient();
  
  // Usar hooks de entidades existentes para datos reales
  const { data: reportes = [], isLoading: reportesLoading, refetch: refetchReportes } = useOptimizedReportes();
  const { data: usuarios = [], isLoading: usuariosLoading, refetch: refetchUsuarios } = useOptimizedUsers();
  const { data: userRoles = [], isLoading: rolesLoading, refetch: refetchRoles } = useOptimizedUserRolesList();

  // Calcular estadísticas desde datos reales de reportes
  const stats = useMemo<DashboardStats | null>(() => {
    if (reportesLoading || usuariosLoading) return null;

    const reportesActivos = reportes.filter(r => r.activo && !r.deleted_at);
    const usuariosActivos = usuarios.filter(u => !u.deleted_at);

    return {
      totalReportes: reportesActivos.length,
      usuariosActivos: usuariosActivos.length,
      publicaciones: 0, // Se calculará con query separada
      conversaciones: 0, // Se calculará con query separada
      reportesPendientes: reportesActivos.filter(r => r.status === 'pendiente').length,
      reportesEnProceso: reportesActivos.filter(r => r.status === 'en_progreso').length,
      reportesResueltos: reportesActivos.filter(r => r.status === 'resuelto').length,
    };
  }, [reportes, usuarios, reportesLoading, usuariosLoading]);

  // Query para publicaciones y conversaciones
  const { data: socialData } = useQuery({
    queryKey: ['dashboard-social-counts'],
    queryFn: async () => {
      const [publicacionesResult, conversacionesResult] = await Promise.all([
        supabase.from('publicaciones').select('id', { count: 'exact', head: true }).eq('activo', true).is('deleted_at', null),
        supabase.from('conversaciones').select('id', { count: 'exact', head: true }),
      ]);

      return {
        publicaciones: publicacionesResult.count || 0,
        conversaciones: conversacionesResult.count || 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Estadísticas finales con datos sociales
  const finalStats = useMemo<DashboardStats | null>(() => {
    if (!stats) return null;
    return {
      ...stats,
      publicaciones: socialData?.publicaciones || 0,
      conversaciones: socialData?.conversaciones || 0,
    };
  }, [stats, socialData]);

  // Tendencia de reportes últimos 7 días (datos reales)
  const reportesTrend = useMemo<ChartDataPoint[]>(() => {
    const today = new Date();
    const days: ChartDataPoint[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const count = reportes.filter(r => {
        const createdAt = new Date(r.created_at);
        return createdAt >= startOfDay && createdAt <= endOfDay;
      }).length;

      days.push({
        date: dateStr,
        label: format(date, 'd MMM', { locale: es }),
        value: count,
      });
    }

    return days;
  }, [reportes]);

  // Distribución por estado (datos reales)
  const statusDistribution = useMemo<StatusDistribution[]>(() => {
    if (!stats) return [];
    return [
      { name: 'Pendientes', value: stats.reportesPendientes, color: 'hsl(38, 92%, 50%)' },
      { name: 'En Proceso', value: stats.reportesEnProceso, color: 'hsl(217, 91%, 60%)' },
      { name: 'Resueltos', value: stats.reportesResueltos, color: 'hsl(142, 76%, 36%)' },
    ];
  }, [stats]);

  // Distribución por prioridad (datos reales)
  const priorityDistribution = useMemo<PriorityDistribution[]>(() => {
    const reportesActivos = reportes.filter(r => r.activo && !r.deleted_at);
    const priorities: Record<string, number> = {
      urgente: 0,
      alto: 0,
      medio: 0,
      bajo: 0,
    };

    reportesActivos.forEach(r => {
      if (r.priority && priorities[r.priority] !== undefined) {
        priorities[r.priority]++;
      }
    });

    return Object.entries(priorities)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => ({
        name: PRIORITY_NAMES[key] || key,
        value: count,
      }));
  }, [reportes]);

  // Actividad social últimos 7 días
  const { data: socialActivityTrend = [] } = useQuery({
    queryKey: ['dashboard-social-trend'],
    queryFn: async () => {
      const days: ChartDataPoint[] = [];
      const today = new Date();

      // Obtener todas las publicaciones de los últimos 7 días
      const startDate = subDays(today, 6);
      startDate.setHours(0, 0, 0, 0);

      const { data: publicaciones } = await supabase
        .from('publicaciones')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .eq('activo', true)
        .is('deleted_at', null);

      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const count = publicaciones?.filter(p => {
          const createdAt = new Date(p.created_at);
          return createdAt >= startOfDay && createdAt <= endOfDay;
        }).length || 0;

        days.push({
          date: dateStr,
          label: format(date, 'd MMM', { locale: es }),
          value: count,
        });
      }

      return days;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Distribución de usuarios por rol (datos reales)
  const rolesDistribution = useMemo<RoleDistribution[]>(() => {
    if (rolesLoading || !userRoles.length) return [];

    const roleCount: Record<string, number> = {};

    userRoles.forEach(ur => {
      ur.roles?.forEach((role: string) => {
        roleCount[role] = (roleCount[role] || 0) + 1;
      });
    });

    return Object.entries(roleCount)
      .filter(([_, count]) => count > 0)
      .map(([role, count]) => ({
        name: ROLE_NAMES[role] || role,
        value: count,
        color: ROLE_COLORS[role] || 'hsl(217, 91%, 60%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [userRoles, rolesLoading]);

  const isLoading = reportesLoading || usuariosLoading || rolesLoading;
  const isError = false;

  // Función para refrescar todos los datos del dashboard
  const refetch = useCallback(() => {
    // Refrescar datos de entidades
    refetchReportes();
    refetchUsuarios();
    refetchRoles();
    
    // Invalidar queries de dashboard
    queryClient.invalidateQueries({ queryKey: ['dashboard-social-counts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-social-trend'] });
  }, [refetchReportes, refetchUsuarios, refetchRoles, queryClient]);

  return {
    stats: finalStats,
    reportesTrend,
    statusDistribution,
    priorityDistribution,
    socialActivityTrend,
    rolesDistribution,
    isLoading,
    isError,
    refetch,
  };
}
