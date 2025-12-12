import * as React from 'react';
import { useCallback, useRef, memo, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Pencil, 
  X,
  Loader2,
  RotateCcw,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { DataTableComplete } from '@/components/ui/data-table-complete';
import { DataTableColumn, DataTableAction } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { 
  useOptimizedComponent,
  transitionClasses,
  animationClasses,
} from '@/hooks/optimizacion';
import { 
  UseBulkUploadReturn,
  BulkUploadRow,
  RowStatus,
  FieldConfig,
} from '@/hooks/controlador/useBulkUpload';

export interface BulkUploadEditFormProps {
  /** Datos de la fila a editar */
  rowData: Record<string, string>;
  /** Callback cuando se guardan los cambios */
  onSave: (data: Record<string, string>) => void;
  /** Callback para cancelar */
  onCancel: () => void;
  /** Indica si está en modo edición embebida */
  isEmbedded?: boolean;
}

export interface BulkUploadProps {
  /** Hook de carga masiva */
  bulkUpload: UseBulkUploadReturn;
  /** Ruta para volver */
  backPath: string;
  /** Icono para el header */
  icon: LucideIcon;
  /** Clase CSS adicional */
  className?: string;
  /** Componente de formulario personalizado para editar filas */
  renderEditForm?: (props: BulkUploadEditFormProps) => React.ReactNode;
}

// Componente de estadísticas
const StatsDisplay = memo(({ stats }: { stats: UseBulkUploadReturn['stats'] }) => {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <span className="font-medium text-foreground">
        {stats.total} {stats.total === 1 ? 'registro' : 'registros'} en el archivo
      </span>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          {stats.success} exitosos
        </span>
        <span className="flex items-center gap-1 text-destructive">
          <XCircle className="h-4 w-4" />
          {stats.error} errores
        </span>
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          {stats.warning} advertencias
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Info className="h-4 w-4" />
          {stats.pending} pendientes
        </span>
      </div>
    </div>
  );
});
StatsDisplay.displayName = 'StatsDisplay';

