import { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Info, 
  User, 
  Calendar, 
  Clock,
  Database,
  GitCompare,
  Settings,
  LogIn,
  LogOut,
  RefreshCw,
  Plus,
  Trash2,
  LucideIcon
} from 'lucide-react';
import { useAnimations } from '@/hooks/optimizacion';
import { Database as SupabaseDB } from '@/integrations/supabase/types';

type OperationType = SupabaseDB['public']['Enums']['operation_type'];

export interface AuditRecord {
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
}

interface AuditDetailsModalProps {
  record: AuditRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Configuración visual por operación
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
    label: 'CREATE',
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

// Componente para mostrar JSON con formato
const JsonDisplay = memo(({ data, variant }: { data: unknown; variant: 'previous' | 'current' }) => {
  const { transitionClasses } = useAnimations();
  
  const formattedJson = useMemo(() => {
    if (!data) return null;
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  if (!formattedJson) {
    return (
      <div className="p-4 text-center text-muted-foreground italic">
        Sin datos
      </div>
    );
  }

  const headerClass = variant === 'previous' 
    ? 'bg-destructive/10 text-destructive border-destructive/20' 
    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  
  const headerText = variant === 'previous' ? 'ESTADO ANTERIOR' : 'ESTADO ACTUAL';

  return (
    <div className={`rounded-lg border overflow-hidden ${transitionClasses.normal}`}>
      <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b ${headerClass}`}>
        {headerText}
      </div>
      <ScrollArea className="h-48">
        <pre className="p-3 text-xs font-mono bg-muted/30 text-foreground whitespace-pre-wrap break-all">
          {formattedJson}
        </pre>
      </ScrollArea>
    </div>
  );
});

JsonDisplay.displayName = 'JsonDisplay';

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

export const AuditDetailsModal = memo(({ record, open, onOpenChange }: AuditDetailsModalProps) => {
  const { transitionClasses } = useAnimations();
  
  if (!record) return null;

  const actionKey = record.action?.toLowerCase() || 'update';
  const config = operationConfig[actionKey] || operationConfig.update;
  const Icon = config.icon;
  
  const profile = record.user_profile || record.performed_by_profile;
  const userEmail = profile?.email || profile?.name || 'Usuario desconocido';
  
  const date = record.created_at ? new Date(record.created_at) : null;
  const isValidDate = date && !isNaN(date.getTime());
  
  const description = record.details || getDescription(record.action, record.tabla_afectada);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Detalles del Cambio
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 min-h-0">
          <div className="space-y-6 pb-4">
            {/* Información General */}
            <Card className={transitionClasses.card}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Operación */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Operación:</p>
                    <Badge variant={config.variant} className={`gap-1.5 ${config.className}`}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                  
                  {/* Usuario */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Usuario:</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate" title={userEmail}>
                        {userEmail}
                      </span>
                    </div>
                  </div>
                  
                  {/* Tabla */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Tabla:</p>
                    <Badge variant="secondary" className="font-mono">
                      {record.tabla_afectada || 'sistema'}
                    </Badge>
                  </div>
                  
                  {/* Fecha y Hora */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha y Hora:</p>
                    {isValidDate ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(date, 'dd/MM/yyyy', { locale: es })}
                        </span>
                        <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                        <span className="text-sm">
                          {format(date, 'HH:mm:ss', { locale: es })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
                
                {/* Descripción del Cambio */}
                <div className="space-y-1 pt-2 border-t">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Descripción del Cambio:</p>
                  <p className="text-sm text-foreground">{description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Comparación de Valores (solo si hay datos) */}
            {(record.valores_anteriores || record.valores_nuevos) && (
              <Card className={transitionClasses.card}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitCompare className="h-4 w-4 text-primary" />
                    Comparación de Valores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <JsonDisplay data={record.valores_anteriores} variant="previous" />
                    <JsonDisplay data={record.valores_nuevos} variant="current" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Información Técnica */}
            <Card className={transitionClasses.card}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  Información Técnica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* ID del Registro */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">ID del Registro:</p>
                    <Badge variant="outline" className="font-mono text-xs">
                      {record.registro_id || record.id}
                    </Badge>
                  </div>
                  
                  {/* Nombre de la Tabla */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Nombre de la Tabla:</p>
                    <Badge variant="secondary" className="font-mono">
                      {record.tabla_afectada || 'sistema'}
                    </Badge>
                  </div>
                </div>
                
                {/* Campos Modificados */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Campos Modificados:</p>
                  <div className="flex flex-wrap gap-2">
                    {record.campos_modificados && record.campos_modificados.length > 0 ? (
                      record.campos_modificados.map((campo, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {campo}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Sin campos modificados</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

AuditDetailsModal.displayName = 'AuditDetailsModal';
