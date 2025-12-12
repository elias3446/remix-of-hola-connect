import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { DataTableComplete } from '@/components/ui/data-table-complete';
import { DataTableColumn, DataTableAction } from '@/components/ui/data-table';
import { useOptimizedUserAudit, UserAudit } from '@/hooks/entidades/useOptimizedUserAudit';
import { AuditDetailsModal, AuditRecord } from '@/components/audit/AuditDetailsModal';
import { LogIn, LogOut, RefreshCw, Plus, Trash2, Eye, User, Clock, LucideIcon } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type OperationType = Database['public']['Enums']['operation_type'];

// Tipo para la fila de la tabla
type HistorialRecord = Record<string, unknown> & {
  id: string;
  action: OperationType;
  details: string | null;
  tabla_afectada: string | null;
  campos_modificados: string[] | null;
  created_at: string;
  user_id: string | null;
  registro_id?: string | null;
  valores_anteriores?: unknown;
  valores_nuevos?: unknown;
  metadata?: unknown;
  performed_by_profile?: {
    name: string | null;
    email: string | null;
  } | null;
  user_profile?: {
    name: string | null;
    email: string | null;
  } | null;
};

// Mapeo de tipos de operación a configuración visual
const operationConfig: Record<string, { 
  label: string; 
  icon: LucideIcon; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  login: {
    label: 'LOGIN',
    icon: LogIn,
    variant: 'default',
    className: 'bg-primary text-primary-foreground',
  },
  logout: {
    label: 'LOGOUT',
    icon: LogOut,
    variant: 'secondary',
    className: 'bg-secondary text-secondary-foreground',
  },
  update: {
    label: 'UPDATE',
    icon: RefreshCw,
    variant: 'outline',
    className: 'border-border text-foreground',
  },
  create: {
    label: 'INSERT',
    icon: Plus,
    variant: 'default',
    className: 'bg-emerald-600 text-white',
  },
  delete: {
    label: 'DELETE',
    icon: Trash2,
    variant: 'destructive',
    className: 'bg-destructive text-destructive-foreground',
  },
  soft_delete: {
    label: 'SOFT DELETE',
    icon: Trash2,
    variant: 'destructive',
    className: 'bg-destructive text-destructive-foreground',
  },
};

// Mapeo de descripciones según la operación
const getDescription = (action: string, tabla: string | null): string => {
  const tableLabel = tabla || 'sistema';
  const actionLower = action?.toLowerCase() || '';
  switch (actionLower) {
    case 'login':
      return 'Inicio de sesión en el sistema';
    case 'logout':
      return 'Cierre de sesión del sistema';
    case 'update':
      return `Registro modificado en ${tableLabel}`;
    case 'create':
      return `Registro creado en ${tableLabel}`;
    case 'delete':
    case 'soft_delete':
      return `Registro eliminado en ${tableLabel}`;
    default:
      return `${actionLower.toUpperCase()} en ${tableLabel}`;
  }
};

interface HistorialCambiosTableProps {
  /** Datos externos opcionales - si no se proveen, usa useOptimizedUserAudit */
  externalData?: UserAudit[];
  /** Loading externo */
  isExternalLoading?: boolean;
}

export function HistorialCambiosTable({ externalData, isExternalLoading }: HistorialCambiosTableProps = {}) {
  const { data: internalData, isLoading: internalLoading } = useOptimizedUserAudit();
  
  // Usar datos externos si se proveen, sino usar los internos
  const data = externalData ?? internalData;
  const isLoading = externalData !== undefined ? (isExternalLoading ?? false) : internalLoading;
  
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = useCallback((record: HistorialRecord) => {
    setSelectedRecord(record as AuditRecord);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback((open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedRecord(null);
    }
  }, []);

  const columns: DataTableColumn<HistorialRecord>[] = [
    {
      key: 'action',
      header: 'Acción',
      type: 'custom',
      render: (_value: unknown, row: HistorialRecord) => {
        if (!row) return <span className="text-muted-foreground">-</span>;
        const actionKey = row.action?.toLowerCase() || 'update';
        const config = operationConfig[actionKey] || operationConfig.update;
        const Icon = config.icon;
        return (
          <Badge variant={config.variant} className={`gap-1.5 ${config.className}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'details',
      header: 'Descripción',
      type: 'custom',
      render: (_value: unknown, row: HistorialRecord) => {
        if (!row) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="text-foreground">
            {row.details || getDescription(row.action, row.tabla_afectada)}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Fecha y Hora',
      type: 'custom',
      render: (_value: unknown, row: HistorialRecord) => {
        if (!row) return <span className="text-muted-foreground">-</span>;
        const date = row.created_at ? new Date(row.created_at) : null;
        const isValidDate = date && !isNaN(date.getTime());
        
        if (!isValidDate) {
          return <span className="text-muted-foreground">-</span>;
        }
        
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">
                {format(date, 'dd/MM/yyyy', { locale: es })}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(date, 'HH:mm:ss', { locale: es })}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'tabla_afectada',
      header: 'Tabla',
      type: 'custom',
      render: (_value: unknown, row: HistorialRecord) => {
        if (!row) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge variant="secondary" className="font-mono text-xs">
            {row.tabla_afectada || 'sistema'}
          </Badge>
        );
      },
    },
    {
      key: 'campos_modificados',
      header: 'Campos Modificados',
      type: 'custom',
      render: (_value: unknown, row: HistorialRecord) => {
        if (!row) return <span className="text-muted-foreground">-</span>;
        const campos = row.campos_modificados;
        if (!campos || campos.length === 0) {
          return <span className="text-muted-foreground italic">Sin campos</span>;
        }
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {campos.slice(0, 3).map((campo, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {campo}
              </Badge>
            ))}
            {campos.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{campos.length - 3} más
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'user_id',
      header: 'Realizado por',
      type: 'custom',
      render: (_value: unknown, row: HistorialRecord) => {
        if (!row) return <span className="text-muted-foreground">-</span>;
        // Primero intentamos con user_profile, luego performed_by_profile
        const profile = row.user_profile || row.performed_by_profile;
        const displayName = profile?.email || profile?.name || 'Usuario desconocido';
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground truncate max-w-[150px]" title={displayName}>
              {displayName}
            </span>
          </div>
        );
      },
    },
  ];

  // Convertir data a HistorialRecord[]
  const tableData: HistorialRecord[] = (data as UserAudit[]).map((item) => ({
    ...item,
    id: item.id,
    action: item.action,
    details: item.details,
    tabla_afectada: item.tabla_afectada,
    campos_modificados: item.campos_modificados,
    created_at: item.created_at,
    user_id: item.user_id,
    registro_id: item.registro_id,
    valores_anteriores: item.valores_anteriores,
    valores_nuevos: item.valores_nuevos,
    metadata: item.metadata,
    performed_by_profile: item.performed_by_profile,
    user_profile: item.user_profile,
  }));

  const actions: DataTableAction<HistorialRecord>[] = [
    {
      label: 'Ver detalles',
      onClick: handleViewDetails,
      icon: <Eye className="h-4 w-4" />,
    },
  ];

  return (
    <>
      <DataTableComplete<HistorialRecord>
        data={tableData}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        emptyMessage="No hay cambios registrados"
        getRowId={(row) => row.id}
        searchPlaceholder="Buscar en historial..."
        exportFileName="historial_cambios"
        selectable={false}
      />
      
      <AuditDetailsModal
        record={selectedRecord}
        open={isModalOpen}
        onOpenChange={handleCloseModal}
      />
    </>
  );
}
