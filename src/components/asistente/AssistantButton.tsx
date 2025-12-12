import { useState } from 'react';
import { Bot, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AssistantChat } from './AssistantChat';
import { cn } from '@/lib/utils';

interface AssistantButtonProps {
  className?: string;
}

export function AssistantButton({ className }: AssistantButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className={cn(
            'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
            'bg-primary hover:bg-primary/90 text-primary-foreground',
            'transition-transform hover:scale-105 active:scale-95',
            className
          )}
        >
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-primary animate-pulse" />
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[450px] p-0 flex flex-col"
      >
        <AssistantChat 
          embedded 
          onClose={() => setIsOpen(false)} 
        />
      </SheetContent>
    </Sheet>
  );
}
