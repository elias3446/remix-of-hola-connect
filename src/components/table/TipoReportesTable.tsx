import { Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataTableColumn, DataTableAction } from '@/components/ui/data-table';
import { DataTableComplete } from '@/components/ui/data-table-complete';
import { useOptimizedTipoReportes, TipoReporte } from '@/hooks/entidades/useOptimizedTipoReportes';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';
import { useEntityPermissions } from '@/hooks/controlador/useEntityPermissions';
import { useConfirmation } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { transitionClasses } from '@/hooks/optimizacion';

interface TipoReportesTableProps {
  onEdit?: (tipoReporte: TipoReporte) => void;
  onDelete?: (tipoReporte: TipoReporte) => void;
  selectedRows?: TipoReporte[];
  onSelectionChange?: (rows: TipoReporte[]) => void;
}

export function TipoReportesTable({ 
  onEdit, 
  onDelete, 
  selectedRows = [], 
  onSelectionChange 
}: TipoReportesTableProps) {
  const navigate = useNavigate();
  const { data, isLoading, toggleStatus, remove } = useOptimizedTipoReportes();
  const { data: categories } = useOptimizedCategories();
  const { canEdit, canDelete, canToggleStatus } = useEntityPermissions({ entityKey: 'tipo-reportes' });
  const { confirm, ConfirmationDialog } = useConfirmation();

  const handleViewDetails = (tipoReporte: TipoReporte) => {
    navigate(`/tipo-reportes/${tipoReporte.id}`);
  };

  // Mapa de categorías para búsqueda rápida
  const categoryMap = new Map(categories.map(cat => [cat.id, cat.nombre]));

  const columns: DataTableColumn<TipoReporte>[] = [
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
      key: 'category_id',
      header: 'Categoría',
      render: (value) => (
        <span className="text-sm">
          {categoryMap.get(String(value)) || '—'}
        </span>
      ),
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
      key: 'activo' as keyof TipoReporte,
      header: 'Estado',
      type: 'status' as const,
    }] : []),
    {
      key: 'created_at',
      header: 'Fecha de Creación',
      type: 'date',
    },
  ];

  const handleStatusToggle = async (row: TipoReporte, newStatus: boolean) => {
    if (!canToggleStatus) {
      toast.error('No tienes permiso para cambiar el estado');
      return;
    }
    try {
      await toggleStatus(row.id, row.activo);
      toast.success(`Tipo de reporte ${newStatus ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error('Error al cambiar el estado');
    }
  };

  const handleDelete = async (row: TipoReporte) => {
    const confirmed = await confirm({
      title: '¿Eliminar tipo de reporte?',
      description: `Esta acción eliminará el tipo de reporte "${row.nombre}". Esta acción no se puede deshacer.`,
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
        toast.success('Tipo de reporte eliminado correctamente');
      } catch (error) {
        toast.error('Error al eliminar el tipo de reporte');
      }
    }
  };

  // Construir acciones según permisos
  const actions: DataTableAction<TipoReporte>[] = [];

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
        emptyMessage="No hay tipos de reportes registrados"
        getRowId={(row) => row.id}
        searchPlaceholder="Buscar tipos de reportes..."
        exportFileName="tipo-reportes"
        selectedRows={selectedRows}
        onSelectionChange={onSelectionChange}
      />
      {ConfirmationDialog}
    </>
  );
}