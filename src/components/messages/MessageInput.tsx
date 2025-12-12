/**
 * Input para enviar mensajes con soporte de emojis e imágenes
 */
import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Smile, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CameraCapture } from '@/components/ui/camera-capture';
import { transitionClasses } from '@/hooks/optimizacion';

interface MessageInputProps {
  onSend: (content: string, images?: string[]) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

const EMOJI_CATEGORIES = {
  'Frecuentes': ['😀', '😂', '🥰', '😍', '🤔', '😅', '😊', '👍', '❤️', '🙏'],
  'Caritas': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😛', '🤔', '🤨'],
  'Gestos': ['👍', '👎', '👌', '✌️', '🤞', '🤝', '👏', '🙌', '👐', '🙏'],
  'Objetos': ['❤️', '🔥', '⭐', '✨', '💯', '🎉', '🎊', '🎁', '💐', '🌟'],
};

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Escribe un mensaje...",
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if ((!content.trim() && images.length === 0) || isSending) return;

    setIsSending(true);
    try {
      await onSend(content.trim(), images.length > 0 ? images : undefined);
      setContent('');
      setImages([]);
      textareaRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleImageCapture = (imageUrl: string) => {
    setImages((prev) => [...prev, imageUrl]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t bg-background p-3 space-y-2">
      {/* Preview de imágenes */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <img
                src={img}
                alt={`Imagen ${idx + 1}`}
                className="w-16 h-16 rounded-lg object-cover border"
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input principal */}
      <div className="flex items-end gap-2">
        {/* Botón de emojis */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              disabled={disabled}
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" side="top" align="start">
            <div className="space-y-3">
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category}>
                  <p className="text-xs text-muted-foreground mb-1">{category}</p>
                  <div className="flex flex-wrap gap-1">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="p-1 hover:bg-muted rounded text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Botón de cámara/imagen */}
        <CameraCapture
          onCapture={handleImageCapture}
          buttonText=""
          buttonVariant="ghost"
          buttonClassName="flex-shrink-0 px-2"
          showLimits={false}
        />

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className={cn(
            "flex-1 min-h-[40px] max-h-[120px] resize-none py-2",
            transitionClasses.colors
          )}
          rows={1}
        />

        {/* Botón enviar */}
        <Button
          onClick={handleSend}
          disabled={disabled || isSending || (!content.trim() && images.length === 0)}
          size="icon"
          className={cn(
            "flex-shrink-0",
            transitionClasses.button
          )}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
