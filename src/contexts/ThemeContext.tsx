import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

// Key para localStorage (sincronizada con useUserDataReady)
const THEME_STORAGE_KEY = 'user_cache:theme';
const THEME_TIMESTAMP_KEY = 'user_cache:theme_timestamp';

// Rutas públicas que siempre usan tema claro
const PUBLIC_ROUTES = ['/', '/login', '/forgot-password', '/change-password'];

/**
 * Obtiene el tema del sistema operativo
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resuelve el tema efectivo basado en la preferencia
 */
function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Aplica el tema al documento HTML
 */
function applyThemeToDocument(resolvedTheme: 'light' | 'dark') {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
}

/**
 * Obtiene el tema guardado en localStorage
 */
function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as Theme;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Guarda el tema en localStorage
 */
function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(THEME_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Error storing theme:', error);
  }
}

/**
 * Provider de tema que gestiona el tema de la aplicación
 * 
 * Flujo:
 * 1. Rutas públicas (login, register, etc.) SIEMPRE usan tema claro
 * 2. Para rutas protegidas, usa el tema guardado en localStorage
 * 3. El tema del usuario se sincroniza DESPUÉS del login via ThemeSync
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Estado interno del tema (solo se usa en rutas protegidas)
  const [theme, setThemeState] = useState<Theme>(() => {
    return getStoredTheme() || 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Aplicar tema claro inicialmente (para evitar flash en login)
  useEffect(() => {
    applyThemeToDocument('light');
    setResolvedTheme('light');
    setIsLoading(false);
  }, []);

  // Escuchar cambios del tema del sistema
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newResolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolved);
      applyThemeToDocument(newResolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Función para cambiar el tema
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyThemeToDocument(resolved);
    storeTheme(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de tema
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
}

/**
 * Hook para sincronizar el tema con settings del usuario
 * Debe usarse en componentes que ya tienen acceso a settings
 */
export function useThemeSync(settingsTheme: string | null | undefined) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!settingsTheme) return;
    
    const validTheme = ['light', 'dark', 'system'].includes(settingsTheme) 
      ? settingsTheme as Theme 
      : 'system';
    
    // Solo actualizar si es diferente
    if (validTheme !== theme) {
      setTheme(validTheme);
    }
  }, [settingsTheme, theme, setTheme]);
}
