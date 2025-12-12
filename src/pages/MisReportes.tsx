import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ToggleLeft, Trash2, Layers, UserCheck, Tag, FileType } from 'lucide-react';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { ReportesTable } from '@/components/table/ReportesTable';
import { BulkActionsBar, BulkAction } from '@/components/ui/bulk-actions-bar';
import { BulkActionDialog, useBulkActionDialog, BulkActionItem } from '@/components/ui/bulk-action-dialog';
import { useBulkActions } from '@/hooks/controlador/useBulkActions';
import { useOptimizedReportes, ReporteWithDistance } from '@/hooks/entidades/useOptimizedReportes';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';
import { useOptimizedTipoReportes } from '@/hooks/entidades/useOptimizedTipoReportes';
import { useOptimizedUsers } from '@/hooks/entidades/useOptimizedUsers';
import { useOptimizedUserRolesList } from '@/hooks/entidades/useOptimizedUserRolesList';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_OPTIONS = [
  { id: 'pendiente', label: 'Pendiente', description: 'El reporte está pendiente de revisión' },
  { id: 'en_progreso', label: 'En Progreso', description: 'El reporte está siendo atendido' },
  { id: 'resuelto', label: 'Resuelto', description: 'El reporte ha sido resuelto' },
  { id: 'rechazado', label: 'Cerrado', description: 'El reporte ha sido cerrado' },
];

const ACTIVE_STATUS_OPTIONS = [
  { id: 'activar', label: 'Activar', description: 'Los reportes estarán visibles' },
  { id: 'desactivar', label: 'Desactivar', description: 'Los reportes no estarán visibles' },
];

