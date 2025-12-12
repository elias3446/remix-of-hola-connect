import { useState, memo, useMemo, useCallback } from 'react';
import { AlertTriangle, MapPin, Clock, Users, ThumbsUp, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SimilarReport } from '@/hooks/controlador/useSimilarReports';
import { ReportDetailsModal } from './ReportDetailsModal';
import { 
  useAnimations, 
  animationClasses, 
  transitionClasses,
  hoverClasses 
} from '@/hooks/optimizacion';

interface SimilarReportsFoundProps {
  reports: SimilarReport[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onConfirm: (reportId: string) => void;
  isConfirming?: boolean;
  isCreating?: boolean;
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

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m de distancia`;
  }
  return `${(meters / 1000).toFixed(1)}km de distancia`;
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

// Componente memoizado para cada tarjeta de reporte
const ReportCard = memo(function ReportCard({
  report,
  onConfirm,
  onViewDetails,
  isConfirming,
  index,
}: {
  report: SimilarReport;
  onConfirm: (id: string) => void;
  onViewDetails: (report: SimilarReport) => void;
  isConfirming: boolean;
  index: number;
}) {
  const { getStaggerClass } = useAnimations();
  
  const initials = useMemo(() => getInitials(report.user_name), [report.user_name]);
  const timeAgo = useMemo(
    () => formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: es }),
    [report.created_at]
  );
  const distance = useMemo(() => formatDistance(report.distancia_metros), [report.distancia_metros]);
  
  const handleConfirm = useCallback(() => onConfirm(report.id), [onConfirm, report.id]);
  const handleViewDetails = useCallback(() => onViewDetails(report), [onViewDetails, report]);

  return (
    <div
      className={cn(
        "bg-muted/50 rounded-lg border border-border p-4",
        transitionClasses.card,
        hoverClasses.shadow,
        getStaggerClass(index)
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={report.user_avatar} alt={report.user_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-foreground truncate">
                {report.nombre}
              </h4>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs flex-shrink-0',
                  transitionClasses.fast,
                  STATUS_COLORS[report.status] || STATUS_COLORS.pendiente
                )}
              >
                {STATUS_LABELS[report.status] || report.status}
              </Badge>
            </div>
            {report.descripcion && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                {report.descripcion}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {distance}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {report.confirmaciones_count} confirmación{report.confirmaciones_count !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones del reporte */}
      <div className="flex items-center gap-2 mt-4">
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={isConfirming}
          className={cn("gap-1.5", transitionClasses.button)}
        >
          <ThumbsUp className="h-4 w-4" />
          Yo también lo vi
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewDetails}
          className={cn("gap-1 text-muted-foreground", transitionClasses.normal)}
        >
          Ver detalles
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export const SimilarReportsFound = memo(function SimilarReportsFound({
  reports,
  open,
  onOpenChange,
  onContinue,
  onConfirm,
  isConfirming = false,
  isCreating = false,
}: SimilarReportsFoundProps) {
  const [selectedReport, setSelectedReport] = useState<SimilarReport | null>(null);

  // Memoizar el texto del diálogo
  const dialogText = useMemo(() => ({
    title: '¡Reportes similares encontrados!',
    description: `Encontramos ${reports.length} reporte${reports.length > 1 ? 's' : ''} similar${reports.length > 1 ? 'es' : ''} cerca de esta ubicación. Si es el mismo incidente, puedes confirmarlo en lugar de crear uno nuevo.`,
    continueButton: isCreating ? 'Creando reporte...' : 'Es diferente, continuar creando mi reporte',
  }), [reports.length, isCreating]);

  const handleOpenDetails = useCallback((report: SimilarReport) => {
    setSelectedReport(report);
  }, []);

  const handleCloseDetails = useCallback((open: boolean) => {
    if (!open) setSelectedReport(null);
  }, []);

  if (reports.length === 0) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className={cn("flex items-center gap-3", animationClasses.fadeIn)}>
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30",
                animationClasses.scaleIn
              )}>
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                  {dialogText.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                  {dialogText.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Lista de reportes similares */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {reports.map((report, index) => (
              <ReportCard
                key={report.id}
                report={report}
                onConfirm={onConfirm}
                onViewDetails={handleOpenDetails}
                isConfirming={isConfirming}
                index={index}
              />
            ))}
          </div>

          {/* Botón continuar creando */}
          <div className="flex-shrink-0 border-t border-border pt-4">
            <Button
              variant="ghost"
              onClick={onContinue}
              disabled={isCreating || isConfirming}
              className={cn(
                "w-full text-muted-foreground hover:text-foreground",
                transitionClasses.normal
              )}
            >
              {dialogText.continueButton}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de detalles */}
      <ReportDetailsModal
        report={selectedReport}
        open={!!selectedReport}
        onOpenChange={handleCloseDetails}
        onConfirm={onConfirm}
        isConfirming={isConfirming}
      />
    </>
  );
});
