import { Bot, Trash2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AssistantHeaderProps {
  onClear: () => void;
  onClose?: () => void;
  messagesCount: number;
}

export function AssistantHeader({ onClear, onClose, messagesCount }: AssistantHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-1.5">
            Asistente IA
            <Sparkles className="w-4 h-4 text-amber-500" />
          </h2>
          <p className="text-xs text-muted-foreground">
            Gemini 2.5 Flash • En línea
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {messagesCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClear}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limpiar conversación</TooltipContent>
          </Tooltip>
        )}
        {onClose && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cerrar</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
