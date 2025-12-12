import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Calendar, ExternalLink, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { transitionClasses } from '@/hooks/optimizacion';
import { formatDistance } from '@/lib/distance';

export interface EntityListItem {
  id: string;
  nombre: string;
  descripcion?: string | null;
  status?: string;
  priority?: string;
  created_at: string;
  distancia_metros?: number | null;
}

interface StatusConfig {
  label: string;
  className: string;
}

interface EntityListCardProps {
  title: string;
  subtitle?: string;
  items: EntityListItem[];
  emptyMessage?: string;
  emptySubMessage?: string;
  className?: string;
  maxHeight?: string;
  /** Ruta base para navegar al detalle (ej: "/reportes", "/tipo-reportes") */
  detailRoute: string;
  /** Configuración de estados (opcional) */
  statusConfig?: Record<string, StatusConfig>;
  /** Configuración de prioridades (opcional) */
  priorityConfig?: Record<string, StatusConfig>;
  /** Mostrar badges de estado/prioridad */
  showBadges?: boolean;
  /** Icono personalizado para la cabecera */
  icon?: React.ReactNode;
  /** Estado de carga */
  isLoading?: boolean;
  /** Mostrar distancia */
  showDistance?: boolean;
}

// Configuración por defecto de estados
const defaultStatusConfig: Record<string, StatusConfig> = {
  pendiente: { label: 'Pendiente', className: 'bg-amber-500/20 text-amber-600 border-amber-500/30' },
  en_proceso: { label: 'En Proceso', className: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  resuelto: { label: 'Resuelto', className: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
  cerrado: { label: 'Cerrado', className: 'bg-muted text-muted-foreground border-border' },
  rechazado: { label: 'Rechazado', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

// Configuración por defecto de prioridades
const defaultPriorityConfig: Record<string, StatusConfig> = {
  bajo: { label: 'Bajo', className: 'bg-muted text-muted-foreground' },
  medio: { label: 'Medio', className: 'bg-primary text-primary-foreground' },
  alto: { label: 'Alto', className: 'bg-amber-500 text-white' },
  critico: { label: 'Crítico', className: 'bg-destructive text-destructive-foreground' },
};

const EntityItem = React.memo<{
  item: EntityListItem;
  detailRoute: string;
  statusConfig: Record<string, StatusConfig>;
  priorityConfig: Record<string, StatusConfig>;
  showBadges: boolean;
  showDistance: boolean;
}>(({ item, detailRoute, statusConfig, priorityConfig, showBadges, showDistance }) => {
  const navigate = useNavigate();
  
  const status = item.status ? (statusConfig[item.status] || defaultStatusConfig.pendiente) : null;
  const priority = item.priority ? (priorityConfig[item.priority] || defaultPriorityConfig.medio) : null;
  
  const formattedDate = React.useMemo(() => {
    try {
      return format(new Date(item.created_at), 'dd/MM/yyyy', { locale: es });
    } catch {
      return '-';
    }
  }, [item.created_at]);

  return (
    <div 
      className={cn(
        "flex flex-col sm:flex-row items-start gap-3 p-3 sm:p-4 rounded-lg border bg-card overflow-hidden",
        transitionClasses.normal
      )}
    >
      {/* Contenido principal */}
      <div className="flex-1 min-w-0 w-full space-y-2 overflow-hidden">
        {/* Título con bullet */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
          <h4 className="font-semibold text-foreground truncate text-sm sm:text-base">{item.nombre}</h4>
        </div>
        
        {/* Descripción */}
        {item.descripcion && (
          <p className="text-xs sm:text-sm text-muted-foreground truncate pl-4">
            {item.descripcion}
          </p>
        )}
        
        {/* Badges, distancia y fecha */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 pl-4">
          {showBadges && status && (
            <Badge variant="outline" className={cn("text-xs", status.className)}>
              {status.label}
            </Badge>
          )}
          {showBadges && priority && (
            <Badge className={cn("text-xs", priority.className)}>
              {priority.label}
            </Badge>
          )}
          {showDistance && item.distancia_metros != null && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {formatDistance(item.distancia_metros / 1000)}
            </div>
          )}
          <div className="flex items-center gap-1 sm:gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {formattedDate}
          </div>
        </div>
      </div>
      
      {/* Botón Ver */}
      <Button
        variant="outline"
        size="sm"
        className="flex-shrink-0 gap-1.5 whitespace-nowrap self-end sm:self-start"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`${detailRoute}/${item.id}`);
        }}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Ver
      </Button>
    </div>
  );
});
EntityItem.displayName = 'EntityItem';

// Componente de skeleton para loading
const EntityItemSkeleton = () => (
  <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="w-2 h-2 rounded-full" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-4 w-64 ml-4" />
      <div className="flex items-center gap-2 ml-4">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
    <Skeleton className="h-8 w-16" />
  </div>
);

export const EntityListCard = React.memo<EntityListCardProps>(({
  title,
  subtitle,
  items,
  emptyMessage = 'No hay elementos asociados',
  emptySubMessage = 'Los elementos asociados aparecerán aquí',
  className,
  maxHeight = '100%',
  detailRoute,
  statusConfig = defaultStatusConfig,
  priorityConfig = defaultPriorityConfig,
  showBadges = true,
  icon,
  isLoading = false,
  showDistance = false,
}) => {
  // Solo mostrar skeletons si está cargando Y no hay items previos
  const showSkeleton = isLoading && items.length === 0;
  
  if (showSkeleton) {
    const hasHeader = title || subtitle;
    return (
      <Card className={cn("w-full", className)}>
        {hasHeader && (
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {icon || <FileText className="h-5 w-5 text-muted-foreground" />}
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </CardHeader>
        )}
        <CardContent className={cn(hasHeader ? "pt-0" : "pt-6")}>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <EntityItemSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (items.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              {icon || <FileText className="h-8 w-8 text-muted-foreground" />}
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">{emptyMessage}</h3>
            <p className="text-sm text-muted-foreground">{emptySubMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasHeader = title || subtitle;

  return (
    <Card className={cn("w-full", className)}>
      {hasHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {icon || <FileText className="h-5 w-5 text-muted-foreground" />}
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(hasHeader ? "pt-0" : "pt-6")}>
        <div className="overflow-auto" style={{ maxHeight }}>
          <div className="space-y-3">
            {items.map((item) => (
              <EntityItem
                key={item.id}
                item={item}
                detailRoute={detailRoute}
                statusConfig={statusConfig}
                priorityConfig={priorityConfig}
                showBadges={showBadges}
                showDistance={showDistance}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
EntityListCard.displayName = 'EntityListCard';

// Re-exportar con el nombre antiguo para compatibilidad
export const ReportListCard = EntityListCard;
export type ReportListItem = EntityListItem;
