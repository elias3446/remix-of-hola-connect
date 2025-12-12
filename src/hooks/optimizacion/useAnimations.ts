import { useMemo } from 'react';

/**
 * Clases de animación predefinidas del design system
 */
export const animationClasses = {
  // Fade
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  
  // Scale
  scaleIn: 'animate-scale-in',
  scaleOut: 'animate-scale-out',
  
  // Slide
  slideInRight: 'animate-slide-in-right',
  slideOutRight: 'animate-slide-out-right',
  
  // Combinadas
  enter: 'animate-enter',
  exit: 'animate-exit',
  
  // Accordion
  accordionDown: 'animate-accordion-down',
  accordionUp: 'animate-accordion-up',
  
  // Interactivas
  hoverScale: 'hover-scale',
  storyLink: 'story-link',
  pulse: 'pulse',
};

/**
 * Transiciones suaves predefinidas
 */
export const transitionClasses = {
  // Duración
  fast: 'transition-all duration-150 ease-out',
  normal: 'transition-all duration-200 ease-out',
  slow: 'transition-all duration-300 ease-out',
  slower: 'transition-all duration-500 ease-out',
  
  // Por propiedad
  colors: 'transition-colors duration-200 ease-out',
  opacity: 'transition-opacity duration-200 ease-out',
  transform: 'transition-transform duration-200 ease-out',
  shadow: 'transition-shadow duration-200 ease-out',
  
  // Combinaciones comunes
  button: 'transition-all duration-200 ease-out hover:scale-105 active:scale-95',
  card: 'transition-all duration-200 ease-out hover:shadow-lg',
  link: 'transition-colors duration-150 ease-out',
  input: 'transition-all duration-200 ease-out focus:ring-2 focus:ring-ring',
};

/**
 * Estados de hover predefinidos
 */
export const hoverClasses = {
  // Opacidad
  opacity: 'hover:opacity-80',
  opacityLight: 'hover:opacity-90',
  
  // Escala
  scale: 'hover:scale-105',
  scaleSubtle: 'hover:scale-102',
  scaleLarge: 'hover:scale-110',
  
  // Sombras
  shadow: 'hover:shadow-md',
  shadowLg: 'hover:shadow-lg',
  shadowGlow: 'hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]',
  
  // Fondos
  bgAccent: 'hover:bg-accent',
  bgMuted: 'hover:bg-muted',
  bgPrimary: 'hover:bg-primary/10',
  
  // Bordes
  borderPrimary: 'hover:border-primary',
  borderAccent: 'hover:border-accent',
  
  // Texto
  textPrimary: 'hover:text-primary',
  textAccent: 'hover:text-accent',
  underline: 'hover:underline',
};

/**
 * Hook para obtener clases de animación
 */
export function useAnimations() {
  const getAnimation = useMemo(
    () => (type: keyof typeof animationClasses): string => animationClasses[type],
    []
  );

  const getTransition = useMemo(
    () => (type: keyof typeof transitionClasses): string => transitionClasses[type],
    []
  );

  const getHover = useMemo(
    () => (type: keyof typeof hoverClasses): string => hoverClasses[type],
    []
  );

  /**
   * Combina múltiples clases de animación/transición
   */
  const combineAnimations = useMemo(
    () =>
      (...classes: (keyof typeof animationClasses | keyof typeof transitionClasses | keyof typeof hoverClasses | string)[]): string => {
        return classes
          .map((c) => {
            if (c in animationClasses) return animationClasses[c as keyof typeof animationClasses];
            if (c in transitionClasses) return transitionClasses[c as keyof typeof transitionClasses];
            if (c in hoverClasses) return hoverClasses[c as keyof typeof hoverClasses];
            return c;
          })
          .join(' ');
      },
    []
  );

  /**
   * Genera clases para stagger animation (animación escalonada)
   */
  const getStaggerClass = useMemo(
    () => (index: number, baseDelay: number = 50): string => {
      const delay = index * baseDelay;
      return `animate-fade-in [animation-delay:${delay}ms]`;
    },
    []
  );

  return {
    animationClasses,
    transitionClasses,
    hoverClasses,
    getAnimation,
    getTransition,
    getHover,
    combineAnimations,
    getStaggerClass,
  };
}
