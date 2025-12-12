import { useParams } from 'react-router-dom';
import { ReportForm } from '@/components/report/ReportForm';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';

export default function ReporteForm() {
  const { id } = useParams<{ id: string }>();
  const { data: reportes } = useOptimizedReportes();

  // Si hay ID, buscar el reporte para editar
  const reporte = id ? reportes.find((r) => r.id === id) : null;

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="flex flex-col h-full">
        <ReportForm 
          reporte={reporte} 
          defaultBackRoute={id ? '/reportes' : '/mis-reportes'}
        />
      </div>
    </div>
  );
}