export default function MisReportes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Obtener datos
  const { data: reportes = [] } = useOptimizedReportes();
  const { data: categories = [] } = useOptimizedCategories();
  const { data: tipoReportes = [] } = useOptimizedTipoReportes();
  const { data: users = [] } = useOptimizedUsers();
  const { data: allUserRoles = [] } = useOptimizedUserRolesList();

  // Hook de bulk actions
  const bulkActions = useBulkActions<ReporteWithDistance>(reportes, {
    tableName: 'reportes',
    queryKey: 'reportes-with-distance',
    hasSoftDelete: true,
    statusColumn: 'activo',
    assignColumn: 'assigned_to',
    categoryColumn: 'categoria_id',
    typeColumn: 'tipo_reporte_id',
    relatedQueryKeys: ['categories', 'tipoReportes'],
  });

  // Hook del dialog
  const dialog = useBulkActionDialog();

  // Categorías y tipos activos
  const activeCategories = useMemo(() => 
    categories.filter(cat => cat.activo && !cat.deleted_at), 
    [categories]
  );
  
  const activeTipoReportes = useMemo(() => 
    tipoReportes.filter(tipo => tipo.activo && !tipo.deleted_at), 
    [tipoReportes]
  );

  // Usuarios con permiso para ser asignados (editar_reporte)
  const assignableUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.deleted_at || user.estado !== 'activo') return false;
      const userRole = allUserRoles.find((role) => role.user_id === user.id);
      if (!userRole?.permisos) return false;
      return userRole.permisos.includes('editar_reporte');
    });
  }, [users, allUserRoles]);

  const handleCreate = () => {
    navigate('/crear-reporte');
  };

  const handleEdit = (reporte: ReporteWithDistance) => {
    navigate(`/reportes/${reporte.id}/editar`);
  };

  const handleView = (reporte: ReporteWithDistance) => {
    navigate(`/reportes/${reporte.id}`);
  };

  // Manejar cambio de selección desde la tabla
  const handleSelectionChange = useCallback((rows: ReporteWithDistance[]) => {
    if (rows.length === 0) {
      bulkActions.deselectAll();
    } else if (rows.length === reportes.length) {
      bulkActions.selectAll(reportes);
    } else {
      const currentIds = new Set(bulkActions.selectedIds);
      const newIds = new Set(rows.map(r => r.id));
      
      currentIds.forEach(id => {
        if (!newIds.has(id)) bulkActions.deselect(id);
      });
      
      rows.forEach(row => {
        if (!currentIds.has(row.id)) bulkActions.select(row.id);
      });
    }
  }, [bulkActions, reportes]);

  // Convertir items seleccionados para el dialog
  const dialogItems: BulkActionItem[] = useMemo(() => {
    return bulkActions.selectedItems.map(rep => ({
      id: rep.id,
      name: rep.nombre,
      subtitle: rep.descripcion || undefined,
      status: rep.activo ? 'Activo' : 'Inactivo',
      statusVariant: rep.activo ? 'success' : 'secondary' as const,
    }));
  }, [bulkActions.selectedItems]);

  // ============ ACCIONES BULK ============

  // 1. Cambiar Estado (Activar/Desactivar)
  const handleOpenChangeActiveStatus = () => {
    dialog.open({
      title: 'Cambiar Estado',
      description: `¿Deseas cambiar el estado de ${bulkActions.selectedCount} reporte(s)?`,
      items: dialogItems,
      variant: 'warning',
      confirmLabel: 'Cambiar Estado',
      options: ACTIVE_STATUS_OPTIONS,
      onConfirm: async (selectedOption) => {
        const newStatus = selectedOption === 'activar';
        await bulkActions.bulkToggleStatus(newStatus);
        dialog.close();
      },
    });
  };

  // 2. Estado Reporte (Pendiente, En Progreso, Resuelto, Cerrado)
  const handleOpenChangeReportStatus = () => {
    dialog.open({
      title: 'Cambiar Estado del Reporte',
      description: `Selecciona el nuevo estado para ${bulkActions.selectedCount} reporte(s)`,
      items: dialogItems,
      variant: 'warning',
      confirmLabel: 'Cambiar Estado',
      options: STATUS_OPTIONS,
      onConfirm: async (selectedOption) => {
        await bulkActions.bulkChangeStatus(selectedOption || 'pendiente');
        dialog.close();
      },
    });
  };

  // 3. Asignar usuario
  const handleOpenAssign = () => {
    const userOptions = [
      { id: '__unassign__', label: 'Sin asignar', description: 'Quitar asignación' },
      ...assignableUsers.map(user => ({
        id: user.id,
        label: user.name || user.email || 'Usuario',
        description: user.email || '',
      })),
    ];

    dialog.open({
      title: 'Asignar Reportes',
      description: `Selecciona a quién asignar ${bulkActions.selectedCount} reporte(s)`,
      items: dialogItems,
      variant: 'default',
      confirmLabel: 'Asignar',
      options: userOptions,
      onConfirm: async (selectedOption) => {
        const userId = selectedOption === '__unassign__' ? null : selectedOption;
        await bulkActions.bulkAssign(userId || null);
        dialog.close();
      },
    });
  };

  // 4. Cambiar Categoría
  const handleOpenChangeCategory = () => {
    const categoryOptions = activeCategories.map(cat => ({
      id: cat.id,
      label: cat.nombre,
      description: cat.descripcion || '',
    }));

    dialog.open({
      title: 'Cambiar Categoría',
      description: `Selecciona la nueva categoría para ${bulkActions.selectedCount} reporte(s)`,
      items: dialogItems,
      variant: 'default',
      confirmLabel: 'Cambiar Categoría',
      options: categoryOptions,
      onConfirm: async (selectedOption) => {
        if (selectedOption) {
          await bulkActions.bulkChangeCategory(selectedOption);
        }
        dialog.close();
      },
    });
  };

  // 5. Cambiar Tipo (actualiza también la categoría automáticamente)
  const handleOpenChangeType = () => {
    const typeOptions = activeTipoReportes.map(tipo => {
      const cat = categories.find(c => c.id === tipo.category_id);
      return {
        id: tipo.id,
        label: tipo.nombre,
        description: cat ? `Categoría: ${cat.nombre}` : '',
        categoryId: tipo.category_id,
      };
    });

    dialog.open({
      title: 'Cambiar Tipo de Reporte',
      description: `Selecciona el nuevo tipo para ${bulkActions.selectedCount} reporte(s). La categoría se actualizará automáticamente.`,
      items: dialogItems,
      variant: 'default',
      confirmLabel: 'Cambiar Tipo',
      options: typeOptions,
      onConfirm: async (selectedOption) => {
        if (selectedOption) {
          const selectedType = activeTipoReportes.find(t => t.id === selectedOption);
          if (selectedType) {
            try {
              const { error } = await supabase
                .from('reportes')
                .update({
                  tipo_reporte_id: selectedType.id,
                  categoria_id: selectedType.category_id,
                  updated_at: new Date().toISOString(),
                })
                .in('id', bulkActions.selectedIds);

              if (error) throw error;

              await queryClient.invalidateQueries({ queryKey: ['reportes-with-distance'] });
              bulkActions.deselectAll();
              toast.success(`${bulkActions.selectedCount} reporte(s) actualizado(s)`);
            } catch (error) {
              console.error('[MisReportes] Error al cambiar tipo:', error);
              toast.error('No se pudo cambiar el tipo');
            }
          }
        }
        dialog.close();
      },
    });
  };

  // 6. Eliminar
  const handleOpenDelete = () => {
    dialog.open({
      title: 'Eliminar Reportes',
      description: `¿Estás seguro de eliminar ${bulkActions.selectedCount} reporte(s)? Esta acción no se puede deshacer.`,
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
      id: 'change-active-status',
      label: 'Cambiar Estado',
      icon: <ToggleLeft className="h-4 w-4" />,
      onClick: handleOpenChangeActiveStatus,
      variant: 'outline',
    },
    {
      id: 'change-report-status',
      label: 'Estado Reporte',
      icon: <Layers className="h-4 w-4" />,
      onClick: handleOpenChangeReportStatus,
      variant: 'outline',
    },
    {
      id: 'assign',
      label: 'Asignar',
      icon: <UserCheck className="h-4 w-4" />,
      onClick: handleOpenAssign,
      variant: 'outline',
    },
    {
      id: 'change-category',
      label: 'Categoría',
      icon: <Tag className="h-4 w-4" />,
      onClick: handleOpenChangeCategory,
      variant: 'outline',
    },
    {
      id: 'change-type',
      label: 'Tipo',
      icon: <FileType className="h-4 w-4" />,
      onClick: handleOpenChangeType,
      variant: 'outline',
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
        title="Mis Reportes"
        description="Visualiza y gestiona tus reportes creados"
        icon={FileText}
        entityKey="mis-reportes"
        createButtonText="Nuevo Reporte"
        onCreateClick={handleCreate}
        showBulkUpload={false}
      />

      {/* Barra de acciones bulk */}
      <BulkActionsBar
        selectedCount={bulkActions.selectedCount}
        onClear={bulkActions.deselectAll}
        actions={actions}
        isProcessing={bulkActions.isProcessing}
      />

      <ReportesTable 
        onEdit={handleEdit}
        onView={handleView}
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
      />
      </div>
    </div>
  );
}
