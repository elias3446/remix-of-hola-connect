/**
 * Página de Mensajes
 * Sistema de mensajería estilo WhatsApp
 */
import { MessagesLayout } from '@/components/messages';

export default function Mensajes() {
  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="h-full">
        <MessagesLayout />
      </div>
    </div>
  );
}
