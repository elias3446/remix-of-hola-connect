import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderTree, ToggleLeft, Trash2 } from 'lucide-react';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { CategoriasTable } from '@/components/table/CategoriasTable';
import { BulkActionsBar, BulkAction } from '@/components/ui/bulk-actions-bar';
import { BulkActionDialog, useBulkActionDialog, BulkActionItem } from '@/components/ui/bulk-action-dialog';
import { useBulkActions } from '@/hooks/controlador/useBulkActions';
import { useOptimizedCategories, Category } from '@/hooks/entidades/useOptimizedCategories';
import { toast } from 'sonner';

export default function Categorias() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Obtener datos de categorías
  const { data: categories } = useOptimizedCategories();
  
  // Hook de bulk actions
  const bulkActions = useBulkActions<Category>(categories, {
    tableName: 'categories',
    queryKey: 'categories',
    hasSoftDelete: true,
    statusColumn: 'activo',
    relatedQueryKeys: ['tipoReportes'],
  });

  // Hook del dialog
  const dialog = useBulkActionDialog();

  const handleCreate = () => {
    navigate('/categorias/nueva');
  };

  const handleBulkUpload = () => {
    navigate('/categorias/carga-masiva');
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    navigate(`/categorias/${category.id}/editar`);
  };

  // Manejar cambio de selección desde la tabla - sincronizar directamente
  const handleSelectionChange = (rows: Category[]) => {
    bulkActions.setSelectedItems(rows);
  };

  // Convertir items seleccionados para el dialog
  const dialogItems: BulkActionItem[] = useMemo(() => {
    return bulkActions.selectedItems.map(cat => ({
      id: cat.id,
      name: cat.nombre,
      subtitle: cat.descripcion || undefined,
      status: cat.activo ? 'Activo' : 'Inactivo',
      statusVariant: cat.activo ? 'success' : 'secondary' as const,
      icon: cat.icono || undefined,
    }));
  }, [bulkActions.selectedItems]);

  // Preparar acción de cambiar estado
  const handleOpenChangeStatus = () => {
    dialog.open({
      title: 'Cambiar Estado',
      description: `¿Deseas cambiar el estado de ${bulkActions.selectedCount} categoría(s)?`,
      items: dialogItems,
      variant: 'warning',
      confirmLabel: 'Cambiar Estado',
      options: [
        { id: 'activar', label: 'Activar', description: 'Las categorías estarán disponibles' },
        { id: 'desactivar', label: 'Desactivar', description: 'Las categorías no estarán disponibles' },
      ],
      onConfirm: async (selectedOption) => {
        const newStatus = selectedOption === 'activar';
        await bulkActions.bulkToggleStatus(newStatus);
        dialog.close();
      },
    });
  };

  // Preparar acción de eliminar
  const handleOpenDelete = () => {
    dialog.open({
      title: 'Eliminar Categorías',
      description: `¿Estás seguro de eliminar ${bulkActions.selectedCount} categoría(s)? Esta acción no se puede deshacer.`,
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
        title="Gestión de Categorías"
        description="Administra las categorías del sistema"
        icon={FolderTree}
        entityKey="categorias"
        createButtonText="Nueva Categoría"
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
        isProcessing={bulkActions.isProcessing}
      />

      <CategoriasTable 
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
      />
      </div>
    </div>
  );
}
