import React from 'react';

interface NearbyReportToastProps {
  nombre: string;
  distanceText: string;
  priorityEmoji: string;
  priorityLabel: string;
  categoryName?: string | null;
  categoryColor?: string | null;
  address?: string | null;
  onNavigate: () => void;
  onViewReport: () => void;
}

export function NearbyReportToast({
  nombre,
  distanceText,
  priorityEmoji,
  priorityLabel,
  categoryName,
  categoryColor,
  address,
  onNavigate,
  onViewReport,
}: NearbyReportToastProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-2">
        <span className="text-lg">{priorityEmoji}</span>
        <span className="font-semibold text-foreground">¡Reporte cercano!</span>
      </div>
      
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="font-medium text-foreground">{nombre}</div>
        
        {categoryName && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Categoría:</span>
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: categoryColor || 'hsl(var(--muted))',
                color: categoryColor ? '#fff' : 'hsl(var(--muted-foreground))'
              }}
            >
              {categoryName}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Distancia:</span>
          <span className="font-medium text-foreground">{distanceText}</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Prioridad:</span>
          <span className="font-medium text-foreground">{priorityLabel}</span>
        </div>
        
        {address && (
          <div className="flex items-start gap-1.5">
            <span className="text-muted-foreground shrink-0">Dirección:</span>
            <span className="text-foreground text-xs line-clamp-2">{address}</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-2 mt-2">
        <button
          onClick={onNavigate}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          🧭 Navegar
        </button>
        <button
          onClick={onViewReport}
          className="flex-1 px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          Ver detalles
        </button>
      </div>
    </div>
  );
}
