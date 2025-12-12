/**
 * Tipos para el sistema de mensajería estilo WhatsApp
 */
import type { Database } from '@/integrations/supabase/types';

// Tipos base de la base de datos
export type Conversacion = Database['public']['Tables']['conversaciones']['Row'];
export type Mensaje = Database['public']['Tables']['mensajes']['Row'];
export type Participante = Database['public']['Tables']['participantes_conversacion']['Row'];
export type MensajeReaccion = Database['public']['Tables']['mensaje_reacciones']['Row'];
export type MessageReceipt = Database['public']['Tables']['message_receipts']['Row'];
export type ConversationRole = Database['public']['Enums']['conversation_role'];

// Estado de entrega del mensaje
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// Mensaje extendido con información adicional
export interface MensajeExtendido extends Mensaje {
  sender?: {
    id: string;
    name: string | null;
    avatar: string | null;
    username: string | null;
  };
  reactions?: MensajeReaccion[];
  status?: MessageStatus;
  isEdited?: boolean;
  isDeleted?: boolean;
}

// Conversación extendida con último mensaje y participantes
export interface ConversacionExtendida extends Conversacion {
  participantes?: ParticipanteExtendido[];
  ultimo_mensaje?: MensajeExtendido | null;
  unread_count?: number;
  is_muted?: boolean;
  other_participant?: {
    id: string;
    name: string | null;
    avatar: string | null;
    username: string | null;
    is_online?: boolean;
  };
}

// Participante con información del perfil
export interface ParticipanteExtendido extends Participante {
  profile?: {
    id: string;
    name: string | null;
    avatar: string | null;
    username: string | null;
    estado?: string | null;
  };
  is_online?: boolean;
}

// Estado de presencia del usuario
export interface UserPresence {
  user_id: string;
  profile_id: string;
  is_online: boolean;
  last_seen?: string;
}

// Opciones para crear grupo
export interface CreateGroupOptions {
  nombre: string;
  participantes: string[]; // array de profile_ids
  imagen?: string;
}

// Opciones para enviar mensaje
export interface SendMessageOptions {
  conversacion_id: string;
  contenido: string;
  imagenes?: string[];
  shared_post?: Record<string, unknown>;
}

// Opciones para editar mensaje
export interface EditMessageOptions {
  mensaje_id: string;
  contenido: string;
}

// Filtro de conversaciones
export type ConversationFilter = 'all' | 'groups' | 'individual' | 'unread';

// Tabs del sistema de mensajes
export type MessagesTab = 'todos' | 'grupos' | 'estados';

// Configuración de notificaciones silenciadas
export interface MuteConfig {
  user_id: string;
  muted_until?: string; // ISO date or null for permanent
}
