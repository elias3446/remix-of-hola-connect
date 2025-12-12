/**
 * Índice de hooks para el sistema de mensajería
 * 
 * Exporta todos los hooks y tipos necesarios para implementar
 * funcionalidades similares a WhatsApp.
 */

// Tipos
export * from './types';

// Hook de presencia online/offline
export { useUserPresence } from './useUserPresence';

// Hook de conversaciones
export { useConversations } from './useConversations';

// Hook de mensajes
export { useMessages } from './useMessages';

// Hook de gestión de grupos
export { useGroupManagement } from './useGroupManagement';

// Hook de usuarios silenciados
export { useMutedUsers } from './useMutedUsers';

// Hook de conteo de mensajes no leídos
export { useMessageCount } from './useMessageCount';
