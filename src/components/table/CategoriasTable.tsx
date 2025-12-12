import { Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataTableColumn, DataTableAction } from '@/components/ui/data-table';
import { DataTableComplete } from '@/components/ui/data-table-complete';
import { useOptimizedCategories, Category } from '@/hooks/entidades/useOptimizedCategories';
import { useEntityPermissions } from '@/hooks/controlador/useEntityPermissions';
import { useConfirmation } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { transitionClasses } from '@/hooks/optimizacion';

interface CategoriasTableProps {
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  selectedRows?: Category[];
  onSelectionChange?: (rows: Category[]) => void;
}

export function CategoriasTable({ onEdit, onDelete, selectedRows = [], onSelectionChange }: CategoriasTableProps) {
  const navigate = useNavigate();
  const { data, isLoading, toggleStatus, remove } = useOptimizedCategories();
  const { canEdit, canDelete, canToggleStatus } = useEntityPermissions({ entityKey: 'categorias' });
  const { confirm, ConfirmationDialog } = useConfirmation();

  const handleViewDetails = (category: Category) => {
    navigate(`/categorias/${category.id}`);
  };

  const columns: DataTableColumn<Category>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (value, row) => (
        <button
          onClick={() => handleViewDetails(row)}
          className={cn(
            "text-primary hover:text-primary/80 hover:underline font-medium text-left",
            transitionClasses.fast
          )}
        >
          {String(value)}
        </button>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      type: 'text',
    },
    {
      key: 'icono',
      header: 'Icono',
      type: 'icon',
    },
    {
      key: 'color',
      header: 'Color',
      type: 'color',
    },
    // Solo mostrar columna de estado si tiene permiso de edición
    ...(canToggleStatus ? [{
      key: 'activo' as keyof Category,
      header: 'Estado',
      type: 'status' as const,
    }] : []),
    {
      key: 'created_at',
      header: 'Fecha de Creación',
      type: 'date',
    },
  ];

  const handleStatusToggle = async (row: Category, newStatus: boolean) => {
    if (!canToggleStatus) {
      toast.error('No tienes permiso para cambiar el estado');
      return;
    }
    try {
      await toggleStatus(row.id, row.activo);
      toast.success(`Categoría ${newStatus ? 'activada' : 'desactivada'}`);
    } catch (error) {
      toast.error('Error al cambiar el estado');
    }
  };

  const handleDelete = async (row: Category) => {
    const confirmed = await confirm({
      title: '¿Eliminar categoría?',
      description: `Esta acción eliminará la categoría "${row.nombre}". Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'destructive',
    });

    if (!confirmed) return;

    if (onDelete) {
      onDelete(row);
    } else {
      try {
        await remove(row.id);
        toast.success('Categoría eliminada correctamente');
      } catch (error) {
        toast.error('Error al eliminar la categoría');
      }
    }
  };

  // Construir acciones según permisos
  const actions: DataTableAction<Category>[] = [];

  if (canEdit) {
    actions.push({
      label: 'Editar',
      onClick: (row) => onEdit?.(row),
      icon: <Edit className="h-4 w-4" />,
    });
  }

  if (canDelete) {
    actions.push({
      label: 'Eliminar',
      onClick: handleDelete,
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
    });
  }

  return (
    <>
      <DataTableComplete
        data={data}
        columns={columns}
        actions={actions.length > 0 ? actions : undefined}
        isLoading={isLoading}
        onStatusToggle={canToggleStatus ? handleStatusToggle : undefined}
        emptyMessage="No hay categorías registradas"
        getRowId={(row) => row.id}
        searchPlaceholder="Buscar categorías..."
        exportFileName="categorias"
        selectedRows={selectedRows}
        onSelectionChange={onSelectionChange}
      />
      {ConfirmationDialog}
    </>
  );
}
