import React, { useState, useCallback } from 'react';
import { MapPin, ChevronLeft, ChevronRight, Navigation } from 'lucide-react';
import { useAnimations, transitionClasses } from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';

export interface NearbyReportData {
  id: string;
  nombre: string;
  descripcion: string | null;
  distanceText: string;
  distanceKm: number;
  address?: string | null;
  lat: number;
  lng: number;
  priority: string;
  categoryName?: string | null;
  categoryColor?: string | null;
}

interface NearbyReportsGroupToastProps {
  reports: NearbyReportData[];
  onNavigate: (report: NearbyReportData) => void;
  onViewReport: (reportId: string) => void;
}

export function NearbyReportsGroupToast({
  reports,
  onNavigate,
  onViewReport,
}: NearbyReportsGroupToastProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { getTransition, combineAnimations } = useAnimations();

  const totalReports = reports.length;
  const currentReport = reports[currentIndex];

  const handlePrevious = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? totalReports - 1 : prev - 1));
  }, [totalReports]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === totalReports - 1 ? 0 : prev + 1));
  }, [totalReports]);

  const handleNavigate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentReport) {
      onNavigate(currentReport);
    }
  }, [currentReport, onNavigate]);

  const handleViewDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentReport) {
      onViewReport(currentReport.id);
    }
  }, [currentReport, onViewReport]);

  if (!currentReport) return null;

  return (
    <div className={cn(
      "flex flex-col gap-3 w-full min-w-[280px] max-w-[340px]",
      combineAnimations('fadeIn')
    )}>
      {/* Header con título y paginación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-foreground">
            ¡Te acercas a reportes!
          </span>
        </div>
      </div>

      {/* Subtítulo con icono y controles de paginación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-destructive" />
          <span className="text-sm font-medium text-muted-foreground">
            Reportes cercanos
          </span>
        </div>
        
        {totalReports > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevious}
              className={cn(
                "p-1 rounded hover:bg-muted/80",
                transitionClasses.fast
              )}
              aria-label="Reporte anterior"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="text-xs font-medium text-muted-foreground min-w-[32px] text-center">
              {currentIndex + 1}/{totalReports}
            </span>
            <button
              onClick={handleNext}
              className={cn(
                "p-1 rounded hover:bg-muted/80",
                transitionClasses.fast
              )}
              aria-label="Siguiente reporte"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Contenido del reporte actual */}
      <div className={cn(
        "flex flex-col gap-2 p-3 rounded-lg bg-muted/50 border border-border/50",
        getTransition('normal')
      )}>
        {/* Título del reporte */}
        <div 
          className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
          onClick={handleViewDetails}
        >
          {currentReport.nombre}
        </div>

        {/* Descripción truncada */}
        {currentReport.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {currentReport.descripcion}
          </p>
        )}

        {/* Distancia */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Distancia:</span>
          <span className="font-semibold text-primary">
            {currentReport.distanceText}
          </span>
        </div>

        {/* Dirección */}
        {currentReport.address && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {currentReport.address}
          </p>
        )}
      </div>

      {/* Indicadores de puntos (solo si hay más de 1) */}
      {totalReports > 1 && (
        <div className="flex justify-center gap-1.5">
          {reports.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === currentIndex
                  ? "bg-primary w-4"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Ir al reporte ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Botón de navegación */}
      <button
        onClick={handleNavigate}
        className={cn(
          "flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg",
          "bg-primary text-primary-foreground font-medium",
          "hover:bg-primary/90 active:scale-[0.98]",
          transitionClasses.button
        )}
      >
        <Navigation className="h-4 w-4" />
        Navegar
      </button>
    </div>
  );
}
