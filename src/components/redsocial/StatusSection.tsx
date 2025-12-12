/**
 * Sección de Estados en la Red Social
 */
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusList } from '@/components/estados';
import { animationClasses } from '@/hooks/optimizacion';

interface StatusSectionProps {
  currentUserId?: string;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
  /** ID de estado para abrir automáticamente */
  openEstadoId?: string | null;
}

export function StatusSection({ 
  currentUserId, 
  currentUserAvatar, 
  currentUserName,
  openEstadoId,
}: StatusSectionProps) {
  return (
    <Card className={cn("mb-6", animationClasses.fadeIn)}>
      <CardHeader className="pb-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Estados
        </h3>
      </CardHeader>
      <CardContent className="p-0">
        <StatusList
          currentUserId={currentUserId}
          currentUserAvatar={currentUserAvatar}
          currentUserName={currentUserName}
          showAddButton
          orientation="horizontal"
          size="md"
          source="social"
          openEstadoId={openEstadoId}
        />
      </CardContent>
    </Card>
  );
}
