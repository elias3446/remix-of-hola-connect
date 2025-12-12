import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para persistencia de sesión de usuario.
 * Ahora es un wrapper del contexto de autenticación global.
 * 
 * FUNCIONAMIENTO:
 * 1. Al cargar la app, verifica si existe una sesión almacenada en localStorage
 * 2. Escucha eventos de autenticación (login, logout, token refresh)
 * 3. Mantiene la sesión sincronizada automáticamente
 * 4. La sesión persiste incluso si:
 *    - Se reinicia el navegador
 *    - Se cierra la pestaña
 *    - Se reinicia o apaga el dispositivo
 */
export function useSessionPersistence() {
  return useAuth();
}
