import { AssistantChat } from './AssistantChat';
import { type AssistantContext } from '@/hooks/asistente/useAssistant';

interface AssistantPanelProps {
  context?: AssistantContext;
  className?: string;
}

/**
 * Panel de asistente para embeber en páginas específicas
 * Útil para contexto específico de módulos
 */
export function AssistantPanel({ context, className }: AssistantPanelProps) {
  return (
    <AssistantChat 
      defaultContext={context}
      className={className}
    />
  );
}
