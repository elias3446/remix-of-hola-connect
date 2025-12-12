import { useState, useRef, useEffect } from 'react';
import { Send, Square, Mic, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AssistantInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function AssistantInput({ onSend, onStop, isLoading, disabled }: AssistantInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border p-4">
      <div className="flex items-end gap-2">
        {/* Attachment button (future feature) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 flex-shrink-0 text-muted-foreground"
              disabled
            >
              <Paperclip className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Adjuntar archivo (próximamente)</TooltipContent>
        </Tooltip>

        {/* Input area */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            disabled={disabled}
            className={cn(
              'min-h-[44px] max-h-[150px] resize-none pr-12',
              'bg-muted/50 border-muted-foreground/20',
              'focus:ring-primary/20 focus:border-primary/50'
            )}
            rows={1}
          />
        </div>

        {/* Voice button (future feature) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 flex-shrink-0 text-muted-foreground"
              disabled
            >
              <Mic className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Entrada por voz (próximamente)</TooltipContent>
        </Tooltip>

        {/* Send/Stop button */}
        {isLoading ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="destructive" 
                size="icon" 
                onClick={onStop}
                className="h-10 w-10 flex-shrink-0"
              >
                <Square className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Detener generación</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                onClick={handleSend}
                disabled={!input.trim() || disabled}
                className="h-10 w-10 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Enviar mensaje</TooltipContent>
          </Tooltip>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Powered by Gemini 2.5 Flash • Shift+Enter para nueva línea
      </p>
    </div>
  );
}
