import { useMemo, useState, useCallback } from 'react';
import { Settings, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  useRolePermissions, 
  PERMISSION_LABELS, 
  PERMISSION_GROUPS 
} from '@/hooks/controlador/useRolePermissions';
import { useOptimizedUserRolesList } from '@/hooks/entidades/useOptimizedUserRolesList';
import { useOptimizedComponent, animationClasses } from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type UserPermission = Database['public']['Enums']['user_permission'];
type UserRole = Database['public']['Enums']['user_role'];

// Configuración de grupos de permisos con sus labels
const PERMISSION_GROUP_CONFIG: { key: keyof typeof PERMISSION_GROUPS; label: string }[] = [
  { key: 'reportes', label: 'Reportes' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'tiposReportes', label: 'Tipos de Reportes' },
];

interface UserPermissionsManagerProps {
  userId: string;
  className?: string;
  readOnly?: boolean;
}

export function UserPermissionsManager({ userId, className, readOnly = false }: UserPermissionsManagerProps) {
  const { data: userRolesList, refetch } = useOptimizedUserRolesList();
  const { getLockedPermissions } = useRolePermissions();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingPermission, setUpdatingPermission] = useState<UserPermission | null>(null);

  // Aplicar optimizaciones
  useOptimizedComponent({ userId }, { componentName: 'UserPermissionsManager' });

  // Obtener datos del usuario
  const userRoleData = useMemo(() => {
    return userRolesList.find(ur => ur.user_id === userId);
  }, [userRolesList, userId]);

  // Roles actuales del usuario
  const currentRoles = useMemo(() => {
    return (userRoleData?.roles || []) as UserRole[];
  }, [userRoleData]);

  // Permisos actuales del usuario
  const currentPermissions = useMemo(() => {
    return (userRoleData?.permisos || []) as UserPermission[];
  }, [userRoleData]);

  // ID del registro en user_roles
  const userRoleRecordId = useMemo(() => {
    return userRoleData?.id || null;
  }, [userRoleData]);

  // Permisos bloqueados (vienen de roles)
  const lockedPermissions = useMemo(() => {
    return getLockedPermissions(currentRoles);
  }, [currentRoles, getLockedPermissions]);

  // Verificar si un permiso está asignado
  const hasPermission = (permission: UserPermission): boolean => {
    return currentPermissions.includes(permission);
  };

  // Verificar si un permiso está bloqueado (viene de un rol)
  const isLocked = (permission: UserPermission): boolean => {
    return lockedPermissions.includes(permission);
  };

  // Actualizar permisos en la base de datos
  const updatePermissions = useCallback(async (newPermissions: UserPermission[]) => {
    if (!userRoleRecordId) {
      toast.error('No se encontró el registro de roles del usuario');
      return false;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          permisos: newPermissions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userRoleRecordId);

      if (error) throw error;

      await refetch();
      return true;
    } catch (error) {
      console.error('Error al actualizar permisos:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [userRoleRecordId, refetch]);

  // Manejar toggle de permiso
  const handleTogglePermission = useCallback(async (permission: UserPermission) => {
    if (readOnly || isUpdating || isLocked(permission)) return;

    setUpdatingPermission(permission);
    
    let newPermissions: UserPermission[];
    
    if (hasPermission(permission)) {
      // Remover permiso (solo si no está bloqueado)
      newPermissions = currentPermissions.filter(p => p !== permission);
    } else {
      // Agregar permiso
      newPermissions = [...currentPermissions, permission];
    }

    const success = await updatePermissions(newPermissions);
    
    if (success) {
      toast.success(
        hasPermission(permission) 
          ? `Permiso "${PERMISSION_LABELS[permission]}" removido`
          : `Permiso "${PERMISSION_LABELS[permission]}" asignado`
      );
    } else {
      toast.error('Error al actualizar el permiso');
    }

    setUpdatingPermission(null);
  }, [currentPermissions, updatePermissions, readOnly, isUpdating, isLocked, hasPermission]);

  // Desmarcar todos los permisos de un grupo (solo los no bloqueados)
  const handleUncheckGroup = useCallback(async (groupKey: keyof typeof PERMISSION_GROUPS) => {
    if (readOnly || isUpdating) return;

    const groupPermissions = PERMISSION_GROUPS[groupKey];
    const permissionsToRemove = groupPermissions.filter(p => !isLocked(p) && hasPermission(p));
    
    if (permissionsToRemove.length === 0) {
      toast.info('No hay permisos para desmarcar en este grupo');
      return;
    }

    const newPermissions = currentPermissions.filter(p => !permissionsToRemove.includes(p));
    
    const success = await updatePermissions(newPermissions);
    
    if (success) {
      toast.success(`Permisos de ${PERMISSION_GROUP_CONFIG.find(g => g.key === groupKey)?.label} desmarcados`);
    } else {
      toast.error('Error al actualizar permisos');
    }
  }, [currentPermissions, updatePermissions, readOnly, isUpdating, isLocked, hasPermission]);

  // Verificar si un grupo tiene permisos desmarcables
  const hasUncheckablePermissions = (groupKey: keyof typeof PERMISSION_GROUPS): boolean => {
    const groupPermissions = PERMISSION_GROUPS[groupKey];
    return groupPermissions.some(p => !isLocked(p) && hasPermission(p));
  };

  // Si no hay permisos y no hay roles
  if (currentPermissions.length === 0 && currentRoles.length === 0) {
    return (
      <Card className={cn('border border-border shadow-sm', animationClasses.fadeIn, className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Settings className="h-4 w-4 text-primary" />
            Permisos del Rol
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Permisos específicos asignados a este usuario
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin permisos asignados</p>
            <p className="text-sm">Asigne roles al usuario para activar permisos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border border-border shadow-sm', animationClasses.fadeIn, className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Settings className="h-4 w-4 text-primary" />
          Permisos del Rol
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Permisos específicos asignados a este usuario
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {PERMISSION_GROUP_CONFIG.map((group) => {
          const groupPermissions = PERMISSION_GROUPS[group.key];

          return (
            <div key={group.key} className="space-y-3">
              {/* Header del grupo */}
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-foreground">{group.label}</h4>
                {!readOnly && hasUncheckablePermissions(group.key) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => handleUncheckGroup(group.key)}
                    disabled={isUpdating}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Desmarcar todos
                  </Button>
                )}
              </div>

              {/* Grid de permisos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupPermissions.map((permission) => {
                  const isAssigned = hasPermission(permission);
                  const permissionLocked = isLocked(permission);
                  const isCurrentlyUpdating = isUpdating && updatingPermission === permission;

                  return (
                    <div
                      key={permission}
                      onClick={() => !permissionLocked && !readOnly && handleTogglePermission(permission)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-all',
                        isAssigned
                          ? 'bg-primary/5 border-primary/30'
                          : 'bg-muted/30 border-border',
                        permissionLocked 
                          ? 'cursor-not-allowed opacity-80' 
                          : !readOnly && 'cursor-pointer hover:border-primary/50'
                      )}
                    >
                      <div className="relative">
                        {isCurrentlyUpdating ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : (
                          <>
                            <Checkbox
                              checked={isAssigned}
                              disabled={permissionLocked || readOnly}
                              className={cn(
                                'h-5 w-5 pointer-events-none',
                                isAssigned && 'bg-primary border-primary data-[state=checked]:bg-primary'
                              )}
                            />
                            {permissionLocked && (
                              <Lock className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground" />
                            )}
                          </>
                        )}
                      </div>
                      <span className={cn(
                        'text-sm font-medium',
                        isAssigned ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {PERMISSION_LABELS[permission] || permission.replace(/_/g, ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Nota informativa */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
          <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Los permisos marcados con candado provienen de los roles asignados y no pueden ser modificados individualmente. 
            Para cambiar estos permisos, modifique los roles del usuario.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