// Componente de badge de estado
const StatusBadge = memo(({ status }: { status: RowStatus }) => {
  const variants = {
    success: { label: 'Exitoso', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    error: { label: 'Error', className: 'bg-destructive/10 text-destructive' },
    warning: { label: 'Advertencia', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    pending: { label: 'Sin estado', className: 'bg-primary/10 text-primary' },
  };

  const variant = variants[status];

  return (
    <Badge variant="outline" className={cn('gap-1 font-normal', variant.className)}>
      {status === 'success' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'error' && <XCircle className="h-3 w-3" />}
      {status === 'warning' && <AlertTriangle className="h-3 w-3" />}
      {status === 'pending' && <CheckCircle2 className="h-3 w-3" />}
      {variant.label}
    </Badge>
  );
});
StatusBadge.displayName = 'StatusBadge';

// Modal de edición de fila
const EditRowDialog = memo(({
  row,
  fields,
  open,
  onOpenChange,
  onSave,
}: {
  row: BulkUploadRow | null;
  fields: FieldConfig[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rowNumber: number, data: Record<string, string>) => void;
}) => {
  const [editData, setEditData] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (row) {
      setEditData({ ...row.data });
    }
  }, [row]);

  const handleSave = () => {
    if (row) {
      onSave(row.rowNumber, editData);
      onOpenChange(false);
    }
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Fila {row.rowNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {fields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={field.key}
                value={editData[field.key] || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.label}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
EditRowDialog.displayName = 'EditRowDialog';

// Tipo para las filas de la tabla
interface TableRowData extends Record<string, unknown> {
  id: string;
  rowNumber: number;
  status: RowStatus;
  observations: string;
  originalRow: BulkUploadRow;
  [key: string]: unknown;
}

/**
 * Componente universal de carga masiva CSV
 */
export const BulkUpload = memo(function BulkUpload({
  bulkUpload,
  backPath,
  icon,
  className,
  renderEditForm,
}: BulkUploadProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingRow, setEditingRow] = useState<BulkUploadRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { config, stats, file, rows, isProcessing, isValidating } = bulkUpload;

  // Optimización del componente
  useOptimizedComponent(
    { entityType: config.entityType, stats },
    { componentName: 'BulkUpload' }
  );

  // Manejar selección de archivo
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      bulkUpload.selectFile(selectedFile);
    }
  }, [bulkUpload]);

  // Abrir selector de archivo
  const handleChooseFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Manejar edición de fila
  const handleEditRow = useCallback((row: BulkUploadRow) => {
    setEditingRow(row);
    setIsEditDialogOpen(true);
  }, []);

  // Guardar edición
  const handleSaveRow = useCallback((rowNumber: number, data: Record<string, string>) => {
    bulkUpload.updateRow(rowNumber, data);
    setEditingRow(null);
  }, [bulkUpload]);

  // Transformar filas para DataTable
  const tableData = useMemo((): TableRowData[] => {
    return rows.map(row => ({
      id: `row-${row.rowNumber}`,
      rowNumber: row.rowNumber,
      status: row.status,
      observations: row.observations.join(', ') || '-',
      originalRow: row,
      ...row.data,
    }));
  }, [rows]);

  // Columnas para DataTable
  const tableColumns = useMemo((): DataTableColumn<TableRowData>[] => {
    const baseColumns: DataTableColumn<TableRowData>[] = [
      {
        key: 'rowNumber',
        header: 'Fila',
        width: '60px',
        render: (value) => <span className="font-medium">{String(value)}</span>,
      },
    ];

    // Agregar columnas de campos dinámicos
    const fieldColumns: DataTableColumn<TableRowData>[] = config.fields.map(field => ({
      key: field.key,
      header: field.label,
      render: (value) => (
        <span className="max-w-[150px] truncate block">
          {value ? String(value) : '-'}
        </span>
      ),
    }));

    // Columnas de estado y observaciones
    const statusColumns: DataTableColumn<TableRowData>[] = [
      {
        key: 'status',
        header: 'Estado',
        width: '100px',
        render: (value) => <StatusBadge status={value as RowStatus} />,
      },
      {
        key: 'observations',
        header: 'Observaciones',
        render: (value) => (
          <span className="text-sm text-muted-foreground line-clamp-2 max-w-[200px]">
            {String(value)}
          </span>
        ),
      },
    ];

    return [...baseColumns, ...fieldColumns, ...statusColumns];
  }, [config.fields]);

  // Acciones por fila
  const getRowActions = useCallback((row: TableRowData): DataTableAction<TableRowData>[] => {
    const isDisabled = row.status === 'success';
    
    return [
      {
        label: 'Editar',
        icon: <Pencil className="h-4 w-4" />,
        onClick: (r) => {
          if (r.status !== 'success') {
            handleEditRow(r.originalRow);
          }
        },
      },
      {
        label: 'Eliminar',
        icon: <X className="h-4 w-4" />,
        variant: 'destructive',
        onClick: (r) => {
          if (r.status !== 'success') {
            bulkUpload.removeRow(r.rowNumber);
          }
        },
      },
    ];
  }, [handleEditRow, bulkUpload]);

  // Columnas para toolbar
  const toolbarColumns = useMemo(() => {
    return [
      { key: 'rowNumber', label: 'Fila', type: 'number' as const, searchable: false, sortable: true, filterable: false },
      ...config.fields.map(field => ({
        key: field.key,
        label: field.label,
        type: 'text' as const,
        searchable: true,
        sortable: true,
        filterable: true,
      })),
      { key: 'status', label: 'Estado', type: 'text' as const, searchable: false, sortable: true, filterable: true },
      { key: 'observations', label: 'Observaciones', type: 'text' as const, searchable: true, sortable: false, filterable: false },
    ];
  }, [config.fields]);

  // Campos obligatorios y opcionales
  const requiredFields = config.fields.filter(f => f.required);
  const optionalFields = config.fields.filter(f => !f.required);

  // Contenido derecho: botón descargar plantilla (azul)
  const rightContent = (
    <Button 
      size="sm"
      onClick={bulkUpload.downloadTemplate}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Descargar Plantilla</span>
    </Button>
  );

  return (
    <div className={cn('flex flex-col gap-6 p-4 md:p-6 w-full max-w-full', animationClasses.fadeIn, className)}>
      {/* Header usando EntityPageHeader */}
      <EntityPageHeader
        title={`Carga Masiva de ${config.entityLabelPlural}`}
        description={`Carga múltiples ${config.entityLabelPlural.toLowerCase()} desde un archivo CSV`}
        icon={icon}
        entityKey={config.entityType}
        showBack={true}
        onBackClick={() => navigate(backPath)}
        showCreate={false}
        showBulkUpload={false}
        rightContent={rightContent}
      />

      {/* Card de carga de archivo */}
      <Card className={cn(transitionClasses.normal)}>
        <CardContent className="pt-6 space-y-4">
          {/* Sección de carga de archivo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Upload className="h-4 w-4" />
              Cargar Archivo
            </div>
            
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={handleChooseFile}
                disabled={isValidating}
                className="gap-2"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Elegir archivo
              </Button>
              <span className="text-sm text-muted-foreground">
                {file ? file.name : 'No se ha seleccionado ningún archivo'}
              </span>
            </div>

            {/* Info del archivo cargado */}
            {file && rows.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <span className="text-muted-foreground">
                  {rows.length} filas
                </span>
              </div>
            )}
          </div>

          {/* Información de campos */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">
                  Campos obligatorios: {requiredFields.map(f => f.label).join(', ')}
                </p>
                {optionalFields.length > 0 && (
                  <p className="text-primary">
                    Campos opcionales: {optionalFields.map(f => f.label).join(', ')}
                  </p>
                )}
                <p className="text-muted-foreground italic">
                  Los campos vacíos se completarán automáticamente con valores por defecto
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de procesamiento (solo si hay filas) */}
      {rows.length > 0 && (
        <Card className={cn(transitionClasses.normal)}>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">
                  Procesar {config.entityLabelPlural}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={bulkUpload.reset}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reiniciar
                </Button>
                <Button 
                  onClick={bulkUpload.processRows}
                  disabled={isProcessing || stats.pending === 0}
                  className="gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Procesar
                </Button>
              </div>
            </div>
            <StatsDisplay stats={stats} />
          </CardHeader>
        </Card>
      )}

      {/* Tabla de resultados usando DataTableComplete */}
      {rows.length > 0 && (
        <Card className={cn(transitionClasses.normal)}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">Resultados</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTableComplete<TableRowData>
              data={tableData}
              columns={tableColumns}
              toolbarColumns={toolbarColumns}
              getActions={getRowActions}
              searchPlaceholder="Buscar registros..."
              exportFileName={`carga-masiva-${config.entityType}`}
              showToolbar={true}
              showPagination={true}
              defaultPageSize={10}
              pageSizeOptions={[5, 10, 20, 50]}
              selectable={false}
              emptyMessage="No se encontraron registros"
            />
          </CardContent>
        </Card>
      )}

      {/* Dialog de edición - usa formulario personalizado si está disponible */}
      {renderEditForm && editingRow ? (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            {renderEditForm({
              rowData: editingRow.data,
              onSave: (data) => {
                handleSaveRow(editingRow.rowNumber, data);
                setIsEditDialogOpen(false);
              },
              onCancel: () => setIsEditDialogOpen(false),
              isEmbedded: true,
            })}
          </DialogContent>
        </Dialog>
      ) : (
        <EditRowDialog
          row={editingRow}
          fields={config.fields}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleSaveRow}
        />
      )}
    </div>
  );
});
