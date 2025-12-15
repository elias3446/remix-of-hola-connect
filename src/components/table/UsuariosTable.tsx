import { useEffect, useMemo, useCallback } from 'react';
import { Edit, Trash2, Mail, Lock, Unlock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataTableColumn, DataTableAction } from '@/components/ui/data-table';
import { DataTableComplete } from '@/components/ui/data-table-complete';
import { useOptimizedUsers, User } from '@/hooks/entidades/useOptimizedUsers';
import { useOptimizedUserRolesList, UserRoleList } from '@/hooks/entidades/useOptimizedUserRolesList';
import { useUpdateUser } from '@/hooks/users/useUpdateUser';
import { useEntityPermissions } from '@/hooks/controlador/useEntityPermissions';
import { useBulkResendConfirmation } from '@/hooks/controlador/useBulkResendConfirmation';
import { useConfirmation } from '@/components/ui/confirmation-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { transitionClasses } from '@/hooks/optimizacion';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';

// Tipo extendido con campo activo calculado
type UserWithActivo = User & { activo: boolean };

// Roles administrativos que requieren permisos especiales para ver
const ADMIN_ROLES = ['super_admin', 'administrador'];

interface UsuariosTableProps {
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onResendConfirmation?: (user: User) => void;
  onToggleBlock?: (user: User) => void;
  // Props para selección bulk
  selectedRows?: User[];
  onSelectionChange?: (rows: User[]) => void;
}

