import { useMemo } from 'react';
import { subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOptimizedUsers } from '@/hooks/entidades/useOptimizedUsers';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';

export interface UsuariosAnalysisStats {
  totalUsuarios: number;
  usuariosActivos: number;
  nuevos7Dias: number;
  tasaConfirmacion: number;
}

export interface UsuariosEstadoData {
  name: string;
  value: number;
  color: string;
}

export interface UsuariosActividadData {
  name: string;
  value: number;
}

export interface UsuariosCrecimientoData {
  date: string;
  label: string;
  value: number;
}

// Colores del sistema de diseño
const ESTADO_COLORS = {
  activo: 'hsl(142, 76%, 45%)',     // Verde
  inactivo: 'hsl(217, 14%, 70%)',   // Gris
  bloqueado: 'hsl(0, 84%, 60%)',    // Rojo
};

const ESTADO_NAMES: Record<string, string> = {
  activo: 'Activos',
  inactivo: 'Inactivos',
  bloqueado: 'Bloqueados',
};

export function useUsuariosAnalysis() {
  const { data: usuarios = [], isLoading: isLoadingUsers } = useOptimizedUsers();
  const { data: reportes = [], isLoading: isLoadingReportes } = useOptimizedReportes();

  const isLoading = isLoadingUsers || isLoadingReportes;

  // Filtrar solo usuarios no eliminados
  const usuariosActivos = useMemo(() => {
    return usuarios.filter(u => !u.deleted_at);
  }, [usuarios]);

  // Estadísticas principales
  const stats = useMemo<UsuariosAnalysisStats>(() => {
    const total = usuariosActivos.length;
    const activos = usuariosActivos.filter(u => u.estado === 'activo').length;
    const confirmados = usuariosActivos.filter(u => u.confirmed === true).length;
    
    // Usuarios nuevos en los últimos 7 días
    const hace7Dias = subDays(new Date(), 7);
    const nuevos = usuariosActivos.filter(u => {
      const createdAt = new Date(u.created_at);
      return createdAt >= hace7Dias;
    }).length;

    // Tasa de confirmación
    const tasaConfirmacion = total > 0 ? Math.round((confirmados / total) * 100) : 0;

    return {
      totalUsuarios: total,
      usuariosActivos: activos,
      nuevos7Dias: nuevos,
      tasaConfirmacion,
    };
  }, [usuariosActivos]);

  // Distribución por estado
  const estadoDistribution = useMemo<UsuariosEstadoData[]>(() => {
    const estadoCount: Record<string, number> = {
      activo: 0,
      inactivo: 0,
      bloqueado: 0,
    };

    usuariosActivos.forEach(u => {
      const estado = u.estado || 'activo';
      if (estadoCount[estado] !== undefined) {
        estadoCount[estado]++;
      }
    });

    return ['activo', 'inactivo', 'bloqueado'].map(estado => ({
      name: ESTADO_NAMES[estado],
      value: estadoCount[estado],
      color: ESTADO_COLORS[estado as keyof typeof ESTADO_COLORS],
    }));
  }, [usuariosActivos]);

  // Actividad de usuarios (reportes creados por usuario)
  const actividadData = useMemo<UsuariosActividadData[]>(() => {
    // Contar reportes por usuario
    const reportesPorUsuario: Record<string, number> = {};
    
    reportes.forEach(r => {
      if (r.user_id && r.activo && !r.deleted_at) {
        reportesPorUsuario[r.user_id] = (reportesPorUsuario[r.user_id] || 0) + 1;
      }
    });

    // Mapear a usuarios con nombres
    const actividadUsuarios = usuariosActivos
      .filter(u => reportesPorUsuario[u.id] > 0)
      .map(u => ({
        name: (u.name || u.username || 'Usuario').toUpperCase(),
        value: reportesPorUsuario[u.id] || 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 usuarios más activos

    return actividadUsuarios;
  }, [usuariosActivos, reportes]);

  // Crecimiento de usuarios últimos 30 días
  const crecimientoData = useMemo<UsuariosCrecimientoData[]>(() => {
    const today = new Date();
    const dias: UsuariosCrecimientoData[] = [];

    // Obtener datos por semana (5 puntos en 30 días)
    for (let i = 4; i >= 0; i--) {
      const date = subDays(today, i * 7);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Contar usuarios creados hasta esa fecha
      const count = usuarios.filter(u => {
        const createdAt = new Date(u.created_at);
        return createdAt <= date && !u.deleted_at;
      }).length;

      dias.push({
        date: dateStr,
        label: format(date, 'd MMM', { locale: es }),
        value: count,
      });
    }

    return dias;
  }, [usuarios]);

  return {
    stats,
    estadoDistribution,
    actividadData,
    crecimientoData,
    isLoading,
  };
}
