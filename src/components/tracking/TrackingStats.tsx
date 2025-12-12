import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, MapPin, Navigation, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animationClasses } from '@/hooks/optimizacion';
import { NavigationStats, ReportForNavigation } from '@/hooks/controlador/useRealtimeNavigation';

interface TrackingStatsProps {
  isTracking: boolean;
  stats: NavigationStats | null;
  nearestReport: ReportForNavigation | null;
  accuracy: number | null;
  speed: number | null;
  className?: string;
}

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
};

const formatTime = (minutes: number): string => {
  if (minutes < 1) return '< 1 min';
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  return `${minutes} min`;
};

export const TrackingStats: React.FC<TrackingStatsProps> = ({
  isTracking,
  stats,
  nearestReport,
  accuracy,
  speed,
  className,
}) => {
  if (!isTracking) return null;

  return (
    <Card className={cn(
      'bg-background/95 backdrop-blur-sm border-border shadow-lg',
      animationClasses.scaleIn,
      className
    )}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Activity className="h-4 w-4 animate-pulse" />
          <span>Rastreo activo</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {accuracy !== null && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>Precisión: {accuracy.toFixed(0)}m</span>
            </div>
          )}

          {speed !== null && speed > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Navigation className="h-3 w-3" />
              <span>{(speed * 3.6).toFixed(1)} km/h</span>
            </div>
          )}
        </div>

        {nearestReport && stats && (
          <div className="pt-2 border-t border-border space-y-1.5">
            <p className="text-xs font-medium text-foreground truncate">
              Destino: {nearestReport.nombre}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" />
                {formatDistance(stats.distanceMeters)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(stats.estimatedTimeMinutes)}
              </span>
              <span className="flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                {stats.bearingDirection}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
