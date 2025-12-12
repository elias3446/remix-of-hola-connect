import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { TipoReporteDetails } from '@/components/details';
import { useOptimizedTipoReportes, TipoReporte } from '@/hooks/entidades/useOptimizedTipoReportes';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';

/**
 * Página de detalle de tipo de reporte
 */
export default function TipoReporteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tipoReportes, isLoading } = useOptimizedTipoReportes();

  // Buscar el tipo de reporte directamente sin useEffect
  const tipoReporte = tipoReportes.find((tr) => tr.id === id) || null;

  // Mostrar LoadingScreen mientras carga o mientras no se ha procesado
  if (isLoading || (tipoReportes.length === 0 && !tipoReporte)) {
    return <LoadingScreen message="Cargando detalles del tipo de reporte..." />;
  }

  // Mostrar mensaje si no se encuentra
  if (!tipoReporte) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Tipo de reporte no encontrado</h2>
        <Button onClick={() => navigate('/tipo-reportes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Tipos de Reporte
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <TipoReporteDetails key={tipoReporte.id} tipoReporte={tipoReporte} />
    </div>
  );
}