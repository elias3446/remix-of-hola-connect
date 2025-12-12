import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Calendar, 
  User, 
  Tag, 
  MapPin, 
  AlertCircle,
  CheckCircle2,
  Eye,
  UserCheck,
  X,
  ExternalLink,
  Navigation,
  icons
} from "lucide-react";
import { format } from "date-fns";
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { cn } from "@/lib/utils";
import { formatDistance } from '@/lib/distance';
import { 
  useOptimizedComponent, 
  animationClasses, 
  transitionClasses, 
  hoverClasses 
} from '@/hooks/optimizacion';

interface ReporteSidebarProps {
  report: any;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus?: () => void;
  updatingStatus?: boolean;
  onToggleVisibility?: () => void;
  updatingVisibility?: boolean;
}

export const ReporteSidebar = ({ 
  report, 
  isOpen, 
  onClose,
  onToggleStatus, 
  updatingStatus = false, 
  onToggleVisibility, 
  updatingVisibility = false 
}: ReporteSidebarProps) => {
  const navigate = useNavigate();

  // Optimización del componente
  useOptimizedComponent(
    { 
      reportId: report?.id, 
      isOpen, 
      updatingStatus, 
      updatingVisibility 
    },
    { componentName: 'ReporteSidebar' }
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pendiente": return "destructive";
      case "en_progreso": return "default";
      case "resuelto": return "default";
      case "cerrado": return "secondary";
      default: return "default";
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "critico": return "destructive";
      case "alto": return "destructive";
      case "medio": return "default";
      case "bajo": return "secondary";
      default: return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pendiente": return "Pendiente";
      case "en_progreso": return "En Progreso";
      case "resuelto": return "Resuelto";
      case "cerrado": return "Cerrado";
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "critico": return "Crítico";
      case "alto": return "Alto";
      case "medio": return "Medio";
      case "bajo": return "Bajo";
      default: return priority;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    return visibility === "publico" ? "Hacer Privado" : "Hacer Público";
  };

  const getCategoryIcon = (iconName?: string) => {
    if (!iconName) return FileText;
    
    const kebabCase = iconName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    
    if (kebabCase in dynamicIconImports) {
      const IconComponent = icons[iconName as keyof typeof icons];
      return IconComponent || FileText;
    }
    
    return FileText;
  };

  const openGoogleMaps = () => {
    if (lat !== undefined && lng !== undefined) {
      window.open(
        `https://www.google.com/maps?q=${lat},${lng}`,
        '_blank'
      );
    }
  };

  const handleViewFullDetails = () => {
    if (report?.id) {
      onClose();
      navigate(`/reportes/${report.id}`);
    }
  };

  if (!report) return null;

  const CategoryIcon = getCategoryIcon(report.categories?.icon);

  // Extraer coordenadas y dirección del location
  const location = report.location as { 
    lat?: number; 
    lng?: number; 
    latitude?: number; 
    longitude?: number; 
    address?: string;
    direccion?: string;
  } | null;
  const lat = location?.lat ?? location?.latitude;
  const lng = location?.lng ?? location?.longitude;
  const address = location?.address || location?.direccion;

  // Distancia del reporte - usar distancia_metros como en ReportesTable
  const distanciaMetros = report.distancia_metros;

  return (
    <div 
      className={cn(
        'fixed top-0 right-0 h-full w-[320px] md:w-[360px] z-50',
        'bg-background border-l border-border shadow-xl',
        'transform transition-transform duration-300 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        animationClasses.slideInRight
      )}
    >
      {/* Header con botón de cerrar */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold text-lg">Detalles del Reporte</h2>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          className={cn(transitionClasses.button, hoverClasses.bgMuted)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-65px)]">
        <div className="p-4 space-y-4">
          {/* Avatar con icono de categoría */}
          <div className={cn(
            "flex flex-col items-center text-center space-y-2",
            animationClasses.fadeIn
          )}>
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-muted">
                <CategoryIcon className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 w-full max-w-[calc(100%-1rem)] overflow-hidden px-2">
              <p className="font-semibold break-all line-clamp-2">{report.nombre || "Sin título"}</p>
              <Badge variant="outline" className="text-xs max-w-full inline-flex">
                <Tag className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{report.categories?.nombre || "Sin categoría"}</span>
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Descripción */}
          {report.descripcion && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Descripción</span>
                </div>
                <p className="text-sm text-muted-foreground">{report.descripcion}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Fechas */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Creado: {format(new Date(report.created_at), "dd/MM/yyyy HH:mm")}</span>
            </div>
            {report.profiles?.name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Creado por: {report.profiles.name}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Asignado a - Siempre visible */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Asignado a</span>
            </div>
            <p className="text-sm font-medium">
              {report.assigned_profiles?.name || "Sin asignar"}
            </p>
          </div>

          <Separator />

          {/* Prioridad */}
          {report.priority && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Prioridad</span>
                </div>
                <Badge variant={getPriorityVariant(report.priority)} className="w-full justify-center">
                  {getPriorityLabel(report.priority)}
                </Badge>
              </div>
              <Separator />
            </>
          )}

          {/* Estado del Reporte */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Estado</span>
            </div>
            <Badge variant={getStatusVariant(report.status)} className="w-full justify-center">
              {getStatusLabel(report.status)}
            </Badge>
            {onToggleStatus && report.status !== "resuelto" && (
              <Button 
                variant="outline" 
                size="sm" 
                className={cn("w-full", transitionClasses.button)}
                onClick={onToggleStatus}
                disabled={updatingStatus}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar como Resuelto
              </Button>
            )}
          </div>

          <Separator />

          {/* Visibilidad */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Visibilidad</span>
            </div>
            <Badge 
              variant={report.visibility === "publico" ? "default" : "secondary"} 
              className="w-full justify-center"
            >
              {report.visibility === "publico" ? "Público" : "Privado"}
            </Badge>
            {onToggleVisibility && (
              <Button 
                variant="outline" 
                size="sm" 
                className={cn("w-full", transitionClasses.button)}
                onClick={onToggleVisibility}
                disabled={updatingVisibility}
              >
                <Eye className="h-4 w-4 mr-2" />
                {getVisibilityLabel(report.visibility)}
              </Button>
            )}
          </div>

          <Separator />

          {/* Ubicación completa */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Ubicación</span>
            </div>
            
            {/* Distancia */}
            {distanciaMetros !== undefined && distanciaMetros !== null && (
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Distancia: {formatDistance(distanciaMetros / 1000)}
                </span>
              </div>
            )}

            {/* Coordenadas */}
            {lat !== undefined && lng !== undefined && (
              <p className="text-xs text-muted-foreground font-mono">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </p>
            )}

            {/* Dirección */}
            {address && (
              <p className="text-sm text-muted-foreground">
                {address}
              </p>
            )}

            {/* Botón Google Maps */}
            {lat !== undefined && lng !== undefined && (
              <Button 
                variant="outline" 
                size="sm" 
                className={cn("w-full", transitionClasses.button, hoverClasses.scale)}
                onClick={openGoogleMaps}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver en Google Maps
              </Button>
            )}
          </div>

          <Separator />

          {/* Ver detalle completo */}
          <Button 
            variant="default" 
            size="sm" 
            className={cn("w-full", transitionClasses.button, hoverClasses.scale)}
            onClick={handleViewFullDetails}
          >
            <FileText className="h-4 w-4 mr-2" />
            Ver detalle completo
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};