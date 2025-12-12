import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';

interface UseCategoryCheckOptions {
  onCategoriesAvailable?: () => void;
  redirectAfterCategory?: string;
}

/**
 * Hook para verificar disponibilidad de categorías antes de crear tipos de reporte
 * Si no hay categorías activas, muestra diálogo de confirmación
 */
export const useCategoryCheck = (options: UseCategoryCheckOptions = {}) => {
  const navigate = useNavigate();
  // Obtener TODAS las categorías y filtrar en el cliente para evitar problemas de caché
  const { data: allCategories, isLoading, refetch } = useOptimizedCategories();
  const [showNoCategoriesDialog, setShowNoCategoriesDialog] = useState(false);
  const [pendingCheck, setPendingCheck] = useState(false);

  // Filtrar categorías activas en el cliente
  const activeCategories = allCategories.filter(cat => cat.activo && !cat.deleted_at);

  const hasAvailableCategories = useCallback(() => {
    return activeCategories.length > 0;
  }, [activeCategories]);

  // Si hay un check pendiente y ya terminó de cargar, procesar
  useEffect(() => {
    if (pendingCheck && !isLoading) {
      setPendingCheck(false);
      if (hasAvailableCategories()) {
        options.onCategoriesAvailable?.();
      } else {
        setShowNoCategoriesDialog(true);
      }
    }
  }, [pendingCheck, isLoading, hasAvailableCategories, options]);

  const checkAndProceed = useCallback(async () => {
    // Refrescar datos antes de verificar
    await refetch();
    
    if (isLoading) {
      // Marcar como pendiente para procesar cuando termine de cargar
      setPendingCheck(true);
      return;
    }

    if (hasAvailableCategories()) {
      options.onCategoriesAvailable?.();
    } else {
      setShowNoCategoriesDialog(true);
    }
  }, [isLoading, hasAvailableCategories, options, refetch]);

  const handleCreateCategory = useCallback(() => {
    setShowNoCategoriesDialog(false);
    // Usar state de React Router en lugar de query params para evitar recargas
    const redirectPath = options.redirectAfterCategory || '/tipo-reportes/nuevo';
    navigate('/categorias/nueva', {
      state: {
        from: '/tipo-reportes',
        redirect: redirectPath
      }
    });
  }, [navigate, options.redirectAfterCategory]);

  const handleCancelDialog = useCallback(() => {
    setShowNoCategoriesDialog(false);
  }, []);

  return {
    isLoading,
    hasAvailableCategories,
    checkAndProceed,
    showNoCategoriesDialog,
    setShowNoCategoriesDialog,
    handleCreateCategory,
    handleCancelDialog,
  };
};
