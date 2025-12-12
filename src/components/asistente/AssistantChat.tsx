import { useState, useRef, useEffect, useCallback } from 'react';
import { useAssistant, type AssistantContext } from '@/hooks/asistente/useAssistant';
import { useAssistantActions } from '@/hooks/asistente/useAssistantActions';
import { AssistantMessage } from './AssistantMessage';
import { AssistantInput } from './AssistantInput';
import { AssistantHeader } from './AssistantHeader';
import { AssistantSuggestions } from './AssistantSuggestions';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AssistantChatProps {
  className?: string;
  defaultContext?: AssistantContext;
  onClose?: () => void;
  embedded?: boolean;
}

export function AssistantChat({ 
  className, 
  defaultContext, 
  onClose,
  embedded = false 
}: AssistantChatProps) {
  const { messages, isLoading, sendMessage, clearMessages, stopGeneration } = useAssistant();
  const { parseAIResponse, executeAction, getSystemContext } = useAssistantActions();
  const [context, setContext] = useState<AssistantContext>(defaultContext || {});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingAction, setPendingAction] = useState<ReturnType<typeof parseAIResponse>>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle send with context
  const handleSend = useCallback(async (content: string) => {
    await sendMessage(content, {
      ...context,
      additionalData: getSystemContext(),
    });
  }, [sendMessage, context, getSystemContext]);

  // Handle action execution from AI response
  const handleExecuteAction = useCallback(async () => {
    if (!pendingAction) return;

    const result = await executeAction(pendingAction);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setPendingAction(null);
  }, [pendingAction, executeAction]);

  // Parse last AI message for actions
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && !lastMessage.isStreaming) {
      const action = parseAIResponse(lastMessage.content);
      if (action?.requiresConfirmation) {
        setPendingAction(action);
      } else if (action) {
        // Auto-execute non-confirmation actions
        executeAction(action).then(result => {
          if (result.success) {
            toast.success(result.message);
          }
        });
      }
    }
  }, [messages, parseAIResponse, executeAction]);

  // Quick suggestions based on context
  const suggestions = [
    { text: '📊 Muéstrame el dashboard', action: 'dashboard' },
    { text: '📋 Lista de reportes pendientes', action: 'list_reportes' },
    { text: '👥 Resumen de usuarios', action: 'analyze_usuarios' },
    { text: '🏷️ Categorías activas', action: 'list_categorias' },
  ];

  const handleSuggestion = (suggestion: { text: string; action: string }) => {
    const contextMap: Record<string, AssistantContext> = {
      dashboard: { action: 'dashboard' },
      list_reportes: { action: 'list', entityType: 'reporte' },
      analyze_usuarios: { action: 'analyze', entityType: 'usuario' },
      list_categorias: { action: 'list', entityType: 'categoria' },
    };
    setContext(contextMap[suggestion.action] || {});
    handleSend(suggestion.text);
  };

  return (
    <Card className={cn(
      'flex flex-col bg-card border-border',
      embedded ? 'h-full rounded-none border-0' : 'h-[600px] max-h-[80vh]',
      className
    )}>
      <AssistantHeader 
        onClear={clearMessages} 
        onClose={onClose}
        messagesCount={messages.length}
      />

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-8">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Asistente UniAlerta UCE
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Soy tu asistente integral. Puedo ayudarte a gestionar reportes, usuarios, 
                categorías, generar análisis y mucho más.
              </p>
            </div>
            <AssistantSuggestions 
              suggestions={suggestions} 
              onSelect={handleSuggestion} 
            />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <AssistantMessage 
                key={message.id} 
                message={message}
                onExecuteAction={pendingAction ? handleExecuteAction : undefined}
                hasPendingAction={!!pendingAction}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <AssistantInput
        onSend={handleSend}
        onStop={stopGeneration}
        isLoading={isLoading}
        disabled={!messages.length && isLoading}
      />
    </Card>
  );
}
