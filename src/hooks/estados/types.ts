/**
 * Tipos para el sistema de Estados (Stories)
 */
import type { Database } from '@/integrations/supabase/types';

// Tipos base de la base de datos
export type Estado = Database['public']['Tables']['estados']['Row'];
export type EstadoInsert = Database['public']['Tables']['estados']['Insert'];
export type EstadoReaccion = Database['public']['Tables']['estado_reacciones']['Row'];
export type EstadoVista = Database['public']['Tables']['estado_vistas']['Row'];

// Tipo de visibilidad
export type EstadoVisibilidad = 'todos' | 'contactos' | 'privado';

// Tipo de contenido
export type EstadoTipo = 'texto' | 'imagen' | 'mixto';

// Estado extendido con información del usuario
export interface EstadoExtendido extends Estado {
  user?: {
    id: string;
    name: string | null;
    avatar: string | null;
    username: string | null;
  };
  /** Autor original de la publicación compartida */
  original_author?: {
    id: string;
    name: string | null;
    avatar: string | null;
    username: string | null;
  } | null;
  vistas_count?: number;
  reacciones_count?: number;
  mis_reacciones?: EstadoReaccion[];
  is_viewed?: boolean;
}

// Grupo de estados por usuario
export interface UserEstadoGroup {
  user_id: string;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
    username: string | null;
  };
  estados: EstadoExtendido[];
  has_unviewed: boolean;
  total_count: number;
  latest_created_at: string;
}

// Vista de estado para registro
export interface EstadoVistaRecord {
  estado_id: string;
  user_id: string;
}

// Reacción a estado
export interface EstadoReaccionInput {
  estado_id: string;
  emoji: string;
}

// Opciones para crear estado
export interface CreateEstadoOptions {
  contenido?: string;
  imagenes?: string[];
  visibilidad: EstadoVisibilidad;
  compartido_en_mensajes?: boolean;
  compartido_en_social?: boolean;
  tipo?: EstadoTipo;
  /** ID de la publicación si se comparte un feed como estado */
  publicacion_id?: string;
}

// Opciones para compartir estado
export interface ShareEstadoOptions {
  estado_id: string;
  share_type: 'estado' | 'mensaje' | 'externo';
  destinatario_id?: string; // Para compartir por mensaje
  plataforma?: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp'; // Para compartir externo
}

// Estado del visor de estados
export interface StatusViewerState {
  isOpen: boolean;
  currentUserIndex: number;
  currentStatusIndex: number;
  isPaused: boolean;
  progress: number;
}

// Configuración del visor
export interface StatusViewerConfig {
  autoPlayDuration: number; // Duración por estado en ms (default 5000)
  showProgress: boolean;
  allowReactions: boolean;
  allowShare: boolean;
}

// Resultado de compartir
export interface ShareResult {
  success: boolean;
  message: string;
  share_url?: string;
}

// Estadísticas de estado
export interface EstadoStats {
  total_vistas: number;
  unique_vistas: number;
  reacciones_by_emoji: Record<string, number>;
  total_reacciones: number;
}

// Filtro para estados
export type EstadoFilter = 'all' | 'mine' | 'contacts' | 'unviewed';
