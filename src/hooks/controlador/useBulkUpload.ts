import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type EntityType = 'usuarios' | 'reportes' | 'categorias' | 'tipo-reportes';

export type RowStatus = 'pending' | 'success' | 'error' | 'warning';

export interface BulkUploadRow {
  rowNumber: number;
  data: Record<string, string>;
  status: RowStatus;
  observations: string[];
}

export interface FieldConfig {
  key: string;
  label: string;
  required: boolean;
  validate?: (value: string, row: Record<string, string>) => string | null;
}

export interface BulkUploadConfig {
  entityType: EntityType;
  entityLabel: string;
  entityLabelPlural: string;
  fields: FieldConfig[];
  templateFileName: string;
  queryKey: string;
  processRow: (row: Record<string, string>, rowNumber: number) => Promise<{ success: boolean; error?: string }>;
}

export interface BulkUploadStats {
  total: number;
  success: number;
  error: number;
  warning: number;
  pending: number;
}

export interface UseBulkUploadReturn {
  // Estado
  file: File | null;
  rows: BulkUploadRow[];
  isProcessing: boolean;
  isValidating: boolean;
  stats: BulkUploadStats;
  
  // Acciones de archivo
  selectFile: (file: File) => Promise<void>;
  clearFile: () => void;
  
  // Acciones de procesamiento
  validateRows: () => void;
  processRows: () => Promise<void>;
  reset: () => void;
  
  // Acciones de filas individuales
  updateRow: (rowNumber: number, data: Record<string, string>) => void;
  removeRow: (rowNumber: number) => void;
  
  // Plantilla
  downloadTemplate: () => void;
  
  // Configuración
  config: BulkUploadConfig;
}

