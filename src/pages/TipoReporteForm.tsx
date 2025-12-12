import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ReportTypeForm } from '@/components/report-types/ReportTypeForm';
import { useOptimizedTipoReportes, TipoReporte } from '@/hooks/entidades';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Página de formulario para crear/editar tipos de reportes
 */
export default function TipoReporteFormPage() {
  const { id } = useParams<{ id: string }>();
  const { data: tipoReportes, isLoading } = useOptimizedTipoReportes();
  const [tipoReporte, setTipoReporte] = useState<TipoReporte | null>(null);

  const isEditing = !!id;

  useEffect(() => {
    if (isEditing && tipoReportes.length > 0) {
      const found = tipoReportes.find((t) => t.id === id);
      setTipoReporte(found || null);
    }
  }, [id, tipoReportes, isEditing]);

  // Mostrar skeleton mientras carga en modo edición
  if (isEditing && (isLoading || !tipoReporte)) {
    return (
      <div className="flex flex-col h-full">
        <div className="py-4 px-6 bg-secondary/50 border-b border-border">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="p-6">
          <Skeleton className="h-[500px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <ReportTypeForm key={tipoReporte?.id || 'new'} tipoReporte={tipoReporte} />
    </div>
  );
}
