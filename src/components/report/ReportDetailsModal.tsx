import { memo, useMemo } from 'react';
import { MapPin, Users, Calendar, Info, User, Building, Layers, DoorOpen, Navigation } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SimilarReport } from '@/hooks/controlador/useSimilarReports';
import type { Json } from '@/integrations/supabase/types';
import { 
  useAnimations, 
  animationClasses, 
  transitionClasses 
} from '@/hooks/optimizacion';
import { ReporteEvidencia } from '@/components/ui/ReporteEvidencia';

interface ReportDetailsModalProps {
  report: SimilarReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (reportId: string) => void;
  isConfirming?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  resuelto: 'Resuelto',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
  en_progreso: 'bg-blue-100 text-blue-700 border-blue-200',
  resuelto: 'bg-green-100 text-green-700 border-green-200',
  rechazado: 'bg-red-100 text-red-700 border-red-200',
  cancelado: 'bg-muted text-muted-foreground border-border',
};

const PRIORITY_LABELS: Record<string, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  urgente: 'Urgente',
};

const PRIORITY_COLORS: Record<string, string> = {
  bajo: 'bg-green-100 text-green-700 border-green-200',
  medio: 'bg-amber-100 text-amber-700 border-amber-200',
  alto: 'bg-orange-100 text-orange-700 border-orange-200',
  urgente: 'bg-red-100 text-red-700 border-red-200',
};

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} metros`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Componente memoizado para la sección de información
const InfoSection = memo(function InfoSection({ 
  icon: Icon, 
  label, 
  value,
  index = 0 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string;
  index?: number;
}) {
  return (
    <div 
      className={cn(
        "flex items-start gap-3",
        animationClasses.fadeIn
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
});

// Componente memoizado para el avatar del usuario
const UserInfo = memo(function UserInfo({ 
  avatar, 
  name, 
  timeAgo 
}: { 
  avatar?: string; 
  name: string; 
  timeAgo: string;
}) {
  const initials = useMemo(() => getInitials(name), [name]);
  
  return (
    <div className={cn("flex items-center gap-3", transitionClasses.normal)}>
      <Avatar className="h-10 w-10">
        <AvatarImage src={avatar} alt={name} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>
    </div>
  );
});

export const ReportDetailsModal = memo(function ReportDetailsModal({
  report,
  open,
  onOpenChange,
}: ReportDetailsModalProps) {
  const { getStaggerClass } = useAnimations();
  
  // Memoizar datos derivados del reporte
  const reportData = useMemo(() => {
    if (!report) return null;
    
    const createdDate = new Date(report.created_at);
    
    // Extraer datos de ubicación
    let locationData = {
      address: undefined as string | undefined,
      reference: undefined as string | undefined,
      building: undefined as string | undefined,
      floor: undefined as string | undefined,
      room: undefined as string | undefined,
      additionalInfo: undefined as string | undefined,
    };
    
    if (report.location && typeof report.location === 'object') {
      const loc = report.location as {
        address?: string;
        direccion?: string;
        reference?: string;
        puntoReferencia?: string;
        building?: string;
        edificio?: string;
        floor?: string;
        piso?: string;
        room?: string;
        aulaSala?: string;
        additional_info?: string;
        infoAdicional?: string;
      };
      locationData = {
        address: loc.address || loc.direccion,
        reference: loc.reference || loc.puntoReferencia,
        building: loc.building || loc.edificio,
        floor: loc.floor || loc.piso,
        room: loc.room || loc.aulaSala,
        additionalInfo: loc.additional_info || loc.infoAdicional,
      };
    }
    
    return {
      createdDate,
      timeAgo: formatDistanceToNow(createdDate, { addSuffix: true, locale: es }),
      formattedDate: format(createdDate, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es }),
      distance: formatDistance(report.distancia_metros),
      confirmationsText: `${report.confirmaciones_count} persona${report.confirmaciones_count !== 1 ? 's' : ''}`,
      location: locationData,
    };
  }, [report]);

  if (!report || !reportData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-6">
          <DialogTitle className={cn(
            "text-xl font-semibold text-foreground",
            animationClasses.fadeIn
          )}>
            {report.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Badges de estado y prioridad */}
          <div className={cn(
            "flex items-center gap-2 flex-wrap",
            animationClasses.fadeIn
          )}>
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                transitionClasses.fast,
                STATUS_COLORS[report.status] || STATUS_COLORS.pendiente
              )}
            >
              {STATUS_LABELS[report.status] || report.status}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                transitionClasses.fast,
                PRIORITY_COLORS[report.priority] || PRIORITY_COLORS.medio
              )}
            >
              {PRIORITY_LABELS[report.priority] || report.priority}
            </Badge>
          </div>

          {/* Sección Evidencia */}
          <div className={cn("space-y-2", getStaggerClass(0))}>
            <ReporteEvidencia imagenes={report.imagenes} />
          </div>

          {/* Descripción */}
          <div className={cn("space-y-2", getStaggerClass(1))}>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Info className="h-4 w-4" />
              Descripción
            </div>
            <p className="text-sm text-foreground">
              {report.descripcion || 'Sin descripción'}
            </p>
          </div>

          {/* Reportado por */}
          <div className={cn("space-y-2", getStaggerClass(2))}>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Reportado por
            </div>
            <UserInfo 
              avatar={report.user_avatar}
              name={report.user_name}
              timeAgo={reportData.timeAgo}
            />
          </div>

          {/* Ubicación */}
          {(reportData.location.address || reportData.location.building || reportData.location.floor || reportData.location.room) && (
            <div className={cn("space-y-3", getStaggerClass(3))}>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Ubicación
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {reportData.location.address && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Dirección</p>
                    <p className="font-medium text-foreground">{reportData.location.address}</p>
                  </div>
                )}
                {reportData.location.reference && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Navigation className="h-3 w-3" /> Referencia
                    </p>
                    <p className="font-medium text-foreground">{reportData.location.reference}</p>
                  </div>
                )}
                {reportData.location.building && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building className="h-3 w-3" /> Edificio
                    </p>
                    <p className="font-medium text-foreground">{reportData.location.building}</p>
                  </div>
                )}
                {reportData.location.floor && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Layers className="h-3 w-3" /> Piso
                    </p>
                    <p className="font-medium text-foreground">{reportData.location.floor}</p>
                  </div>
                )}
                {reportData.location.room && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <DoorOpen className="h-3 w-3" /> Sala/Oficina
                    </p>
                    <p className="font-medium text-foreground">{reportData.location.room}</p>
                  </div>
                )}
                {reportData.location.additionalInfo && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Info adicional</p>
                    <p className="font-medium text-foreground">{reportData.location.additionalInfo}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="space-y-3">
            <InfoSection 
              icon={MapPin} 
              label="Distancia" 
              value={reportData.distance}
              index={0}
            />
            <InfoSection 
              icon={Users} 
              label="Confirmaciones" 
              value={reportData.confirmationsText}
              index={1}
            />
            <InfoSection 
              icon={Calendar} 
              label="Fecha de creación" 
              value={reportData.formattedDate}
              index={2}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
