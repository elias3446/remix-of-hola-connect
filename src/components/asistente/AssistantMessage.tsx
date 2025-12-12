import { memo } from 'react';
import { Bot, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { type Message } from '@/hooks/asistente/useAssistant';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AssistantMessageProps {
  message: Message;
  onExecuteAction?: () => void;
  hasPendingAction?: boolean;
}

export const AssistantMessage = memo(function AssistantMessage({ 
  message, 
  onExecuteAction,
  hasPendingAction 
}: AssistantMessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  // Parse markdown-like content
  const renderContent = (content: string) => {
    // Handle code blocks
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(
          <span key={keyIndex++} className="whitespace-pre-wrap">
            {renderInlineFormatting(content.slice(lastIndex, match.index))}
          </span>
        );
      }
      // Add code block
      parts.push(
        <pre 
          key={keyIndex++}
          className="bg-muted/50 rounded-md p-3 my-2 overflow-x-auto text-sm font-mono border border-border"
        >
          <code>{match[2]}</code>
        </pre>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={keyIndex++} className="whitespace-pre-wrap">
          {renderInlineFormatting(content.slice(lastIndex))}
        </span>
      );
    }

    return parts.length > 0 ? parts : content;
  };

  // Handle inline formatting (bold, italic, etc.)
  const renderInlineFormatting = (text: string) => {
    return text
      .split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
      .map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });
  };

  return (
    <div className={cn(
      'flex gap-3',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Message bubble */}
      <div className={cn(
        'flex flex-col max-w-[80%] gap-1',
        isUser ? 'items-end' : 'items-start'
      )}>
        <div className={cn(
          'rounded-2xl px-4 py-2.5 text-sm',
          isUser 
            ? 'bg-primary text-primary-foreground rounded-br-md' 
            : 'bg-muted text-foreground rounded-bl-md'
        )}>
          {isStreaming && !message.content ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-muted-foreground">Pensando...</span>
            </div>
          ) : (
            <div className="space-y-1">
              {renderContent(message.content)}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground px-1">
          {format(message.timestamp, 'HH:mm', { locale: es })}
        </span>

        {/* Action confirmation */}
        {!isUser && hasPendingAction && onExecuteAction && !isStreaming && (
          <div className="flex items-center gap-2 mt-2">
            <Button 
              size="sm" 
              onClick={onExecuteAction}
              className="gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              Confirmar acción
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="gap-1.5"
            >
              <AlertCircle className="w-4 h-4" />
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
