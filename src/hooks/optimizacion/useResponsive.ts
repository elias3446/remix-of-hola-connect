import { useState, useEffect, useMemo } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

interface UseResponsiveReturn {
  breakpoint: Breakpoint;
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isAtLeast: (bp: Breakpoint) => boolean;
  isAtMost: (bp: Breakpoint) => boolean;
  isBetween: (min: Breakpoint, max: Breakpoint) => boolean;
}

/**
 * Hook para manejo responsive avanzado
 */
export function useResponsive(): UseResponsiveReturn {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const breakpoint = useMemo((): Breakpoint => {
    if (width >= BREAKPOINTS['2xl']) return '2xl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  }, [width]);

  const isAtLeast = useMemo(
    () => (bp: Breakpoint): boolean => width >= BREAKPOINTS[bp],
    [width]
  );

  const isAtMost = useMemo(
    () => (bp: Breakpoint): boolean => width < BREAKPOINTS[bp],
    [width]
  );

  const isBetween = useMemo(
    () => (min: Breakpoint, max: Breakpoint): boolean =>
      width >= BREAKPOINTS[min] && width < BREAKPOINTS[max],
    [width]
  );

  return {
    breakpoint,
    width,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isLargeDesktop: width >= BREAKPOINTS.xl,
    isAtLeast,
    isAtMost,
    isBetween,
  };
}

/**
 * Clases responsive predefinidas para patrones comunes
 */
export const responsivePatterns = {
  // Grid layouts
  gridAuto: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  gridTwoCol: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  gridThreeCol: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  gridFourCol: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  
  // Flex layouts
  flexStack: 'flex flex-col md:flex-row gap-4',
  flexStackReverse: 'flex flex-col-reverse md:flex-row gap-4',
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
  
  // Containers
  container: 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  containerSm: 'w-full max-w-3xl mx-auto px-4 sm:px-6',
  containerMd: 'w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8',
  
  // Padding
  paddingSection: 'py-8 md:py-12 lg:py-16',
  paddingCard: 'p-4 sm:p-6',
  
  // Text
  textResponsive: 'text-sm sm:text-base',
  headingResponsive: 'text-xl sm:text-2xl lg:text-3xl',
  titleResponsive: 'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl',
  
  // Hide/Show
  hideMobile: 'hidden sm:block',
  hideDesktop: 'block sm:hidden',
  hideTablet: 'block md:hidden lg:block',
};

/**
 * Genera clases responsive según el breakpoint actual
 */
export function getResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  currentBreakpoint: Breakpoint,
  defaultValue: T
): T {
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }
  
  return defaultValue;
}
