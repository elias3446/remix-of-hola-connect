import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useUserDataReady } from '@/hooks/entidades';
import { hasRole, hasPermission } from '@/hooks/entidades';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];

/**
 * Configuración de protección para cada ruta
 */
interface RouteConfig {
  /** Roles que pueden acceder (cualquiera de ellos) */
  roles?: UserRole[];
  /** Permisos requeridos (cualquiera de ellos) */
  permissions?: UserPermission[];
  /** Si es true, solo usuarios autenticados pueden acceder */
  requireAuth?: boolean;
  /** Si es true, solo admins pueden acceder */
  adminOnly?: boolean;
}

/**
 * Mapeo de rutas a sus configuraciones de acceso
 * Las rutas pueden usar patrones con :param para rutas dinámicas
 */
const routeConfigurations: Record<string, RouteConfig> = {
  // Dashboard - acceso general autenticado
  '/dashboard': { requireAuth: true },
  '/bienvenida': { requireAuth: true },
  
  // Categorías
  '/categorias': { 
    requireAuth: true,
    permissions: ['ver_categoria'],
  },
  '/categorias/nueva': { 
    requireAuth: true,
    permissions: ['crear_categoria'],
  },
  '/categorias/:id': { 
    requireAuth: true,
    permissions: ['ver_categoria'],
  },
  '/categorias/:id/editar': { 
    requireAuth: true,
    permissions: ['editar_categoria'],
  },
  '/categorias/carga-masiva': { 
    requireAuth: true,
    permissions: ['crear_categoria'],
  },
  
  // Tipos de reporte
  '/tipo-reportes': { 
    requireAuth: true,
    permissions: ['ver_estado'],
  },
  '/tipo-reportes/nuevo': { 
    requireAuth: true,
    permissions: ['crear_estado'],
  },
  '/tipo-reportes/:id': { 
    requireAuth: true,
    permissions: ['ver_estado'],
  },
  '/tipo-reportes/:id/editar': { 
    requireAuth: true,
    permissions: ['editar_estado'],
  },
  '/tipo-reportes/carga-masiva': { 
    requireAuth: true,
    permissions: ['crear_estado'],
  },
  
  // Usuarios - solo admins
  '/usuarios': { 
    requireAuth: true,
    permissions: ['ver_usuario'],
  },
  '/usuarios/nuevo': { 
    requireAuth: true,
    permissions: ['crear_usuario'],
  },
  '/usuarios/:id': { 
    requireAuth: true,
    permissions: ['ver_usuario'],
  },
  '/usuarios/:id/editar': { 
    requireAuth: true,
    permissions: ['editar_usuario'],
  },
  '/usuarios/carga-masiva': { 
    requireAuth: true,
    permissions: ['crear_usuario'],
  },
  
  // Reportes
  '/reportes': { 
    requireAuth: true,
    permissions: ['ver_reporte'],
  },
  '/reportes/:id': { 
    requireAuth: true,
    permissions: ['ver_reporte'],
  },
  '/reportes/:id/editar': { 
    requireAuth: true,
    permissions: ['editar_reporte'],
  },
  '/reportes/carga-masiva': { 
    requireAuth: true,
    permissions: ['crear_reporte'],
  },
  '/crear-reporte': { 
    requireAuth: true,
    permissions: ['crear_reporte'],
  },
  '/mis-reportes': { 
    requireAuth: true,
  },
  
  // Auditoría - solo admins
  '/auditoria': { 
    requireAuth: true,
    adminOnly: true,
  },
  
  // Rastreo
  '/rastreo': { 
    requireAuth: true,
  },
  
  // Notificaciones y mensajes
  '/notificaciones': { requireAuth: true },
  '/mensajes': { requireAuth: true },
  
  // Red social
  '/red-social': { requireAuth: true },
  '/red-social/post/:postId': { requireAuth: true },
  '/red-social/trending': { requireAuth: true },
  '/perfil/:username': { requireAuth: true },
  '/perfil/id/:userId': { requireAuth: true },
  
  // Perfil y configuración
  '/perfil': { requireAuth: true },
  '/perfil/editar': { requireAuth: true },
  '/configuracion': { requireAuth: true },
};

/**
 * Convierte un patrón de ruta en una expresión regular
 */
