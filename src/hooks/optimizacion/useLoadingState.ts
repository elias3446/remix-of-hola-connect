import { useState, useCallback, useMemo } from 'react';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface UseLoadingStateOptions {
  initialState?: LoadingState;
  autoResetDelay?: number;
}

interface UseLoadingStateReturn {
  state: LoadingState;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  setIdle: () => void;
  setLoading: () => void;
  setSuccess: () => void;
  setError: () => void;
  reset: () => void;
}

/**
 * Hook para manejar estados de carga con mejor UX
 */
export function useLoadingState(
  options: UseLoadingStateOptions = {}
): UseLoadingStateReturn {
  const { initialState = 'idle', autoResetDelay } = options;
  const [state, setState] = useState<LoadingState>(initialState);

  const setIdle = useCallback(() => setState('idle'), []);
  const setLoading = useCallback(() => setState('loading'), []);
  
  const setSuccess = useCallback(() => {
    setState('success');
    if (autoResetDelay) {
      setTimeout(() => setState('idle'), autoResetDelay);
    }
  }, [autoResetDelay]);
  
  const setError = useCallback(() => {
    setState('error');
    if (autoResetDelay) {
      setTimeout(() => setState('idle'), autoResetDelay);
    }
  }, [autoResetDelay]);
  
  const reset = useCallback(() => setState(initialState), [initialState]);

  const derivedStates = useMemo(
    () => ({
      isIdle: state === 'idle',
      isLoading: state === 'loading',
      isSuccess: state === 'success',
      isError: state === 'error',
    }),
    [state]
  );

  return {
    state,
    ...derivedStates,
    setIdle,
    setLoading,
    setSuccess,
    setError,
    reset,
  };
}

/**
 * Clases de skeleton para diferentes elementos
 */
export const skeletonClasses = {
  // Texto
  text: 'animate-pulse bg-muted rounded h-4 w-full',
  textSm: 'animate-pulse bg-muted rounded h-3 w-full',
  textLg: 'animate-pulse bg-muted rounded h-5 w-full',
  heading: 'animate-pulse bg-muted rounded h-8 w-3/4',
  
  // Avatares
  avatar: 'animate-pulse bg-muted rounded-full',
  avatarSm: 'animate-pulse bg-muted rounded-full w-8 h-8',
  avatarMd: 'animate-pulse bg-muted rounded-full w-10 h-10',
  avatarLg: 'animate-pulse bg-muted rounded-full w-12 h-12',
  
  // Botones
  button: 'animate-pulse bg-muted rounded h-10 w-24',
  buttonFull: 'animate-pulse bg-muted rounded h-10 w-full',
  
  // Cards
  card: 'animate-pulse bg-muted rounded-lg',
  cardSm: 'animate-pulse bg-muted rounded-lg h-32',
  cardMd: 'animate-pulse bg-muted rounded-lg h-48',
  cardLg: 'animate-pulse bg-muted rounded-lg h-64',
  
  // Imágenes
  image: 'animate-pulse bg-muted rounded',
  imageSq: 'animate-pulse bg-muted rounded aspect-square',
  imageRect: 'animate-pulse bg-muted rounded aspect-video',
  
  // Inputs
  input: 'animate-pulse bg-muted rounded h-10 w-full',
  textarea: 'animate-pulse bg-muted rounded h-24 w-full',
  
  // Tablas
  tableRow: 'animate-pulse bg-muted rounded h-12 w-full',
  tableCell: 'animate-pulse bg-muted rounded h-8',
};

/**
 * Genera clases de skeleton con dimensiones personalizadas
 */
export function getSkeletonClass(
  variant: keyof typeof skeletonClasses,
  customClasses?: string
): string {
  const base = skeletonClasses[variant];
  return customClasses ? `${base} ${customClasses}` : base;
}
