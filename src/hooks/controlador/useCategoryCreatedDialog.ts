import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LocationState {
  from?: string;
  redirect?: string;
}

interface UseCategoryCreatedDialogOptions {
  /** Ruta por defecto si no hay 'from' en el state */
  defaultBackRoute?: string;
}

/**
 * Hook para mostrar diálogo de confirmación después de crear una categoría
 * Pregunta si desea crear un tipo de reporte para la categoría recién creada
 */
export function useCategoryCreatedDialog(options: UseCategoryCreatedDialogOptions = {}) {
  const { defaultBackRoute = '/categorias' } = options;
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  
  const [showDialog, setShowDialog] = useState(false);
  const [createdCategoryId, setCreatedCategoryId] = useState<string | null>(null);

  // Determinar la ruta de origen para navegación
  const fromRoute = locationState?.from || defaultBackRoute;

  /**
   * Mostrar el diálogo después de crear categoría exitosamente
   */
  const showCreateReportTypeDialog = useCallback((categoryId?: string) => {
    if (categoryId) {
      setCreatedCategoryId(categoryId);
    }
    setShowDialog(true);
  }, []);

  /**
   * Manejar confirmación - navegar a crear tipo de reporte
   */
  const handleConfirmCreateReportType = useCallback(() => {
    setShowDialog(false);
    // Navegar a crear tipo de reporte, pasando la categoría creada si está disponible
    navigate('/tipo-reportes/nuevo', {
      state: {
        from: fromRoute,
        preselectedCategoryId: createdCategoryId
      }
    });
  }, [navigate, fromRoute, createdCategoryId]);

  /**
   * Manejar cancelación - volver a la página de origen
   */
  const handleCancelAndGoBack = useCallback(() => {
    setShowDialog(false);
    navigate(fromRoute);
  }, [navigate, fromRoute]);

  /**
   * Cerrar diálogo sin acción
   */
  const closeDialog = useCallback(() => {
    setShowDialog(false);
  }, []);

  return {
    showDialog,
    setShowDialog,
    showCreateReportTypeDialog,
    handleConfirmCreateReportType,
    handleCancelAndGoBack,
    closeDialog,
    fromRoute,
    createdCategoryId,
  };
}
