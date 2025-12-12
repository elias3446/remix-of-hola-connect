import { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { DataTable, DataTableColumn, DataTableAction, DataTableProps } from './data-table';
import { DataTableToolbar, DataTableFilters, DataTableColumn as ToolbarColumn } from './data-table-toolbar';
import { DataTablePagination } from './data-table-pagination';
import { cn } from '@/lib/utils';

export interface DataTableCompleteProps<T> extends Omit<DataTableProps<T>, 'data'> {
  data: T[];
  toolbarColumns?: ToolbarColumn[];
  searchPlaceholder?: string;
  exportFileName?: string;
  showToolbar?: boolean;
  showPagination?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

function DataTableCompleteComponent<T extends Record<string, unknown>>({
  data,
  columns,
  toolbarColumns,
  searchPlaceholder = 'Buscar...',
  exportFileName = 'export',
  showToolbar = true,
  showPagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  selectedRows = [],
  onSelectionChange,
  getRowId = (row) => String(row.id || Math.random()),
  ...tableProps
}: DataTableCompleteProps<T>) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  
  // Track if filter change is from user action vs data update
  const isFilterAction = useRef(false);
  
  // Track if "select all" mode is active (all filtered data, not just current page)
  const [selectAllMode, setSelectAllMode] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<DataTableFilters>({
    search: '',
    sortBy: '',
    sortOrder: 'asc',
    columnFilters: {},
    propertyFilters: {},
  });

  // Filtered data from toolbar
  const [filteredData, setFilteredData] = useState<T[]>(data);

  // Sync filteredData when source data changes (without resetting page)
  useEffect(() => {
    // Only update if data reference changed and not from a filter action
    if (!isFilterAction.current) {
      setFilteredData(data);
    }
    isFilterAction.current = false;
  }, [data]);
  
  // When selectAllMode is active, keep selection in sync with filtered data
  useEffect(() => {
    if (selectAllMode && onSelectionChange) {
      onSelectionChange([...filteredData]);
    }
  }, [selectAllMode, filteredData]);
  
  // Detect when user manually deselects items to exit selectAllMode
  useEffect(() => {
    if (selectAllMode && selectedRows.length < filteredData.length) {
      setSelectAllMode(false);
    }
  }, [selectedRows.length, filteredData.length, selectAllMode]);

  // Generate toolbar columns from table columns if not provided
  const effectiveToolbarColumns = useMemo((): ToolbarColumn[] => {
    if (toolbarColumns) return toolbarColumns;

    return columns.map((col) => ({
      key: String(col.key),
      label: col.header,
      type: col.type === 'date' ? 'date' : col.type === 'status' ? 'boolean' : 'text',
      searchable: true,
      sortable: true,
      filterable: true,
    }));
  }, [columns, toolbarColumns]);

  // Handle data filter from toolbar - only reset page on user filter actions
  const handleDataFilter = useCallback((filtered: T[]) => {
    isFilterAction.current = true;
    setFilteredData(filtered);
    // Only reset to page 1 if filters actually changed (search, sort, etc.)
    setCurrentPage(1);
  }, []);

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    if (!showPagination) return filteredData;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize, showPagination]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredData.length / pageSize));
  }, [filteredData.length, pageSize]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, []);
  
  // Handle select all filtered data
  const handleSelectAllFiltered = useCallback(() => {
    if (selectAllMode) {
      setSelectAllMode(false);
      onSelectionChange?.([]);
    } else {
      setSelectAllMode(true);
      onSelectionChange?.([...filteredData]);
    }
  }, [selectAllMode, filteredData, onSelectionChange]);
  
  // Calculate selection stats
  const selectedRowIds = new Set(selectedRows.map(row => getRowId(row)));
  const selectedInCurrentPage = paginatedData.filter(row => selectedRowIds.has(getRowId(row)));
  const isAllCurrentPageSelected = paginatedData.length > 0 && selectedInCurrentPage.length === paginatedData.length;
  const hasMultiplePages = totalPages > 1;
  // Mostrar banner siempre que haya elementos seleccionados
  const showSelectAllBanner = onSelectionChange && selectedRows.length > 0;

  return (
    <div className="space-y-4">
      {showToolbar && (
        <DataTableToolbar
          data={data}
          columns={effectiveToolbarColumns}
          filters={filters}
          onFiltersChange={setFilters}
          onDataFilter={handleDataFilter}
          searchPlaceholder={searchPlaceholder}
          exportFileName={exportFileName}
        />
      )}
      
      {/* Banner para seleccionar todos los elementos filtrados */}
      {showSelectAllBanner && (
        <div className={cn(
          "flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm",
          selectAllMode 
            ? "bg-primary/10 text-primary border border-primary/20" 
            : "bg-muted text-muted-foreground"
        )}>
          {selectAllMode ? (
            <>
              <span>Se han seleccionado los {filteredData.length} elementos.</span>
              <button 
                onClick={handleSelectAllFiltered}
                className="underline hover:text-primary/80 font-medium"
              >
                Borrar selección
              </button>
            </>
          ) : (
            <>
              <span>{selectedRows.length} de {filteredData.length} elementos seleccionados.</span>
              {hasMultiplePages && selectedRows.length < filteredData.length && (
                <button 
                  onClick={handleSelectAllFiltered}
                  className="underline hover:text-foreground font-medium"
                >
                  Seleccionar todos ({filteredData.length})
                </button>
              )}
              <button 
                onClick={() => onSelectionChange?.([])}
                className="underline hover:text-foreground font-medium ml-2"
              >
                Borrar selección
              </button>
            </>
          )}
        </div>
      )}

      <DataTable
        {...tableProps}
        data={paginatedData}
        columns={columns}
        selectedRows={selectedRows}
        onSelectionChange={onSelectionChange}
        getRowId={getRowId}
      />

      {showPagination && (
        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredData.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}

export const DataTableComplete = memo(DataTableCompleteComponent) as typeof DataTableCompleteComponent;
