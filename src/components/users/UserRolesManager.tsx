import { useState, useMemo, useCallback } from 'react';
import { Circle, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useRolePermissions, ROLE_PERMISSIONS_MAP } from '@/hooks/controlador/useRolePermissions';
import { useOptimizedUserRolesList } from '@/hooks/entidades/useOptimizedUserRolesList';
import { useOptimizedComponent, animationClasses } from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];

// Definición de roles con sus colores y descripciones
const USER_ROLES_CONFIG: { value: UserRole; label: string; description: string; color: string }[] = [
  { value: 'super_admin', label: 'Super Administrador', description: 'Rol de super administrador con acceso completo', color: 'bg-amber-500' },
  { value: 'administrador', label: 'Administrador', description: 'Rol de administrador con todos los permisos del sistema', color: 'bg-red-500' },
  { value: 'mantenimiento', label: 'Mantenimiento', description: 'Rol de mantenimiento con permisos de gestión', color: 'bg-blue-500' },
  { value: 'usuario_regular', label: 'Usuario Regular', description: 'Rol básico de usuario con permisos limitados', color: 'bg-gray-500' },
  { value: 'estudiante_personal', label: 'Estudiante/Personal', description: 'Rol para estudiantes y personal de la institución', color: 'bg-gray-400' },
  { value: 'operador_analista', label: 'Operador Analista', description: 'Rol para operadores y analistas del sistema', color: 'bg-blue-600' },
  { value: 'seguridad_uce', label: 'Seguridad UCE', description: 'Rol para personal de seguridad de la UCE', color: 'bg-gray-600' },
];

interface UserRolesManagerProps {
  userId: string;
  className?: string;
  readOnly?: boolean;
}

export function UserRolesManager({ userId, className, readOnly = false }: UserRolesManagerProps) {
  const { data: userRolesList, refetch } = useOptimizedUserRolesList();
  const { getPermissionsForRoles, getPermissionsForRole } = useRolePermissions();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<UserRole | null>(null);

  // Aplicar optimizaciones
  useOptimizedComponent({ userId, readOnly }, { componentName: 'UserRolesManager' });

  // Obtener datos del usuario
  const userRoleData = useMemo(() => {
    return userRolesList.find(ur => ur.user_id === userId);
  }, [userRolesList, userId]);

  // Obtener roles actuales del usuario
  const currentUserRoles = useMemo(() => {
    return (userRoleData?.roles || []) as UserRole[];
  }, [userRoleData]);

  // Obtener permisos actuales del usuario
  const currentPermissions = useMemo(() => {
    return (userRoleData?.permisos || []) as UserPermission[];
  }, [userRoleData]);

  // Obtener el id del registro de user_roles
  const userRoleRecordId = useMemo(() => {
    return userRoleData?.id || null;
  }, [userRoleData]);

  // Roles asignados con su configuración
  const assignedRoles = useMemo(() => {
    return USER_ROLES_CONFIG.filter(role => 
      currentUserRoles.includes(role.value)
    );
  }, [currentUserRoles]);

  // Roles disponibles (no asignados)
  const availableRoles = useMemo(() => {
    return USER_ROLES_CONFIG.filter(role => 
      !currentUserRoles.includes(role.value)
    );
  }, [currentUserRoles]);

  // Función para actualizar roles en la base de datos
  const updateUserRolesAndPermissions = useCallback(async (
    newRoles: UserRole[], 
    newPermissions: UserPermission[]
  ) => {
    setIsUpdating(true);
    try {
      if (userRoleRecordId) {
        const { error } = await supabase
          .from('user_roles')
          .update({
            roles: newRoles,
            permisos: newPermissions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userRoleRecordId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            roles: newRoles,
            permisos: newPermissions,
          });

        if (error) throw error;
      }

      await refetch();
      return true;
    } catch (error) {
      console.error('Error al actualizar roles:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [userId, userRoleRecordId, refetch]);

  // Manejar asignación de rol
  const handleAssignRole = useCallback(async (role: UserRole) => {
    if (readOnly || isUpdating) return;
    
    setUpdatingRole(role);
    const newRoles = [...currentUserRoles, role];
    
    // Al asignar un rol, agregamos los permisos del nuevo rol a los existentes
    const rolePermissions = getPermissionsForRole(role);
    const newPermissions = [...new Set([...currentPermissions, ...rolePermissions])];
    
    const success = await updateUserRolesAndPermissions(newRoles, newPermissions);
    
    if (success) {
      toast.success(`Rol "${USER_ROLES_CONFIG.find(r => r.value === role)?.label}" asignado correctamente`);
    } else {
      toast.error('Error al asignar el rol');
    }
    
    setUpdatingRole(null);
  }, [currentUserRoles, currentPermissions, updateUserRolesAndPermissions, getPermissionsForRole, readOnly, isUpdating]);

  // Manejar eliminación de rol
  const handleRemoveRole = useCallback(async (role: UserRole) => {
    if (readOnly || isUpdating) return;
    
    setUpdatingRole(role);
    const newRoles = currentUserRoles.filter(r => r !== role);
    
    // Obtener permisos del rol que se está eliminando
    const removedRolePermissions = getPermissionsForRole(role);
    
    // Obtener permisos que siguen siendo requeridos por los roles restantes
    const remainingRolesPermissions = getPermissionsForRoles(newRoles);
    
    // Filtrar permisos: mantener los que no son del rol eliminado O los que son requeridos por otros roles
    const newPermissions = currentPermissions.filter(permission => {
      // Si el permiso NO era del rol eliminado, mantenerlo
      if (!removedRolePermissions.includes(permission)) {
        return true;
      }
      // Si el permiso ES del rol eliminado pero también es de otro rol activo, mantenerlo
      if (remainingRolesPermissions.includes(permission)) {
        return true;
      }
      // Si el permiso era SOLO del rol eliminado, quitarlo
      return false;
    });
    
    const success = await updateUserRolesAndPermissions(newRoles, newPermissions);
    
    if (success) {
      toast.success(`Rol "${USER_ROLES_CONFIG.find(r => r.value === role)?.label}" eliminado correctamente`);
    } else {
      toast.error('Error al eliminar el rol');
    }
    
    setUpdatingRole(null);
  }, [currentUserRoles, currentPermissions, updateUserRolesAndPermissions, getPermissionsForRole, getPermissionsForRoles, readOnly, isUpdating]);

  return (
    <div className={cn('space-y-6', animationClasses.fadeIn, className)}>
      {/* Roles Asignados */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Circle className="h-4 w-4 text-primary" />
            Roles Asignados
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Roles actualmente asignados al usuario
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {assignedRoles.length > 0 ? (
            assignedRoles.map((role) => (
              <div
                key={role.value}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border transition-all',
                  'bg-primary/5 border-primary/20'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', role.color)} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{role.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                  </div>
                </div>
                {!readOnly && assignedRoles.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveRole(role.value)}
                    disabled={isUpdating && updatingRole === role.value}
                  >
                    {isUpdating && updatingRole === role.value ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Circle className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Sin roles asignados</p>
              <p className="text-xs">Este usuario no tiene roles asignados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roles Disponibles */}
      {!readOnly && availableRoles.length > 0 && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Circle className="h-4 w-4 text-muted-foreground" />
              Roles Disponibles
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Roles que puedes asignar a este usuario
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableRoles.map((role) => (
              <div
                key={role.value}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border transition-all',
                  'border-border hover:border-muted-foreground/30 bg-background'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', role.color)} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{role.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleAssignRole(role.value)}
                  disabled={isUpdating && updatingRole === role.value}
                >
                  {isUpdating && updatingRole === role.value ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Asignar
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
