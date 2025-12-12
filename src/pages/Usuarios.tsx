import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ToggleLeft, Trash2, Shield, Key, MailCheck } from 'lucide-react';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { UsuariosTable } from '@/components/table/UsuariosTable';
import { BulkActionsBar, BulkAction } from '@/components/ui/bulk-actions-bar';
import { BulkActionDialog, useBulkActionDialog, BulkActionItem, BulkActionOption } from '@/components/ui/bulk-action-dialog';
import { useBulkActions } from '@/hooks/controlador/useBulkActions';
import { useBulkResendConfirmation } from '@/hooks/controlador/useBulkResendConfirmation';
import { useRolePermissions, PERMISSION_LABELS } from '@/hooks/controlador/useRolePermissions';
import { useOptimizedUsers, User } from '@/hooks/entidades/useOptimizedUsers';
import { useOptimizedUserRolesList } from '@/hooks/entidades/useOptimizedUserRolesList';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];
type UserStatus = Database['public']['Enums']['user_status'];

// Configuración de estados de usuario
const USER_STATUS_OPTIONS: BulkActionOption[] = [
  { id: 'activo', label: 'Activo', description: 'El usuario puede acceder al sistema', variant: 'success' },
  { id: 'inactivo', label: 'Inactivo', description: 'El usuario no puede acceder temporalmente', variant: 'warning' },
  { id: 'bloqueado', label: 'Bloqueado', description: 'El usuario está bloqueado del sistema', variant: 'destructive' },
];

// Configuración de roles disponibles
const USER_ROLES_OPTIONS: BulkActionOption[] = [
  { id: 'super_admin', label: 'Super Administrador', description: 'Acceso completo al sistema' },
  { id: 'administrador', label: 'Administrador', description: 'Administración general del sistema' },
  { id: 'mantenimiento', label: 'Mantenimiento', description: 'Gestión de mantenimiento' },
  { id: 'operador_analista', label: 'Operador Analista', description: 'Operación y análisis' },
  { id: 'seguridad_uce', label: 'Seguridad UCE', description: 'Personal de seguridad' },
  { id: 'usuario_regular', label: 'Usuario Regular', description: 'Acceso básico al sistema' },
  { id: 'estudiante_personal', label: 'Estudiante/Personal', description: 'Estudiantes y personal' },
];

// Configuración de grupos de permisos
const PERMISSION_OPTIONS: BulkActionOption[] = [
  // Reportes
  { id: 'ver_reporte', label: 'Ver Reportes', description: 'Permite visualizar reportes' },
  { id: 'crear_reporte', label: 'Crear Reportes', description: 'Permite crear nuevos reportes' },
  { id: 'editar_reporte', label: 'Editar Reportes', description: 'Permite modificar reportes' },
  { id: 'eliminar_reporte', label: 'Eliminar Reportes', description: 'Permite eliminar reportes' },
  // Usuarios
  { id: 'ver_usuario', label: 'Ver Usuarios', description: 'Permite visualizar usuarios' },
  { id: 'crear_usuario', label: 'Crear Usuarios', description: 'Permite crear nuevos usuarios' },
  { id: 'editar_usuario', label: 'Editar Usuarios', description: 'Permite modificar usuarios' },
  { id: 'eliminar_usuario', label: 'Eliminar Usuarios', description: 'Permite eliminar usuarios' },
  // Categorías
  { id: 'ver_categoria', label: 'Ver Categorías', description: 'Permite visualizar categorías' },
  { id: 'crear_categoria', label: 'Crear Categorías', description: 'Permite crear categorías' },
  { id: 'editar_categoria', label: 'Editar Categorías', description: 'Permite modificar categorías' },
  { id: 'eliminar_categoria', label: 'Eliminar Categorías', description: 'Permite eliminar categorías' },
  // Tipos de Reportes
  { id: 'ver_estado', label: 'Ver Tipos de Reportes', description: 'Permite visualizar tipos' },
  { id: 'crear_estado', label: 'Crear Tipos de Reportes', description: 'Permite crear tipos' },
  { id: 'editar_estado', label: 'Editar Tipos de Reportes', description: 'Permite modificar tipos' },
  { id: 'eliminar_estado', label: 'Eliminar Tipos de Reportes', description: 'Permite eliminar tipos' },
];

