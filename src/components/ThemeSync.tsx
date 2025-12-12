import { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserDataReady } from '@/hooks/entidades/useUserDataReady';

/**
 * Componente que sincroniza el tema con la configuración del usuario
 * Solo sincroniza UNA VEZ al cargar los settings iniciales
 * No sobrescribe cambios manuales del usuario durante la sesión
 */
export function ThemeSync() {
  const { settings, isReady } = useUserDataReady();
  const { setTheme } = useTheme();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    // Solo sincronizar una vez cuando los settings estén listos
    if (!isReady || !settings?.theme || hasSyncedRef.current) return;

    const validThemes = ['light', 'dark', 'system'];
    const settingsTheme = settings.theme;

    if (validThemes.includes(settingsTheme)) {
      setTheme(settingsTheme as 'light' | 'dark' | 'system');
      hasSyncedRef.current = true;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[ThemeSync] Initial theme synced from settings:', settingsTheme);
      }
    }
  }, [isReady, settings?.theme, setTheme]);

  // Este componente no renderiza nada
  return null;
}