export function UsuariosTable({ 
  onEdit, 
  onDelete, 
  onResendConfirmation, 
  onToggleBlock,
  selectedRows = [],
  onSelectionChange,
}: UsuariosTableProps) {
  const navigate = useNavigate();
  const { data: currentProfile } = useOptimizedProfile();
  const { data, isLoading, remove, refetch } = useOptimizedUsers();
  const { data: userRoles, refetch: refetchRoles } = useOptimizedUserRolesList();
  const { updateUser, loading: updateLoading } = useUpdateUser();
  const { canEdit, canDelete, canToggleStatus } = useEntityPermissions({ entityKey: 'usuarios' });
  const { confirm, ConfirmationDialog } = useConfirmation();
  const { resendSingle } = useBulkResendConfirmation();

  const handleViewDetails = (user: User) => {
    navigate(`/usuarios/${user.id}`);
  };

  // Forzar recarga de roles si no hay datos
  useEffect(() => {
    if (userRoles.length === 0 && data.length > 0) {
      refetchRoles();
    }
  }, [userRoles.length, data.length, refetchRoles]);

  // Mapa de roles por usuario
  const userRolesMap = new Map<string, UserRoleList>(userRoles.map(ur => [ur.user_id, ur]));

  // Verificar si el usuario actual tiene rol admin
  const currentUserRoles = currentProfile?.id ? userRolesMap.get(currentProfile.id)?.roles || [] : [];
  const currentUserIsAdmin = currentUserRoles.some(role => ADMIN_ROLES.includes(role));

  // Filtrar usuarios: excluir al usuario actual y a admins si el usuario actual no es admin
  const filteredData = useMemo(() => {
    return data.filter(user => {
      // Excluir al usuario actual
      if (currentProfile?.id && user.id === currentProfile.id) return false;
      
      // Si el usuario actual NO es admin, excluir usuarios con roles admin
      if (!currentUserIsAdmin) {
        const targetUserRoles = userRolesMap.get(user.id)?.roles || [];
        const isTargetAdmin = targetUserRoles.some(role => ADMIN_ROLES.includes(role));
        if (isTargetAdmin) return false;
      }
      
      return true;
    });
  }, [data, currentProfile?.id, currentUserIsAdmin, userRolesMap]);

  // Transformar datos para agregar campo 'activo' calculado
  const dataWithActivo: UserWithActivo[] = useMemo(() => 
    filteredData.map(user => ({
      ...user,
      activo: user.estado === 'activo'
    })), [filteredData]);

  // Transformar selectedRows para que coincidan con UserWithActivo
  const selectedRowsWithActivo: UserWithActivo[] = useMemo(() => 
    selectedRows.map(user => ({
      ...user,
      activo: user.estado === 'activo'
    })), [selectedRows]);

  // Handler para cambio de selección interno
  const handleInternalSelectionChange = useCallback((rows: UserWithActivo[]) => {
    if (onSelectionChange) {
      // Convertir de vuelta a User (sin el campo activo agregado)
      const originalUsers = rows.map(row => data.find(u => u.id === row.id)).filter(Boolean) as User[];
      onSelectionChange(originalUsers);
    }
  }, [onSelectionChange, data]);

  // Handler para cambio de estado via Switch
  const handleStatusToggle = async (row: UserWithActivo, newStatus: boolean) => {
    if (!canToggleStatus) {
      toast.error('No tienes permiso para cambiar el estado');
      return;
    }
    const newEstado = newStatus ? 'activo' : 'inactivo';
    const { error } = await updateUser(row.id, { estado: newEstado });
    
    if (error) {
      toast.error('Error al actualizar el estado');
    } else {
      toast.success(`Usuario ${newStatus ? 'activado' : 'desactivado'}`);
      refetch();
    }
  };

  const columns: DataTableColumn<UserWithActivo>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      render: (value, row) => (
        <Avatar className="h-8 w-8">
          <AvatarImage src={String(value || '')} alt={row.name || 'Usuario'} />
          <AvatarFallback className="text-xs">
            {(row.name || row.username || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ),
    },
    {
      key: 'username',
      header: 'Usuario',
      render: (value, row) => (
        <div className="flex flex-col">
          <button
            onClick={() => {
              const originalUser = data.find(u => u.id === row.id);
              if (originalUser) handleViewDetails(originalUser);
            }}
            className={cn(
              "text-primary hover:text-primary/80 hover:underline font-medium text-left",
              transitionClasses.fast
            )}
          >
            {row.name || '—'}
          </button>
          <span className="text-sm text-muted-foreground">@{String(value || '—')}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      type: 'text',
    },
    {
      key: 'id',
      header: 'Roles',
      render: (value) => {
        const userRole = userRolesMap.get(String(value));
        if (!userRole || !userRole.roles || userRole.roles.length === 0) {
          return <span className="text-sm text-muted-foreground">Sin roles</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {userRole.roles.slice(0, 2).map((role, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs capitalize">
                {role.replace('_', ' ')}
              </Badge>
            ))}
            {userRole.roles.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{userRole.roles.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    // Solo mostrar columna de estado si tiene permiso de edición
    ...(canToggleStatus ? [{
      key: 'activo' as keyof UserWithActivo,
      header: 'Estado',
      render: (value: unknown, row: UserWithActivo) => {
        const isBlocked = row.estado === 'bloqueado';
        
        if (isBlocked) {
          return (
            <Badge 
              variant="outline" 
              className="bg-destructive/10 text-destructive border-destructive/20"
            >
              Bloqueado
            </Badge>
          );
        }
        
        const isActive = Boolean(value);
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              disabled={updateLoading}
              onCheckedChange={(checked) => handleStatusToggle(row, checked)}
              className={cn(
                transitionClasses.normal,
                isActive ? "data-[state=checked]:bg-green-500" : ""
              )}
            />
            <span className={cn(
              "text-sm font-medium",
              isActive ? "text-green-600" : "text-muted-foreground"
            )}>
              {isActive ? "Activo" : "Inactivo"}
            </span>
          </div>
        );
      },
    }] : []),
    {
      key: 'confirmed',
      header: 'Confirmado',
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Sí' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Fecha de Registro',
      type: 'date',
    },
  ];

  const handleDelete = async (row: UserWithActivo) => {
    const originalUser = data.find(u => u.id === row.id);
    if (!originalUser) return;

    const confirmed = await confirm({
      title: '¿Eliminar usuario?',
      description: `Esta acción eliminará al usuario "${originalUser.name || originalUser.username || originalUser.email}". Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'destructive',
    });

    if (!confirmed) return;

    if (onDelete) {
      onDelete(originalUser);
    } else {
      try {
        await remove(originalUser.id);
        toast.success('Usuario eliminado correctamente');
      } catch (error) {
        toast.error('Error al eliminar el usuario');
      }
    }
  };

  const getActions = (user: UserWithActivo): DataTableAction<UserWithActivo>[] => {
    const actions: DataTableAction<UserWithActivo>[] = [];
    
    // Solo mostrar Editar si tiene permiso
    if (canEdit) {
      actions.push({
        label: 'Editar',
        onClick: (row) => {
          const originalUser = data.find(u => u.id === row.id);
          if (originalUser) onEdit?.(originalUser);
        },
        icon: <Edit className="h-4 w-4" />,
      });
    }

    // Mostrar "Reenviar Confirmación" solo si no está confirmado y tiene permiso de editar
    if (canEdit && !user.confirmed) {
      actions.push({
        label: 'Reenviar Confirmación',
        onClick: async (row) => {
          if (row.email) {
            await resendSingle(row.email);
          } else {
            toast.error('El usuario no tiene email');
          }
        },
        icon: <Mail className="h-4 w-4" />,
      });
    }

    // Mostrar "Bloquear" o "Desbloquear" según estado si tiene permiso de editar
    if (canEdit) {
      const isBlocked = user.estado === 'bloqueado';
      actions.push({
        label: isBlocked ? 'Desbloquear' : 'Bloquear',
        onClick: async (row) => {
          const newEstado = isBlocked ? 'activo' : 'bloqueado';
          const { error } = await updateUser(row.id, { estado: newEstado });
          
          if (error) {
            toast.error(`Error al ${isBlocked ? 'desbloquear' : 'bloquear'} el usuario`);
          } else {
            toast.success(`Usuario ${isBlocked ? 'desbloqueado' : 'bloqueado'}`);
            refetch();
          }
        },
        icon: isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />,
      });
    }

    // Solo mostrar Eliminar si tiene permiso
    if (canDelete) {
      actions.push({
        label: 'Eliminar',
        onClick: handleDelete,
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'destructive',
      });
    }

    return actions;
  };

  return (
    <>
      <DataTableComplete
        data={dataWithActivo}
        columns={columns}
        getActions={getActions}
        isLoading={isLoading}
        emptyMessage="No hay usuarios registrados"
        getRowId={(row) => row.id}
        searchPlaceholder="Buscar usuarios..."
        exportFileName="usuarios"
        // Props para selección bulk
        selectable={!!onSelectionChange}
        selectedRows={selectedRowsWithActivo}
        onSelectionChange={handleInternalSelectionChange}
      />
      {ConfirmationDialog}
    </>
  );
}
