import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  Clock, 
  Mail,
  Shield,
  ClipboardList,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Edit,
  Lock,
  MailCheck,
  Key,
  FileText,
  History,
  Activity
} from 'lucide-react';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { 
  EntityDetailsPanel, 
  EntityInfoItem,
  EntitySwitchAction,
  EntityActionButton
} from '@/components/ui/entity-details-panel';
import { EntityListCard, EntityListItem } from '@/components/ui/entity-list-card';
import { AuditPanel, ActivityDashboard } from '@/components/audit';
import { UserRolesManager, UserPermissionsManager } from '@/components/users';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOptimizedUserRolesList } from '@/hooks/entidades/useOptimizedUserRolesList';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { useEntityPermissions } from '@/hooks/controlador/useEntityPermissions';
import { useUpdateUser } from '@/hooks/users/useUpdateUser';
import { useBulkResendConfirmation } from '@/hooks/controlador/useBulkResendConfirmation';
import type { User as UserType } from '@/hooks/entidades/useOptimizedUsers';
import { cn } from '@/lib/utils';
import { animationClasses } from '@/hooks/optimizacion';
import { toast } from 'sonner';

interface UserDetailsProps {
  user: UserType;
}

export function UserDetails({ user }: UserDetailsProps) {
  const navigate = useNavigate();
  const { data: userRoles } = useOptimizedUserRolesList();
  const { data: reportes } = useOptimizedReportes();
  const { canEdit } = useEntityPermissions({ entityKey: 'usuarios' });
  const { updateUser, loading: updatingUser } = useUpdateUser();
  const { resendSingle, loading: resendingEmail } = useBulkResendConfirmation();
  
  const [isActive, setIsActive] = useState(user.estado === 'activo');
  
  // Sincronizar estado local cuando cambia el usuario
  useEffect(() => {
    setIsActive(user.estado === 'activo');
  }, [user.estado]);

  const userRole = useMemo(() => {
    return userRoles.find(ur => ur.user_id === user.id) || null;
  }, [userRoles, user.id]);

  const assignedReportes = useMemo(() => {
    return reportes.filter(r => r.assigned_to === user.id);
  }, [reportes, user.id]);

  // Convertir reportes a EntityListItem
  const reportesListItems: EntityListItem[] = useMemo(() => {
    return assignedReportes.map(r => ({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      status: r.status,
      priority: r.priority,
      created_at: r.created_at,
    }));
  }, [assignedReportes]);

  const detailsData = useMemo(() => {
    const createdDate = new Date(user.created_at);
    const updatedDate = new Date(user.updated_at);

    const infoItems: EntityInfoItem[] = [
      {
        icon: Mail,
        label: 'Email',
        value: user.email || '—',
      },
      {
        icon: Calendar,
        label: 'Registrado',
        value: format(createdDate, "dd/MM/yyyy", { locale: es }),
      },
      {
        icon: Clock,
        label: 'Actualizado',
        value: format(updatedDate, "dd/MM/yyyy", { locale: es }),
      },
      {
        icon: user.confirmed ? CheckCircle : XCircle,
        label: 'Estado de confirmación',
        value: user.confirmed ? 'Email confirmado' : 'Email no confirmado',
        variant: user.confirmed ? 'success' : 'warning',
      },
    ];

    return {
      infoItems,
      headerBadges: userRole?.roles?.map(role => ({
        label: role.replace('_', ' '),
        variant: 'secondary' as const,
        className: 'capitalize',
      })) || [],
    };
  }, [user, userRole]);

  // Manejador para cambio de estado activo/inactivo
  const handleStatusChange = async (checked: boolean) => {
    const newStatus = checked ? 'activo' : 'inactivo';
    setIsActive(checked);
    
    const { error } = await updateUser(user.id, { estado: newStatus });
    if (error) {
      setIsActive(!checked); // Revertir si hay error
      toast.error(`Error al ${checked ? 'activar' : 'desactivar'} usuario`);
    } else {
      toast.success(`Usuario ${checked ? 'activado' : 'desactivado'} correctamente`);
    }
  };

  // Manejador para bloquear usuario
  const handleBlockUser = async () => {
    const { error } = await updateUser(user.id, { estado: 'bloqueado' });
    if (error) {
      toast.error('Error al bloquear usuario');
    } else {
      setIsActive(false);
      toast.success('Usuario bloqueado correctamente');
    }
  };

  // Manejador para reenviar confirmación
  const handleResendConfirmation = async () => {
    if (!user.email) {
      toast.error('El usuario no tiene email registrado');
      return;
    }
    await resendSingle(user.email);
  };

  // Switch actions para estado del usuario
  const switchActions: EntitySwitchAction[] = [
    {
      label: isActive ? 'Activo' : 'Inactivo',
      description: 'Estado del Usuario',
      checked: isActive,
      onCheckedChange: handleStatusChange,
      indicatorColor: isActive ? 'green' : 'red',
      disabled: updatingUser,
    },
  ];

  // Action buttons
  const actionButtons: EntityActionButton[] = (() => {
    const buttons: EntityActionButton[] = [
      {
        label: updatingUser ? 'Bloqueando...' : 'Bloquear Usuario',
        icon: Lock,
        variant: 'destructive',
        onClick: handleBlockUser,
        className: 'w-full',
        disabled: updatingUser || user.estado === 'bloqueado',
      },
    ];

    // Solo mostrar botón de reenviar si email no está confirmado
    if (!user.confirmed) {
      buttons.push({
        label: resendingEmail ? 'Enviando...' : 'Reenviar Confirmación',
        icon: MailCheck,
        variant: 'outline',
        onClick: handleResendConfirmation,
        className: 'w-full',
        disabled: resendingEmail || !user.email,
      });
    }

    return buttons;
  })();

  const tabs = [
    {
      value: 'reportes',
      label: 'Reportes',
      icon: ClipboardList,
      badge: assignedReportes.length,
      content: (
        <EntityListCard
          title={`Reportes Asignados (${assignedReportes.length})`}
          subtitle={`Reportes actualmente asignados a ${user.name || user.username}`}
          items={reportesListItems}
          detailRoute="/reportes"
          emptyMessage="Sin reportes asignados"
          emptySubMessage="Este usuario no tiene reportes asignados"
          icon={<ClipboardList className="h-5 w-5 text-muted-foreground" />}
          showBadges={true}
        />
      ),
    },
    {
      value: 'roles',
      label: 'Roles',
      icon: Shield,
      content: (
        <UserRolesManager 
          userId={user.id} 
          readOnly={!canEdit}
        />
      ),
    },
    {
      value: 'permisos',
      label: 'Permisos',
      icon: Key,
      content: (
        <UserPermissionsManager userId={user.id} />
      ),
    },
    {
      value: 'auditoria',
      label: 'Auditoría',
      icon: FileText,
      content: (
        <AuditPanel 
          searchByUserId={user.id} 
          title="Auditoría del Usuario"
          description={`Actividades realizadas por ${user.name || user.username}`}
          className="p-0" 
        />
      ),
    },
    {
      value: 'cambios',
      label: 'Cambios',
      icon: History,
      content: (
        <AuditPanel 
          searchByRegistroId={user.id} 
          title="Historial de Cambios"
          description={`Modificaciones realizadas sobre ${user.name || user.username}`}
          className="p-0" 
        />
      ),
    },
    {
      value: 'actividad',
      label: 'Actividad',
      icon: Activity,
      content: (
        <ActivityDashboard
          entityId={user.id}
          filterType="user_id"
          email={user.email || undefined}
          entityName={user.name || user.username || undefined}
          createdAt={user.created_at}
        />
      ),
    },
  ];

  return (
    <div className={cn("space-y-6 p-4 md:p-6", animationClasses.fadeIn)}>
      <EntityPageHeader
        title={user.name || user.username || 'Usuario'}
        description="Detalles del usuario"
        icon={User}
        entityKey="usuarios"
        showCreate={false}
        showBulkUpload={false}
        rightContent={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/usuarios')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => navigate(`/usuarios/${user.id}/editar`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        }
      />

      <EntityDetailsPanel
        title={user.name || user.username || 'Usuario'}
        subtitle={user.username ? `@${user.username}` : user.email || undefined}
        avatar={{
          src: user.avatar || undefined,
          fallback: (user.name || user.username || 'U').substring(0, 2).toUpperCase(),
        }}
        headerBadges={detailsData.headerBadges}
        infoItems={detailsData.infoItems}
        switchActions={switchActions}
        actionButtons={actionButtons}
        secondaryInfo={!user.confirmed ? [{
          icon: AlertCircle,
          label: 'Email no confirmado',
          value: 'Pendiente de verificación',
          variant: 'warning',
        }] : undefined}
        tabs={tabs}
        defaultTab="reportes"
      />
    </div>
  );
}