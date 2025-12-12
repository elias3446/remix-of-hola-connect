import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { DataTableComplete } from '@/components/ui/data-table-complete';
import { DataTableColumn } from '@/components/ui/data-table';
import { useOptimizedUserAudit, UserAudit } from '@/hooks/entidades/useOptimizedUserAudit';
import { LogIn, LogOut, RefreshCw, Plus, Trash2, Eye, User, LucideIcon } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type OperationType = Database['public']['Enums']['operation_type'];

// Tipo para la fila de la tabla
type AuditRecord = Record<string, unknown> & {
  id: string;
  action: OperationType;
  details: string | null;
  tabla_afectada: string | null;
  created_at: string;
  user_id: string | null;
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
    label: 'INICIO DE SESIÓN',
    icon: LogIn,
    variant: 'default',
    className: 'bg-primary text-primary-foreground',
  },
  logout: {
    label: 'CIERRE DE SESIÓN',
    icon: LogOut,
    variant: 'secondary',
    className: 'bg-secondary text-secondary-foreground',
  },
  update: {
    label: 'ACTUALIZAR',
    icon: RefreshCw,
    variant: 'outline',
    className: 'border-border text-foreground',
  },
  create: {
    label: 'CREAR',
    icon: Plus,
    variant: 'default',
    className: 'bg-emerald-600 text-white',
  },
  delete: {
    label: 'ELIMINAR',
    icon: Trash2,
    variant: 'destructive',
    className: 'bg-destructive text-destructive-foreground',
  },
  soft_delete: {
    label: 'ELIMINAR',
    icon: Trash2,
    variant: 'destructive',
    className: 'bg-destructive text-destructive-foreground',
  },
  read: {
    label: 'CONSULTAR',
    icon: Eye,
    variant: 'secondary',
    className: 'bg-secondary text-secondary-foreground',
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
    case 'read':
      return `Consulta realizada en ${tableLabel}`;
    default:
      return `${actionLower.toUpperCase()} en ${tableLabel}`;
  }
};

interface ActividadesTableProps {
  /** Datos externos opcionales - si no se proveen, usa useOptimizedUserAudit */
  externalData?: UserAudit[];
  /** Loading externo */
  isExternalLoading?: boolean;
}

export function ActividadesTable({ externalData, isExternalLoading }: ActividadesTableProps = {}) {
  const { data: internalData, isLoading: internalLoading } = useOptimizedUserAudit();
  
  // Usar datos externos si se proveen, sino usar los internos
  const data = externalData ?? internalData;
  const isLoading = externalData !== undefined ? (isExternalLoading ?? false) : internalLoading;

  const columns: DataTableColumn<AuditRecord>[] = [
    {
      key: 'action',
      header: 'Tipo',
      type: 'custom',
      render: (_value: unknown, row: AuditRecord) => {
        if (!row) return <span className="text-muted-foreground">-</span>;
        const actionKey = row.action?.toLowerCase() || 'read';
        const config = operationConfig[actionKey] || operationConfig.read;
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
      render: (_value: unknown, row: AuditRecord) => {
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
      render: (_value: unknown, row: AuditRecord) => {
        if (!row) return <span className="text-muted-foreground">-</span>;
        const date = row.created_at ? new Date(row.created_at) : null;
        const isValidDate = date && !isNaN(date.getTime());
        
        if (!isValidDate) {
          return <span className="text-muted-foreground">-</span>;
        }
        
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {format(date, 'dd/MM/yyyy', { locale: es })}
            </span>
            <span className="text-muted-foreground">
              {format(date, 'HH:mm:ss', { locale: es })}
            </span>
          </div>
        );
      },
    },
    {
      key: 'tabla_afectada',
      header: 'Tabla',
      type: 'custom',
      render: (_value: unknown, row: AuditRecord) => {
        if (!row) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge variant="secondary" className="font-mono text-xs">
            {row.tabla_afectada || 'sistema'}
          </Badge>
        );
      },
    },
    {
      key: 'user_id',
      header: 'Realizado por',
      type: 'custom',
      render: (_value: unknown, row: AuditRecord) => {
        if (!row) return <span className="text-muted-foreground">-</span>;
        const profile = row.user_profile;
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

  // Convertir data a AuditRecord[]
  const tableData: AuditRecord[] = data.map((item) => ({
    ...item,
    id: item.id,
    action: item.action,
    details: item.details,
    tabla_afectada: item.tabla_afectada,
    created_at: item.created_at,
    user_id: item.user_id,
    user_profile: item.user_profile,
  }));

  return (
    <DataTableComplete<AuditRecord>
      data={tableData}
      columns={columns}
      isLoading={isLoading}
      emptyMessage="No hay actividades registradas"
      getRowId={(row) => row.id}
      searchPlaceholder="Buscar actividades..."
      exportFileName="actividades"
      selectable={false}
    />
  );
}
