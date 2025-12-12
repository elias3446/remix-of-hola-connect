import * as React from "react";
import { MoreVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useOptimizedComponent,
  useAnimations,
  skeletonClasses,
  transitionClasses,
} from "@/hooks/optimizacion";

// Tipos de columna
export type ColumnType = "text" | "icon" | "color" | "status" | "date" | "custom";

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  type?: ColumnType;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableAction<T> {
  label: string;
  onClick: (row: T) => void;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  actions?: DataTableAction<T>[];
  getActions?: (row: T) => DataTableAction<T>[];
  isLoading?: boolean;
  skeletonRows?: number;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (selectedRows: T[]) => void;
  onStatusToggle?: (row: T, newStatus: boolean) => void;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
  className?: string;
}

// Componente Skeleton para la tabla
function TableSkeleton({ 
  columns, 
  rows = 5 
}: { 
  columns: number; 
  rows?: number;
}) {
  const { getStaggerClass } = useAnimations();
  
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow 
          key={rowIndex}
          className={cn(getStaggerClass(rowIndex, 50))}
        >
          {Array.from({ length: columns + 2 }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              {colIndex === 0 ? (
                <div className={cn(skeletonClasses.avatarSm, "w-5 h-5")} />
              ) : colIndex === columns + 1 ? (
                <div className={cn(skeletonClasses.button, "w-8 h-8")} />
              ) : (
                <div 
                  className={cn(
                    skeletonClasses.text,
                    colIndex === 1 ? "w-40" : "w-24"
                  )} 
                />
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// Renderizador de celda según tipo
function CellRenderer<T>({
  column,
  row,
  value,
  onStatusToggle,
}: {
  column: DataTableColumn<T>;
  row: T;
  value: unknown;
  onStatusToggle?: (row: T, newStatus: boolean) => void;
}) {
  const { type = "text", render } = column;

  // Custom render
  if (render) {
    return <>{render(value, row)}</>;
  }

  switch (type) {
    case "icon":
      return (
        <div className="flex items-center gap-2">
          {Array.isArray(value) ? (
            value.map((icon, i) => (
              <span key={i} className="text-lg">{icon}</span>
            ))
          ) : (
            <span className="text-lg">{String(value || "—")}</span>
          )}
        </div>
      );

    case "color":
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border border-border"
            style={{ backgroundColor: String(value || "transparent") }}
          />
          <span className="text-sm text-muted-foreground">
            {String(value || "—")}
          </span>
        </div>
      );

    case "status":
      const isActive = Boolean(value);
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => onStatusToggle?.(row, checked)}
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

    case "date":
      const dateValue = value ? new Date(String(value)) : null;
      return (
        <span className="text-sm text-muted-foreground">
          {dateValue ? dateValue.toLocaleDateString("es-EC", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }) : "—"}
        </span>
      );

    case "text":
    default:
      return (
        <span className="text-sm">
          {value !== null && value !== undefined ? String(value) : "—"}
        </span>
      );
  }
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  actions = [],
  getActions,
  isLoading = false,
  skeletonRows = 5,
  selectable = true,
  selectedRows = [],
  onSelectionChange,
  onStatusToggle,
  getRowId = (row) => String(row.id || Math.random()),
  emptyMessage = "No hay datos disponibles",
  className,
}: DataTableProps<T>) {
  // Optimización del componente
  useOptimizedComponent(
    { dataLength: data.length, isLoading },
    { componentName: "DataTable" }
  );

  const { getStaggerClass } = useAnimations();

  // Handlers de selección - para la página actual
  const pageRowIds = new Set(data.map(row => getRowId(row)));
  const selectedInPage = selectedRows.filter(row => pageRowIds.has(getRowId(row)));
  const isAllPageSelected = data.length > 0 && selectedInPage.length === data.length;
  const isPartiallySelected = selectedInPage.length > 0 && selectedInPage.length < data.length;

  const handleSelectAll = React.useCallback(() => {
    if (isAllPageSelected) {
      // Deseleccionar solo los de la página actual, mantener los de otras páginas
      const otherPageSelections = selectedRows.filter(row => !pageRowIds.has(getRowId(row)));
      onSelectionChange?.(otherPageSelections);
    } else {
      // Seleccionar todos de la página actual + mantener seleccionados de otras páginas
      const otherPageSelections = selectedRows.filter(row => !pageRowIds.has(getRowId(row)));
      onSelectionChange?.([...otherPageSelections, ...data]);
    }
  }, [data, isAllPageSelected, onSelectionChange, selectedRows, pageRowIds, getRowId]);

  const handleSelectRow = React.useCallback((row: T) => {
    const rowId = getRowId(row);
    const isSelected = selectedRows.some((r) => getRowId(r) === rowId);
    
    if (isSelected) {
      onSelectionChange?.(selectedRows.filter((r) => getRowId(r) !== rowId));
    } else {
      onSelectionChange?.([...selectedRows, row]);
    }
  }, [selectedRows, getRowId, onSelectionChange]);

  const isRowSelected = React.useCallback((row: T) => {
    const rowId = getRowId(row);
    return selectedRows.some((r) => getRowId(r) === rowId);
  }, [selectedRows, getRowId]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Loading overlay interno */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            <span className="text-xs sm:text-sm font-medium">Cargando...</span>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card w-full overflow-x-auto">
        <Table className="w-full min-w-[500px]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllPageSelected}
                    ref={(el) => {
                      if (el) {
                        (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isPartiallySelected;
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                    aria-label="Seleccionar todos"
                    className={transitionClasses.normal}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn("font-semibold text-foreground", column.className)}
                  style={{ width: column.width }}
                >
                  {column.header}
                </TableHead>
              ))}
              {(actions.length > 0 || getActions) && (
                <TableHead className="w-20 text-right">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading && data.length === 0 ? (
              <TableSkeleton columns={columns.length} rows={skeletonRows} />
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0) + ((actions.length > 0 || getActions) ? 1 : 0)}
                  className="h-32 text-center"
                >
                  <p className="text-muted-foreground">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => {
                const rowId = getRowId(row);
                const selected = isRowSelected(row);

                return (
                  <TableRow
                    key={rowId}
                    data-state={selected ? "selected" : undefined}
                    className={cn(
                      transitionClasses.normal,
                      getStaggerClass(index, 30),
                      selected && "bg-primary/5"
                    )}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => handleSelectRow(row)}
                          aria-label={`Seleccionar fila ${index + 1}`}
                          className={transitionClasses.normal}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const value = row[column.key as keyof T];
                      return (
                        <TableCell
                          key={String(column.key)}
                          className={column.className}
                        >
                          <CellRenderer
                            column={column}
                            row={row}
                            value={value}
                            onStatusToggle={onStatusToggle}
                          />
                        </TableCell>
                      );
                    })}
                    {(() => {
                      const rowActions = getActions ? getActions(row) : actions;
                      return rowActions.length > 0 ? (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8",
                                  transitionClasses.normal
                                )}
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Abrir menú</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {rowActions.map((action, actionIndex) => (
                                <DropdownMenuItem
                                  key={actionIndex}
                                  onClick={() => action.onClick(row)}
                                  className={cn(
                                    action.variant === "destructive" && "text-destructive focus:text-destructive"
                                  )}
                                >
                                  {action.icon && (
                                    <span className="mr-2">{action.icon}</span>
                                  )}
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null;
                    })()}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

DataTable.displayName = "DataTable";
