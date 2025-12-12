import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * Hook universal de optimización para componentes
 * Proporciona utilidades para memoización, detección de re-renders y lazy loading
 */
export function useOptimizedComponent<T extends object>(
  props: T,
  options: {
    debugRenders?: boolean;
    componentName?: string;
  } = {}
) {
  const { debugRenders = false, componentName = 'Component' } = options;
  const renderCount = useRef(0);
  const prevPropsRef = useRef<T>(props);

  // Debug re-renders en desarrollo
  useEffect(() => {
    if (debugRenders && process.env.NODE_ENV === 'development') {
      renderCount.current += 1;
      const changedProps = Object.keys(props).filter(
        (key) => prevPropsRef.current[key as keyof T] !== props[key as keyof T]
      );
      if (changedProps.length > 0) {
        console.log(`[${componentName}] Re-render #${renderCount.current}`, {
          changedProps,
          current: props,
          previous: prevPropsRef.current,
        });
      }
      prevPropsRef.current = props;
    }
  }, [props, debugRenders, componentName]);

  // Memoizar props estables
  const stableProps = useMemo(() => props, [JSON.stringify(props)]);

  // Crear callback memoizado
  const createStableCallback = useCallback(
    <F extends (...args: unknown[]) => unknown>(fn: F): F => {
      const ref = useRef(fn);
      ref.current = fn;
      return useCallback((...args: Parameters<F>) => ref.current(...args), []) as F;
    },
    []
  );

  return {
    stableProps,
    createStableCallback,
    renderCount: renderCount.current,
  };
}

/**
 * Hook para lazy loading de componentes pesados
 */
export function useLazyLoad(
  threshold: number = 0.1,
  rootMargin: string = '100px'
) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { elementRef, isVisible, hasLoaded };
}

/**
 * Hook para debounce de valores
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para throttle de callbacks
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        callback(...args);
      } else {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          callback(...args);
        }, delay - (now - lastRun.current));
      }
    },
    [callback, delay]
  ) as T;
}
