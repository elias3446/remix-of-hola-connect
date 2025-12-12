import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export interface FormNavigationOptions {
  /** Ruta por defecto a la que navegar al retroceder o cancelar */
  defaultBackRoute?: string;
  /** Callback personalizado al retroceder */
  onBack?: () => void;
  /** Callback personalizado al cancelar */
  onCancel?: () => void;
  /** Callback al crear/guardar */
  onSubmit?: () => void | Promise<void>;
}

export interface FormNavigationResult {
  /** Navegar hacia atrás */
  goBack: () => void;
  /** Cancelar la operación */
  handleCancel: () => void;
  /** Enviar el formulario */
  handleSubmit: () => void | Promise<void>;
  /** Si está navegando */
  isNavigating: boolean;
  /** Ruta de retorno calculada */
  backRoute: string | null;
}

/**
 * Hook universal para navegación en formularios
 * Maneja retroceder, cancelar y crear/guardar
 * Prioriza el parámetro 'from' de la URL sobre la ruta por defecto
 */
export function useFormNavigation(options: FormNavigationOptions = {}): FormNavigationResult {
  const { defaultBackRoute, onBack, onCancel, onSubmit } = options;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  // Obtener la ruta de origen del parámetro 'from' o usar la ruta por defecto
  const fromRoute = searchParams.get('from');
  const backRoute = fromRoute || defaultBackRoute || null;

  const goBack = useCallback(() => {
    setIsNavigating(true);
    if (onBack) {
      onBack();
    } else if (backRoute) {
      navigate(backRoute);
    } else {
      navigate(-1);
    }
  }, [navigate, backRoute, onBack]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      goBack();
    }
  }, [onCancel, goBack]);

  const handleSubmit = useCallback(async () => {
    if (onSubmit) {
      await onSubmit();
    }
  }, [onSubmit]);

  return {
    goBack,
    handleCancel,
    handleSubmit,
    isNavigating,
    backRoute,
  };
}