function routeToRegex(route: string): RegExp {
  const pattern = route
    .replace(/:[^/]+/g, '[^/]+') // Reemplaza :param por cualquier segmento
    .replace(/\//g, '\\/'); // Escapa las barras
  return new RegExp(`^${pattern}$`);
}

/**
 * Encuentra la configuración de una ruta, soportando parámetros dinámicos
 */
function findRouteConfig(pathname: string): RouteConfig | null {
  // Primero buscar coincidencia exacta
  if (routeConfigurations[pathname]) {
    return routeConfigurations[pathname];
  }
  
  // Buscar coincidencia con patrones
  for (const [route, config] of Object.entries(routeConfigurations)) {
    if (route.includes(':')) {
      const regex = routeToRegex(route);
      if (regex.test(pathname)) {
        return config;
      }
    }
  }
  
  return null;
}

export interface UseRouteProtectionResult {
  /** Si el usuario tiene acceso a la ruta actual */
  hasAccess: boolean;
  /** Si los datos necesarios están cargando */
  isLoading: boolean;
  /** Si los datos del usuario están listos */
  isReady: boolean;
  /** Si el usuario es admin */
  isAdmin: boolean;
  /** La configuración de la ruta actual (si existe) */
  routeConfig: RouteConfig | null;
  /** Mensaje de error si no tiene acceso */
  accessDeniedReason: string | null;
}

/**
 * Hook para verificar si el usuario actual tiene acceso a la ruta
 * 
 * @example
 * ```tsx
 * const { hasAccess, isLoading, accessDeniedReason } = useRouteProtection();
 * 
 * if (isLoading) return <LoadingScreen />;
 * if (!hasAccess) return <AccessDenied reason={accessDeniedReason} />;
 * return <ProtectedContent />;
 * ```
 */
export function useRouteProtection(): UseRouteProtectionResult {
  const location = useLocation();
  const { userRoles, isReady, isLoading } = useUserDataReady();

  const isAdmin = useMemo(() => {
    if (!userRoles) return false;
    return hasRole(userRoles, 'super_admin') || hasRole(userRoles, 'administrador');
  }, [userRoles]);

  const result = useMemo((): UseRouteProtectionResult => {
    const routeConfig = findRouteConfig(location.pathname);
    
    // Si no hay configuración para la ruta, permitir acceso (ruta pública o no protegida)
    if (!routeConfig) {
      return {
        hasAccess: true,
        isLoading,
        isReady,
        isAdmin,
        routeConfig: null,
        accessDeniedReason: null,
      };
    }

    // Si aún está cargando, no denegar acceso todavía
    if (!isReady || isLoading) {
      return {
        hasAccess: true, // Asumimos acceso mientras carga
        isLoading: true,
        isReady: false,
        isAdmin,
        routeConfig,
        accessDeniedReason: null,
      };
    }

    // Admins siempre tienen acceso
    if (isAdmin) {
      return {
        hasAccess: true,
        isLoading: false,
        isReady: true,
        isAdmin: true,
        routeConfig,
        accessDeniedReason: null,
      };
    }

    // Verificar si es solo para admins
    if (routeConfig.adminOnly) {
      return {
        hasAccess: false,
        isLoading: false,
        isReady: true,
        isAdmin: false,
        routeConfig,
        accessDeniedReason: 'Esta sección está restringida a administradores.',
      };
    }

    // Verificar roles
    if (routeConfig.roles && routeConfig.roles.length > 0) {
      const hasRequiredRole = routeConfig.roles.some(role => hasRole(userRoles, role));
      if (!hasRequiredRole) {
        return {
          hasAccess: false,
          isLoading: false,
          isReady: true,
          isAdmin: false,
          routeConfig,
          accessDeniedReason: 'No tienes el rol necesario para acceder a esta sección.',
        };
      }
    }

    // Verificar permisos
    if (routeConfig.permissions && routeConfig.permissions.length > 0) {
      const hasRequiredPermission = routeConfig.permissions.some(perm => hasPermission(userRoles, perm));
      if (!hasRequiredPermission) {
        return {
          hasAccess: false,
          isLoading: false,
          isReady: true,
          isAdmin: false,
          routeConfig,
          accessDeniedReason: 'No tienes los permisos necesarios para acceder a esta sección.',
        };
      }
    }

    // Todas las verificaciones pasaron
    return {
      hasAccess: true,
      isLoading: false,
      isReady: true,
      isAdmin,
      routeConfig,
      accessDeniedReason: null,
    };
  }, [location.pathname, userRoles, isReady, isLoading, isAdmin]);

  return result;
}

/**
 * Hook para verificar acceso a una ruta específica (no la actual)
 */
export function useCanAccessRoute(path: string): boolean {
  const { userRoles, isReady } = useUserDataReady();
  
  return useMemo(() => {
    if (!isReady) return false;
    
    const routeConfig = findRouteConfig(path);
    if (!routeConfig) return true;
    
    // Admins siempre tienen acceso
    const isAdmin = hasRole(userRoles, 'super_admin') || hasRole(userRoles, 'administrador');
    if (isAdmin) return true;
    
    // Verificar adminOnly
    if (routeConfig.adminOnly) return false;
    
    // Verificar roles
    if (routeConfig.roles?.length) {
      const hasRequiredRole = routeConfig.roles.some(role => hasRole(userRoles, role));
      if (!hasRequiredRole) return false;
    }
    
    // Verificar permisos
    if (routeConfig.permissions?.length) {
      const hasRequiredPermission = routeConfig.permissions.some(perm => hasPermission(userRoles, perm));
      if (!hasRequiredPermission) return false;
    }
    
    return true;
  }, [path, userRoles, isReady]);
}

export { routeConfigurations, findRouteConfig };
export type { RouteConfig };