export default function UsuariosPage() {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Obtener datos
  const { data: users, refetch: refetchUsers } = useOptimizedUsers();
  const { data: userRolesList, refetch: refetchRoles } = useOptimizedUserRolesList();
  const { getPermissionsForRole } = useRolePermissions();
  const { resendBulk, loading: resendingEmails } = useBulkResendConfirmation();
  
  // Hook de bulk actions para profiles
  const bulkActions = useBulkActions<User>(users, {
    tableName: 'profiles',
    queryKey: 'users',
    hasSoftDelete: true,
    statusColumn: 'estado',
    relatedQueryKeys: ['userRolesList'],
  });

  // Hook del dialog
  const dialog = useBulkActionDialog();

  // Estado para múltiples selecciones (roles y permisos)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const handleCreate = () => {
    navigate('/usuarios/nuevo', { state: { from: '/usuarios' } });
  };

  const handleBulkUpload = () => {
    navigate('/usuarios/carga-masiva');
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    navigate(`/usuarios/${user.id}/editar`, { state: { from: '/usuarios' } });
  };

  // Manejar cambio de selección desde la tabla - sincronizar directamente
  const handleSelectionChange = (rows: User[]) => {
    bulkActions.setSelectedItems(rows);
  };

  // Convertir items seleccionados para el dialog
  const dialogItems: BulkActionItem[] = useMemo(() => {
    return bulkActions.selectedItems.map(user => ({
      id: user.id,
      name: user.name || user.username || 'Usuario',
      subtitle: user.email || undefined,
      status: user.estado === 'activo' ? 'Activo' : user.estado === 'bloqueado' ? 'Bloqueado' : 'Inactivo',
      statusVariant: user.estado === 'activo' ? 'success' : user.estado === 'bloqueado' ? 'destructive' : 'secondary' as const,
      avatar: user.avatar || undefined,
    }));
  }, [bulkActions.selectedItems]);

  // ========== ACCIÓN: CAMBIAR ESTADO ==========
  const handleOpenChangeStatus = () => {
    dialog.open({
      title: 'Cambiar Estado',
      description: `¿Deseas cambiar el estado de ${bulkActions.selectedCount} usuario(s)?`,
      items: dialogItems,
      variant: 'warning',
      confirmLabel: 'Cambiar Estado',
      options: USER_STATUS_OPTIONS,
      onConfirm: async (selectedOption) => {
        if (!selectedOption) return;
        
        const newStatus = selectedOption as UserStatus;
        
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              estado: newStatus,
              updated_at: new Date().toISOString(),
            })
            .in('id', bulkActions.selectedIds);

          if (error) throw error;

          await refetchUsers();
          bulkActions.deselectAll();
          dialog.close();
          toast.success(`${bulkActions.selectedCount} usuario(s) actualizados a "${selectedOption}"`);
        } catch (error) {
          console.error('Error al cambiar estado:', error);
          toast.error('Error al cambiar el estado');
        }
      },
    });
  };

  // ========== ACCIÓN: CAMBIAR ROLES ==========
  const handleOpenChangeRoles = () => {
    setSelectedOptions([]);
    dialog.open({
      title: 'Agregar Roles',
      description: `Selecciona los roles a agregar a ${bulkActions.selectedCount} usuario(s). Los permisos asociados se agregarán automáticamente.`,
      items: dialogItems,
      variant: 'default',
      confirmLabel: 'Agregar Roles',
      options: USER_ROLES_OPTIONS,
      onConfirm: async (selectedOption) => {
        if (!selectedOption) return;
        
        const roleToAdd = selectedOption as UserRole;
        const rolePermissions = getPermissionsForRole(roleToAdd);
        
        try {
          // Procesar cada usuario seleccionado
          for (const userId of bulkActions.selectedIds) {
            const existingRoleData = userRolesList.find(ur => ur.user_id === userId);
            
            if (existingRoleData) {
              // Usuario ya tiene registro de roles
              const currentRoles = (existingRoleData.roles || []) as UserRole[];
              const currentPermissions = (existingRoleData.permisos || []) as UserPermission[];
              
              // Agregar rol si no existe
              const newRoles = currentRoles.includes(roleToAdd) 
                ? currentRoles 
                : [...currentRoles, roleToAdd];
              
              // Agregar permisos del rol
              const newPermissions = [...new Set([...currentPermissions, ...rolePermissions])];
              
              const { error } = await supabase
                .from('user_roles')
                .update({
                  roles: newRoles,
                  permisos: newPermissions,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingRoleData.id);

              if (error) throw error;
            } else {
              // Usuario no tiene registro, crear uno nuevo
              const { error } = await supabase
                .from('user_roles')
                .insert({
                  user_id: userId,
                  roles: [roleToAdd],
                  permisos: rolePermissions,
                });

              if (error) throw error;
            }
          }

          await Promise.all([refetchUsers(), refetchRoles()]);
          bulkActions.deselectAll();
          dialog.close();
          toast.success(`Rol "${USER_ROLES_OPTIONS.find(r => r.id === roleToAdd)?.label}" agregado a ${bulkActions.selectedCount} usuario(s)`);
        } catch (error) {
          console.error('Error al agregar roles:', error);
          toast.error('Error al agregar roles');
        }
      },
    });
  };

  // ========== ACCIÓN: AGREGAR PERMISOS ==========
  const handleOpenAddPermissions = () => {
    setSelectedOptions([]);
    dialog.open({
      title: 'Agregar Permisos',
      description: `Selecciona los permisos a agregar a ${bulkActions.selectedCount} usuario(s). Los permisos existentes y los de roles asignados se mantendrán.`,
      items: dialogItems,
      variant: 'default',
      confirmLabel: 'Agregar Permisos',
      options: PERMISSION_OPTIONS,
      onConfirm: async (selectedOption) => {
        if (!selectedOption) return;
        
        const permissionToAdd = selectedOption as UserPermission;
        
        try {
          // Procesar cada usuario seleccionado
          for (const userId of bulkActions.selectedIds) {
            const existingRoleData = userRolesList.find(ur => ur.user_id === userId);
            
            if (existingRoleData) {
              const currentPermissions = (existingRoleData.permisos || []) as UserPermission[];
              
              // Agregar permiso si no existe
              if (!currentPermissions.includes(permissionToAdd)) {
                const newPermissions = [...currentPermissions, permissionToAdd];
                
                const { error } = await supabase
                  .from('user_roles')
                  .update({
                    permisos: newPermissions,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingRoleData.id);

                if (error) throw error;
              }
            } else {
              // Usuario no tiene registro, crear uno nuevo solo con el permiso
              const { error } = await supabase
                .from('user_roles')
                .insert({
                  user_id: userId,
                  roles: [],
                  permisos: [permissionToAdd],
                });

              if (error) throw error;
            }
          }

          await Promise.all([refetchUsers(), refetchRoles()]);
          bulkActions.deselectAll();
          dialog.close();
          toast.success(`Permiso "${PERMISSION_LABELS[permissionToAdd]}" agregado a ${bulkActions.selectedCount} usuario(s)`);
        } catch (error) {
          console.error('Error al agregar permisos:', error);
          toast.error('Error al agregar permisos');
        }
      },
    });
  };

  // ========== ACCIÓN: REENVIAR CONFIRMACIÓN ==========
  const handleOpenResendConfirmation = () => {
    // Filtrar solo usuarios no confirmados con email
    const unconfirmedUsers = bulkActions.selectedItems.filter(u => !u.confirmed && u.email);
    
    if (unconfirmedUsers.length === 0) {
      toast.warning('No hay usuarios seleccionados pendientes de confirmación');
      return;
    }

    const unconfirmedItems: BulkActionItem[] = unconfirmedUsers.map(user => ({
      id: user.id,
      name: user.name || user.username || 'Usuario',
      subtitle: user.email || undefined,
      status: 'No confirmado',
      statusVariant: 'warning' as const,
      avatar: user.avatar || undefined,
    }));

    dialog.open({
      title: 'Reenviar Confirmación',
      description: `Se enviará email de confirmación a ${unconfirmedUsers.length} usuario(s) pendientes.`,
      items: unconfirmedItems,
      variant: 'default',
      confirmLabel: 'Enviar Emails',
      onConfirm: async () => {
        const emails = unconfirmedUsers
          .map(u => u.email)
          .filter((email): email is string => email !== null);
        
        await resendBulk(emails);
        bulkActions.deselectAll();
        dialog.close();
      },
    });
  };

  // ========== ACCIÓN: ELIMINAR ==========
  const handleOpenDelete = () => {
    dialog.open({
      title: 'Eliminar Usuarios',
      description: `¿Estás seguro de eliminar ${bulkActions.selectedCount} usuario(s)? Esta acción no se puede deshacer.`,
      items: dialogItems,
      variant: 'destructive',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        await bulkActions.bulkDelete();
        dialog.close();
      },
    });
  };

  // Acciones bulk disponibles
  const actions: BulkAction[] = [
    {
      id: 'change-status',
      label: 'Cambiar Estado',
      icon: <ToggleLeft className="h-4 w-4" />,
      onClick: handleOpenChangeStatus,
      variant: 'outline',
    },
    {
      id: 'change-roles',
      label: 'Agregar Rol',
      icon: <Shield className="h-4 w-4" />,
      onClick: handleOpenChangeRoles,
      variant: 'outline',
    },
    {
      id: 'add-permissions',
      label: 'Agregar Permiso',
      icon: <Key className="h-4 w-4" />,
      onClick: handleOpenAddPermissions,
      variant: 'outline',
    },
    {
      id: 'resend-confirmation',
      label: 'Reenviar Confirmación',
      icon: <MailCheck className="h-4 w-4" />,
      onClick: handleOpenResendConfirmation,
      variant: 'outline',
      disabled: resendingEmails,
    },
    {
      id: 'delete',
      label: 'Eliminar',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleOpenDelete,
      variant: 'destructive',
    },
  ];

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full">
      <EntityPageHeader
        title="Gestión de Usuarios"
        description="Administra los usuarios del sistema"
        icon={Users}
        entityKey="usuarios"
        createButtonText="Nuevo Usuario"
        onCreateClick={handleCreate}
        showBulkUpload={true}
        bulkUploadText="Carga Masiva"
        onBulkUploadClick={handleBulkUpload}
      />

      {/* Barra de acciones bulk */}
      <BulkActionsBar
        selectedCount={bulkActions.selectedCount}
        onClear={bulkActions.deselectAll}
        actions={actions}
        isProcessing={bulkActions.isProcessing || resendingEmails}
      />

      <UsuariosTable 
        onEdit={handleEdit}
        selectedRows={bulkActions.selectedItems}
        onSelectionChange={handleSelectionChange}
      />

      {/* Dialog de confirmación bulk */}
      <BulkActionDialog
        open={dialog.isOpen}
        onOpenChange={(open) => !open && dialog.close()}
        title={dialog.config?.title || ''}
        description={dialog.config?.description || ''}
        items={dialog.config?.items || []}
        confirmVariant={dialog.config?.variant}
        confirmLabel={dialog.config?.confirmLabel}
        cancelLabel={dialog.config?.cancelLabel}
        options={dialog.config?.options}
        selectedOption={dialog.selectedOption}
        onOptionChange={dialog.setSelectedOption}
        onConfirm={() => dialog.config?.onConfirm(dialog.selectedOption)}
        onCancel={dialog.close}
        entityLabel="usuarios"
      />
      </div>
    </div>
  );
}
