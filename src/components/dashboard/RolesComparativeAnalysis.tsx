import { memo, useMemo } from 'react';
import { 
  Shield, 
  Users, 
  Key, 
  Award, 
  Activity,
  TrendingUp, 
  Clock,
  UserCog
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { ActivityPeak } from '@/components/ui/activity-peak';
import { DistributionChart } from '@/components/ui/distribution-chart';
import { ComparisonFilters } from '@/components/ui/comparison-filters';
import { Skeleton } from '@/components/ui/skeleton';
import { useOptimizedUserRolesList } from '@/hooks/entidades/useOptimizedUserRolesList';
import { useOptimizedUsers } from '@/hooks/entidades/useOptimizedUsers';
import { useComparisonFilters, type FilterOption } from '@/hooks/controlador/useComparisonFilters';
import { useAnimations, animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { useResponsive } from '@/hooks/optimizacion/useResponsive';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';


type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];

// Colores del sistema de diseño
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'hsl(330, 81%, 60%)',
  administrador: 'hsl(217, 91%, 60%)',
  operador_analista: 'hsl(280, 65%, 60%)',
  seguridad_uce: 'hsl(0, 84%, 60%)',
  mantenimiento: 'hsl(38, 92%, 50%)',
  estudiante_personal: 'hsl(142, 76%, 36%)',
  usuario_regular: 'hsl(189, 94%, 43%)',
};

