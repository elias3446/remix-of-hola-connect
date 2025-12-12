import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { ReporteDetails } from '@/components/details';
import { useOptimizedReportes, ReporteWithDistance } from '@/hooks/entidades/useOptimizedReportes';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';

/**
 * Página de detalle de reporte
 */
export default function ReporteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: reportes, isLoading } = useOptimizedReportes();

  // Buscar el reporte directamente sin useEffect
  const reporte = reportes.find((r) => r.id === id) || null;

  // Mostrar LoadingScreen mientras carga o mientras no se ha procesado
  if (isLoading || (reportes.length === 0 && !reporte)) {
    return <LoadingScreen message="Cargando detalles del reporte..." />;
  }

  // Mostrar mensaje si no se encuentra
  if (!reporte) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Reporte no encontrado</h2>
        <Button onClick={() => navigate('/reportes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Reportes
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <ReporteDetails key={reporte.id} reporte={reporte} />
    </div>
  );
}