export function useBulkUpload(config: BulkUploadConfig): UseBulkUploadReturn {
  const queryClient = useQueryClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<BulkUploadRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Calcular estadísticas
  const stats = useMemo((): BulkUploadStats => {
    return {
      total: rows.length,
      success: rows.filter(r => r.status === 'success').length,
      error: rows.filter(r => r.status === 'error').length,
      warning: rows.filter(r => r.status === 'warning').length,
      pending: rows.filter(r => r.status === 'pending').length,
    };
  }, [rows]);

  // Parsear CSV
  const parseCSV = useCallback((content: string): Record<string, string>[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Obtener headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Parsear filas
    const parsedRows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      parsedRows.push(row);
    }
    
    return parsedRows;
  }, []);

  // Validar una fila
  const validateRow = useCallback((data: Record<string, string>, rowNumber: number): { status: RowStatus; observations: string[] } => {
    const observations: string[] = [];
    let hasError = false;
    let hasWarning = false;

    for (const field of config.fields) {
      const value = data[field.key] || '';
      
      // Verificar campos requeridos
      if (field.required && !value.trim()) {
        observations.push(`Campo "${field.label}" es requerido`);
        hasError = true;
        continue;
      }
      
      // Validación personalizada
      if (field.validate && value.trim()) {
        const error = field.validate(value, data);
        if (error) {
          observations.push(error);
          hasWarning = true;
        }
      }
    }

    return {
      status: hasError ? 'error' : hasWarning ? 'warning' : 'pending',
      observations,
    };
  }, [config.fields]);

  // Seleccionar archivo
  const selectFile = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('El archivo debe ser de tipo CSV');
      return;
    }

    setIsValidating(true);
    setFile(selectedFile);

    try {
      const content = await selectedFile.text();
      const parsedRows = parseCSV(content);
      
      if (parsedRows.length === 0) {
        toast.error('El archivo no contiene datos válidos');
        setFile(null);
        setRows([]);
        return;
      }

      // Validar cada fila
      const validatedRows: BulkUploadRow[] = parsedRows.map((data, index) => {
        const { status, observations } = validateRow(data, index + 1);
        return {
          rowNumber: index + 1,
          data,
          status,
          observations,
        };
      });

      setRows(validatedRows);
      
      const errorCount = validatedRows.filter(r => r.status === 'error').length;
      if (errorCount > 0) {
        toast.warning(`Se encontraron ${errorCount} fila(s) con errores`);
      } else {
        toast.success(`${validatedRows.length} fila(s) cargadas correctamente`);
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Error al leer el archivo CSV');
      setFile(null);
      setRows([]);
    } finally {
      setIsValidating(false);
    }
  }, [parseCSV, validateRow]);

  // Limpiar archivo
  const clearFile = useCallback(() => {
    setFile(null);
    setRows([]);
  }, []);

  // Validar filas nuevamente
  const validateRows = useCallback(() => {
    setRows(prev => prev.map(row => {
      const { status, observations } = validateRow(row.data, row.rowNumber);
      return { ...row, status, observations };
    }));
  }, [validateRow]);

  // Procesar filas
  const processRows = useCallback(async () => {
    const pendingRows = rows.filter(r => r.status === 'pending' || r.status === 'warning');
    
    if (pendingRows.length === 0) {
      toast.warning('No hay filas pendientes para procesar');
      return;
    }

    setIsProcessing(true);

    try {
      for (const row of pendingRows) {
        try {
          const result = await config.processRow(row.data, row.rowNumber);
          
          setRows(prev => prev.map(r => {
            if (r.rowNumber === row.rowNumber) {
              return {
                ...r,
                status: result.success ? 'success' : 'error',
                observations: result.error ? [...r.observations, result.error] : r.observations,
              };
            }
            return r;
          }));
        } catch (error: any) {
          setRows(prev => prev.map(r => {
            if (r.rowNumber === row.rowNumber) {
              return {
                ...r,
                status: 'error',
                observations: [...r.observations, error.message || 'Error desconocido'],
              };
            }
            return r;
          }));
        }
      }

      // Invalidar queries
      await queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      
      toast.success('Procesamiento completado');
    } catch (error) {
      console.error('Error processing rows:', error);
      toast.error('Error durante el procesamiento');
    } finally {
      setIsProcessing(false);
    }
  }, [rows, config, queryClient]);

  // Resetear todo
  const reset = useCallback(() => {
    setFile(null);
    setRows([]);
    setIsProcessing(false);
    setIsValidating(false);
  }, []);

  // Actualizar una fila
  const updateRow = useCallback((rowNumber: number, data: Record<string, string>) => {
    setRows(prev => prev.map(row => {
      if (row.rowNumber === rowNumber) {
        const { status, observations } = validateRow(data, rowNumber);
        return { ...row, data, status, observations };
      }
      return row;
    }));
  }, [validateRow]);

  // Eliminar una fila
  const removeRow = useCallback((rowNumber: number) => {
    setRows(prev => {
      const filtered = prev.filter(r => r.rowNumber !== rowNumber);
      // Reindexar filas
      return filtered.map((row, index) => ({
        ...row,
        rowNumber: index + 1,
      }));
    });
  }, []);

  // Descargar plantilla
  const downloadTemplate = useCallback(() => {
    const headers = config.fields.map(f => f.key).join(',');
    const exampleRow = config.fields.map(f => {
      // Generar ejemplo basado en el campo
      if (f.key === 'email') return 'ejemplo@correo.com';
      if (f.key === 'nombre' || f.key === 'name') return 'Nombre Ejemplo';
      if (f.key === 'password' || f.key === 'contraseña') return 'Password123!';
      if (f.key === 'username') return 'usuario_ejemplo';
      if (f.key === 'roles') return 'usuario_regular';
      if (f.key === 'descripcion') return 'Descripción de ejemplo';
      if (f.key === 'color') return '#3B82F6';
      if (f.key === 'icono') return 'circle';
      if (f.key === 'categoria' || f.key === 'categoria_id') return 'nombre_categoria';
      return '';
    }).join(',');
    
    const csv = `${headers}\n${exampleRow}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = config.templateFileName;
    link.click();
    
    URL.revokeObjectURL(url);
    toast.success('Plantilla descargada');
  }, [config]);

  return {
    file,
    rows,
    isProcessing,
    isValidating,
    stats,
    selectFile,
    clearFile,
    validateRows,
    processRows,
    reset,
    updateRow,
    removeRow,
    downloadTemplate,
    config,
  };
}