const ROLE_NAMES: Record<string, string> = {
  super_admin: 'Super Admin',
  administrador: 'Administrador',
  operador_analista: 'Operador Analista',
  seguridad_uce: 'Seguridad UCE',
  mantenimiento: 'Mantenimiento',
  estudiante_personal: 'Estudiante/Personal',
  usuario_regular: 'Usuario Regular',
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

const PERMISSION_COLORS = [
  'hsl(330, 81%, 60%)',
  'hsl(280, 65%, 60%)',
  'hsl(217, 91%, 60%)',
  'hsl(189, 94%, 43%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(24, 95%, 53%)',
  'hsl(0, 84%, 60%)',
];

const TOTAL_ROLES_AVAILABLE = 7; // super_admin, administrador, operador_analista, seguridad_uce, mantenimiento, estudiante_personal, usuario_regular
const TOTAL_PERMISSIONS_AVAILABLE = 16;

// Loading skeleton
const AnalysisSkeleton = memo(function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      {/* Activity Peak */}
      <Skeleton className="h-[400px]" />
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
      <Skeleton className="h-[350px]" />
      <Skeleton className="h-[250px]" />
      {/* Bottom Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    </div>
  );
});

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  iconBgClass: string;
}

const StatCard = memo(function StatCard({
  title,
  value,
  description,
  icon,
  iconBgClass,
}: StatCardProps) {
  const { getTransition } = useAnimations();
  
  return (
    <Card className={cn('hover:shadow-md border-border', transitionClasses.normal)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={cn('p-2.5 rounded-lg', iconBgClass)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export const RolesComparativeAnalysis = memo(function RolesComparativeAnalysis() {
  const { getTransition } = useAnimations();
  const { isMobile, isTablet } = useResponsive();
  
  const { data: userRoles = [], isLoading: isLoadingRoles } = useOptimizedUserRolesList();
  const { data: users = [], isLoading: isLoadingUsers } = useOptimizedUsers();

  const isLoading = isLoadingRoles || isLoadingUsers;

  // Generar opciones de roles para filtros
  const roleOptions = useMemo<FilterOption[]>(() => {
    return Object.entries(ROLE_NAMES).map(([id, label]) => ({
      id,
      label,
      color: ROLE_COLORS[id],
    }));
  }, []);

  // Generar opciones de permisos para filtros
  const permissionOptions = useMemo<FilterOption[]>(() => {
    return Object.entries(PERMISSION_NAMES).map(([id, label]) => ({
      id,
      label,
    }));
  }, []);

  // Generar opciones de usuarios para filtros
  const userOptions = useMemo<FilterOption[]>(() => {
    return userRoles.map(ur => {
      const user = users.find(u => u.id === ur.user_id);
      return {
        id: ur.id,
        label: user?.name || user?.email || ur.user_id,
        description: ur.roles?.map(r => ROLE_NAMES[r] || r).join(', '),
      };
    });
  }, [userRoles, users]);

  // Controlador de filtros
  const filtersController = useComparisonFilters({
    enabledTabs: ['roles', 'permisos', 'fechas'],
    roleOptions,
    permissionOptions,
    searchableItems: userOptions,
    minItems: 1,
  });

  const { filters, hasActiveFilters } = filtersController;

  // Filtrar datos según filtros activos
  const filteredUserRoles = useMemo(() => {
    let result = [...userRoles];

    // Filtrar por rango de fechas
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      result = result.filter((ur) => {
        const itemDate = new Date(ur.assigned_at);
        if (filters.dateRange.startDate && itemDate < filters.dateRange.startDate) {
          return false;
        }
        if (filters.dateRange.endDate && itemDate > filters.dateRange.endDate) {
          return false;
        }
        return true;
      });
    }

    // Filtrar por roles
    if (filters.roles.length > 0) {
      result = result.filter((ur) =>
        ur.roles?.some(role => filters.roles.includes(role))
      );
    }

    // Filtrar por permisos
    if (filters.permissions.length > 0) {
      result = result.filter((ur) =>
        ur.permisos?.some(permiso => filters.permissions.includes(permiso))
      );
    }

    // Filtrar por items seleccionados
    if (filters.selectedItems.length > 0) {
      result = result.filter((ur) => filters.selectedItems.includes(ur.id));
    }

    return result;
  }, [userRoles, filters]);

  // Estadísticas principales
  const stats = useMemo(() => {
    const usuariosConRoles = filteredUserRoles.length;
    
    // Roles únicos en uso
    const rolesEnUso = new Set<string>();
    filteredUserRoles.forEach(ur => {
      ur.roles?.forEach(role => rolesEnUso.add(role));
    });
    
    // Permisos activos únicos
    const permisosActivos = new Set<string>();
    filteredUserRoles.forEach(ur => {
      ur.permisos?.forEach(permiso => permisosActivos.add(permiso));
    });

    // Rol más común
    const roleCount: Record<string, number> = {};
    filteredUserRoles.forEach(ur => {
      ur.roles?.forEach(role => {
        roleCount[role] = (roleCount[role] || 0) + 1;
      });
    });
    const rolMasComun = Object.entries(roleCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    return {
      usuariosConRoles,
      rolesEnUso: rolesEnUso.size,
      permisosActivos: permisosActivos.size,
      rolMasComun: ROLE_NAMES[rolMasComun] || rolMasComun,
    };
  }, [filteredUserRoles]);

  // Distribución de roles (para pie chart)
  const roleDistribution = useMemo(() => {
    const roleCount: Record<string, number> = {};
    let total = 0;

    filteredUserRoles.forEach(ur => {
      ur.roles?.forEach(role => {
        roleCount[role] = (roleCount[role] || 0) + 1;
        total++;
      });
    });

    return Object.entries(roleCount)
      .filter(([_, count]) => count > 0)
      .map(([role, count]) => ({
        name: ROLE_NAMES[role] || role,
        value: count,
        color: ROLE_COLORS[role] || 'hsl(217, 91%, 60%)',
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredUserRoles]);

  // Permisos por rol (para bar chart)
  const permisosPorRol = useMemo(() => {
    const rolePermisosCount: Record<string, Set<string>> = {};

    filteredUserRoles.forEach(ur => {
      ur.roles?.forEach(role => {
        if (!rolePermisosCount[role]) {
          rolePermisosCount[role] = new Set();
        }
        ur.permisos?.forEach(permiso => {
          rolePermisosCount[role].add(permiso);
        });
      });
    });

    const items = Object.entries(rolePermisosCount)
      .map(([role, permisos]) => ({
        name: ROLE_NAMES[role] || role,
        value: permisos.size,
        color: ROLE_COLORS[role] || 'hsl(217, 91%, 60%)',
      }))
      .sort((a, b) => b.value - a.value);

    const total = items.reduce((sum, item) => sum + item.value, 0);
    return items.map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [filteredUserRoles]);

  // Distribución de permisos (horizontal bar chart) - respeta filtros
  const permisosDistribution = useMemo(() => {
    // Si hay filtros de permisos activos, solo mostrar esos permisos
    const permisosAMostrar = filters.permissions.length > 0 
      ? filters.permissions 
      : Object.keys(PERMISSION_NAMES);

    // Inicializar los permisos a mostrar con 0
    const permisoCount: Record<string, number> = {};
    permisosAMostrar.forEach(permiso => {
      permisoCount[permiso] = 0;
    });

    // Contar usuarios por permiso
    filteredUserRoles.forEach(ur => {
      ur.permisos?.forEach(permiso => {
        if (permisoCount[permiso] !== undefined) {
          permisoCount[permiso] = permisoCount[permiso] + 1;
        }
      });
    });

    const items = Object.entries(permisoCount)
      .map(([permiso, count], index) => ({
        name: PERMISSION_NAMES[permiso] || permiso,
        value: count,
        color: PERMISSION_COLORS[index % PERMISSION_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const total = items.reduce((sum, item) => sum + item.value, 0);
    return items.map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [filteredUserRoles, filters.permissions]);

  // Análisis de asignadores de roles
  const assignerAnalysis = useMemo(() => {
    const assignerCount: Record<string, number> = {};
    let rolesConAsignador = 0;
    let sinAsignador = 0;

    filteredUserRoles.forEach(ur => {
      if (ur.assigned_by) {
        assignerCount[ur.assigned_by] = (assignerCount[ur.assigned_by] || 0) + 1;
        rolesConAsignador++;
      } else {
        sinAsignador++;
      }
    });

    const totalAsignadores = Object.keys(assignerCount).length;
    const promedioAsignador = totalAsignadores > 0 
      ? (rolesConAsignador / totalAsignadores).toFixed(1) 
      : '0';

    // Obtener nombres de asignadores
    const assignerList = Object.entries(assignerCount)
      .map(([assignerId, count]) => {
        const user = users.find(u => u.id === assignerId);
        return {
          id: assignerId,
          name: user?.name || user?.email || 'Usuario desconocido',
          count,
          percentage: filteredUserRoles.length > 0 
            ? Math.round((count / rolesConAsignador) * 100) 
            : 0,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      totalAsignadores,
      rolesConAsignador,
      sinAsignador,
      promedioAsignador,
      assignerList,
    };
  }, [filteredUserRoles, users]);

  // Resumen de roles
  const rolesSummary = useMemo(() => {
    const total = filteredUserRoles.length;
    return roleDistribution.map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [roleDistribution, filteredUserRoles.length]);

  // Distribución temporal
  const temporalDistribution = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentCount = filteredUserRoles.filter(ur => {
      const date = new Date(ur.assigned_at);
      return date >= sevenDaysAgo;
    }).length;

    const dailyAverage = recentCount / 7;
    const total = filteredUserRoles.length;
    
    // Calcular crecimiento
    const oldestDate = filteredUserRoles.reduce((oldest, ur) => {
      const date = new Date(ur.assigned_at);
      return date < oldest ? date : oldest;
    }, now);
    
    const totalDays = Math.max(1, Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
    const growth = total > 0 ? Math.round((recentCount / total) * 100) : 0;

    return {
      recentCount,
      dailyAverage: dailyAverage.toFixed(1),
      total,
      growth: `+${growth}%`,
    };
  }, [filteredUserRoles]);

  // Eficiencia del sistema
  const efficiencyMetrics = useMemo(() => {
    const totalUsuarios = users.filter(u => !u.deleted_at).length;
    const usuariosConRoles = filteredUserRoles.length;
    const tasaAsignacion = totalUsuarios > 0 
      ? ((usuariosConRoles / totalUsuarios) * 100).toFixed(1) 
      : '0';

    const totalRolesAsignados = filteredUserRoles.reduce(
      (sum, ur) => sum + (ur.roles?.length || 0), 0
    );
    const promRolesPorUsuario = usuariosConRoles > 0 
      ? (totalRolesAsignados / usuariosConRoles).toFixed(1) 
      : '0';

    const totalPermisosAsignados = filteredUserRoles.reduce(
      (sum, ur) => sum + (ur.permisos?.length || 0), 0
    );
    const promPermisosPorUsuario = usuariosConRoles > 0 
      ? (totalPermisosAsignados / usuariosConRoles).toFixed(1) 
      : '0';

    return {
      rolesEnUso: `${stats.rolesEnUso}/${TOTAL_ROLES_AVAILABLE}`,
      promRolesPorUsuario,
      promPermisosPorUsuario,
      tasaAsignacion: `${tasaAsignacion}%`,
    };
  }, [filteredUserRoles, users, stats.rolesEnUso]);

  // Datos para ActivityPeak
  const activityData = useMemo(() => {
    return filteredUserRoles.map(ur => ({
      ...ur,
      created_at: ur.assigned_at,
    }));
  }, [filteredUserRoles]);

  if (isLoading) {
    return <AnalysisSkeleton />;
  }

  return (
    <div className={cn('space-y-6', animationClasses.fadeIn)}>
      <EntityPageHeader
        title="Análisis de Roles y Permisos"
        description="Análisis comparativo detallado con filtros avanzados"
        icon={Shield}
        entityKey="roles"
        showCreate={false}
        showBulkUpload={false}
      />

      {/* Filtros */}
      <ComparisonFilters controller={filtersController} title="Filtros de Comparación" />

      {/* Stats Cards */}
      <div className={cn(
        'grid gap-4',
        isMobile ? 'grid-cols-2' : 'grid-cols-4'
      )}>
        <StatCard
          title="Usuarios con Roles"
          value={stats.usuariosConRoles}
          description="Usuarios con asignaciones"
          icon={<Users className="h-5 w-5 text-cyan-600" />}
          iconBgClass="bg-cyan-50 dark:bg-cyan-900/20"
        />
        <StatCard
          title="Roles en Uso"
          value={stats.rolesEnUso}
          description={`De ${TOTAL_ROLES_AVAILABLE} disponibles`}
          icon={<Shield className="h-5 w-5 text-violet-600" />}
          iconBgClass="bg-violet-50 dark:bg-violet-900/20"
        />
        <StatCard
          title="Permisos Activos"
          value={stats.permisosActivos}
          description="Permisos únicos asignados"
          icon={<Key className="h-5 w-5 text-emerald-600" />}
          iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          title="Rol Más Común"
          value={stats.rolMasComun}
          description="Más asignado"
          icon={<Award className="h-5 w-5 text-pink-600" />}
          iconBgClass="bg-pink-50 dark:bg-pink-900/20"
        />
      </div>

      {/* Activity Peak */}
      <ActivityPeak
        data={activityData}
        dateField="assigned_at"
        entityName="Asignación"
        entityNamePlural="Asignaciones"
        title="Pico de Actividad de Asignación de Roles"
        description="Explora patrones de asignación de roles con drill-down"
      />

      {/* Distribution Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <DistributionChart
          title="Distribución de Roles"
          description="Usuarios por rol en el sistema"
          data={roleDistribution}
          emptyMessage="No hay roles asignados"
        />

        <DistributionChart
          title="Permisos por Rol"
          description="Cantidad de permisos únicos por rol"
          data={permisosPorRol}
          emptyMessage="Sin datos disponibles"
          defaultChartType="bar"
        />
      </div>

      {/* Distribución de Permisos */}
      <DistributionChart
        title="Distribución de Permisos"
        description="Cantidad de usuarios con cada permiso"
        data={permisosDistribution}
        emptyMessage="Sin datos disponibles"
        defaultChartType="bar"
        height={500}
        horizontalBars
        showLegend
      />

      {/* Análisis de Asignadores de Roles */}
      <Card className={getTransition('normal')}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Análisis de Asignadores de Roles</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Análisis de cuántos roles son asignados por cada administrador
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats de asignadores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Asignadores</p>
              <p className="text-xl font-bold text-primary">{assignerAnalysis.totalAsignadores}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Roles con Asignador</p>
              <p className="text-xl font-bold text-emerald-500">{assignerAnalysis.rolesConAsignador}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Sin Asignador</p>
              <p className="text-xl font-bold text-amber-500">{assignerAnalysis.sinAsignador}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Promedio por Asignador</p>
              <p className="text-xl font-bold text-violet-500">{assignerAnalysis.promedioAsignador}</p>
            </div>
          </div>

          {/* Lista de asignadores */}
          {assignerAnalysis.assignerList.length > 0 && (
            <div className="space-y-2">
              {assignerAnalysis.assignerList.map((assigner, index) => (
                <div 
                  key={assigner.id} 
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-primary w-6">{index + 1}</span>
                    <span className="text-sm font-medium text-foreground uppercase">
                      {assigner.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-cyan-500">{assigner.count} roles</span>
                    <span className="text-xs text-muted-foreground">({assigner.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Resumen de Roles */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-500" />
              <CardTitle className="text-sm font-medium">Resumen de Roles</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {rolesSummary.map((role, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: role.color }}>
                  {role.name}
                </span>
                <span className="text-sm font-medium">
                  {role.value}
                  <span className="text-muted-foreground ml-1">({role.percentage}%)</span>
                </span>
              </div>
            ))}
            {rolesSummary.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Distribución Temporal */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm font-medium">Distribución Temporal</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-500">Nuevos (7d)</span>
              <span className="text-sm font-medium">{temporalDistribution.recentCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-500">Promedio diario</span>
              <span className="text-sm font-medium">{temporalDistribution.dailyAverage}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-500">Total histórico</span>
              <span className="text-sm font-medium">{temporalDistribution.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-pink-500">Crecimiento</span>
              <span className="text-sm font-medium">{temporalDistribution.growth}</span>
            </div>
          </CardContent>
        </Card>

        {/* Eficiencia del Sistema */}
        <Card className={getTransition('normal')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm font-medium">Eficiencia del Sistema</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-violet-500">Roles en uso</span>
              <span className="text-sm font-medium">{efficiencyMetrics.rolesEnUso}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-500">Prom. roles/usuario</span>
              <span className="text-sm font-medium">{efficiencyMetrics.promRolesPorUsuario}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-500">Prom. permisos/usuario</span>
              <span className="text-sm font-medium">{efficiencyMetrics.promPermisosPorUsuario}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-500">Tasa de asignación</span>
              <span className="text-sm font-medium">{efficiencyMetrics.tasaAsignacion}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default RolesComparativeAnalysis;
