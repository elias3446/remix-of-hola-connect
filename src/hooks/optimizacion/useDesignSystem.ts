import { useMemo } from 'react';

/**
 * Mapa de colores hardcodeados a tokens del design system
 */
const COLOR_TOKEN_MAP: Record<string, string> = {
  // Blues -> Primary
  'text-blue-500': 'text-primary',
  'text-blue-600': 'text-primary',
  'text-blue-700': 'text-primary',
  'bg-blue-500': 'bg-primary',
  'bg-blue-600': 'bg-primary',
  'bg-blue-700': 'bg-primary',
  'border-blue-500': 'border-primary',
  'border-blue-600': 'border-primary',
  'hover:bg-blue-500': 'hover:bg-primary',
  'hover:bg-blue-600': 'hover:bg-primary',
  'hover:text-blue-500': 'hover:text-primary',
  'focus:ring-blue-500': 'focus:ring-ring',
  
  // Grays -> Muted/Secondary
  'text-gray-500': 'text-muted-foreground',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-400': 'text-muted-foreground',
  'text-gray-700': 'text-foreground',
  'text-gray-800': 'text-foreground',
  'text-gray-900': 'text-foreground',
  'bg-gray-100': 'bg-muted',
  'bg-gray-200': 'bg-muted',
  'bg-gray-50': 'bg-secondary',
  'bg-gray-800': 'bg-card',
  'bg-gray-900': 'bg-background',
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border',
  
  // Whites/Blacks
  'text-white': 'text-primary-foreground',
  'text-black': 'text-foreground',
  'bg-white': 'bg-card',
  'bg-black': 'bg-background',
  
  // Reds -> Destructive
  'text-red-500': 'text-destructive',
  'text-red-600': 'text-destructive',
  'bg-red-500': 'bg-destructive',
  'bg-red-600': 'bg-destructive',
  'border-red-500': 'border-destructive',
  
  // Greens -> Success (using accent as fallback)
  'text-green-500': 'text-accent',
  'text-green-600': 'text-accent',
  'bg-green-500': 'bg-accent',
  'bg-green-600': 'bg-accent',
};

/**
 * Hook para convertir clases de colores hardcodeados a tokens del design system
 */
export function useDesignSystem() {
  /**
   * Convierte una cadena de clases con colores hardcodeados a tokens del sistema
   */
  const convertColors = useMemo(
    () => (classString: string): string => {
      if (!classString) return '';
      
      let result = classString;
      
      Object.entries(COLOR_TOKEN_MAP).forEach(([hardcoded, token]) => {
        const regex = new RegExp(`\\b${hardcoded}\\b`, 'g');
        result = result.replace(regex, token);
      });
      
      return result;
    },
    []
  );

  /**
   * Detecta colores hardcodeados en una cadena de clases
   */
  const detectHardcodedColors = useMemo(
    () => (classString: string): string[] => {
      if (!classString) return [];
      
      const hardcodedPatterns = [
        /\b(text|bg|border|ring|shadow)-(red|blue|green|yellow|purple|pink|indigo|orange|teal|cyan|gray|slate|zinc|neutral|stone)-\d{2,3}\b/g,
        /\bhover:(text|bg|border)-(red|blue|green|yellow|purple|pink|indigo|orange|teal|cyan|gray|slate|zinc|neutral|stone)-\d{2,3}\b/g,
        /\bfocus:(ring|border)-(red|blue|green|yellow|purple|pink|indigo|orange|teal|cyan|gray|slate|zinc|neutral|stone)-\d{2,3}\b/g,
      ];
      
      const matches: string[] = [];
      hardcodedPatterns.forEach((pattern) => {
        const found = classString.match(pattern);
        if (found) matches.push(...found);
      });
      
      return [...new Set(matches)];
    },
    []
  );

  /**
   * Obtiene las clases base del design system para diferentes elementos
   */
  const getSystemClasses = useMemo(
    () => ({
      // Contenedores
      card: 'bg-card text-card-foreground border border-border rounded-lg shadow-sm',
      cardHover: 'bg-card text-card-foreground border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow',
      
      // Textos
      heading: 'text-foreground font-semibold',
      body: 'text-foreground',
      muted: 'text-muted-foreground',
      link: 'text-primary hover:text-primary/80 transition-colors',
      
      // Botones
      buttonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
      buttonSecondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors',
      buttonDestructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors',
      buttonOutline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors',
      buttonGhost: 'hover:bg-accent hover:text-accent-foreground transition-colors',
      
      // Inputs
      input: 'bg-input border border-input text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring transition-colors',
      
      // Estados
      success: 'text-accent',
      error: 'text-destructive',
      warning: 'text-orange-500', // Podría agregarse al sistema
      info: 'text-primary',
    }),
    []
  );

  return {
    convertColors,
    detectHardcodedColors,
    getSystemClasses,
    colorTokenMap: COLOR_TOKEN_MAP,
  };
}
