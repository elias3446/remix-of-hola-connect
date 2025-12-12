/**
 * Tarjeta para crear una nueva publicación
 * Diseño similar a redes sociales con soporte para hashtags y menciones
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { useCreatePublicacion } from '@/hooks/controlador/useCreatePublicacion';
import { useInlineDetector } from '@/hooks/entidades';
import { X, Send, Loader2, ImageIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CameraCapture } from '@/components/ui/camera-capture';
import { InlineSuggestions, insertSuggestion } from './InlineSuggestions';

interface CreatePostCardProps {
  userAvatar?: string | null;
  userName?: string | null;
  userUsername?: string | null;
  userId?: string | null;
  onPostCreated?: () => void;
}

const MAX_IMAGES = 4;
const MAX_CONTENT_LENGTH = 2000;

export function CreatePostCard({ 
  userAvatar, 
  userName,
  userUsername,
  userId,
  onPostCreated
}: CreatePostCardProps) {
  const [contenido, setContenido] = useState('');
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [imagesPreviews, setImagesPreviews] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hook para detectar hashtags y menciones mientras escribe
  const { activeInput, hashtagSuggestions, mentionSuggestions, isActive } = useInlineDetector(
    contenido,
    { currentUserId: userId, enabled: isFocused }
  );

  const { createPublicacion, isSubmitting, isUploadingImages, uploadProgress } = useCreatePublicacion({
    onSuccess: () => {
      setContenido('');
      setImagenes([]);
      setImagesPreviews([]);
      setIsFocused(false);
      setShowSuggestions(false);
      onPostCreated?.();
    },
  });

  // Mostrar sugerencias cuando hay input activo
  useEffect(() => {
    setShowSuggestions(isActive && (hashtagSuggestions.length > 0 || mentionSuggestions.length > 0));
  }, [isActive, hashtagSuggestions.length, mentionSuggestions.length]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CONTENT_LENGTH) {
      setContenido(value);
    }
  }, []);

  // Manejar selección de sugerencia
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    if (!activeInput) return;
    const newContent = insertSuggestion(contenido, suggestion, activeInput.type);
    setContenido(newContent);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  }, [contenido, activeInput]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = MAX_IMAGES - imagenes.length;
    const newFiles = files.slice(0, remainingSlots);

    if (newFiles.length > 0) {
      setImagenes(prev => [...prev, ...newFiles]);
      
      // Crear previews
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagesPreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [imagenes.length]);

  // Handler para imagen capturada desde CameraCapture
  const handleCameraCapture = useCallback((imageUrl: string) => {
    if (imagenes.length >= MAX_IMAGES) return;
    
    // Convertir base64 a File
    fetch(imageUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `captured-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setImagenes(prev => [...prev, file]);
        setImagesPreviews(prev => [...prev, imageUrl]);
      });
  }, [imagenes.length]);

  const removeImage = useCallback((index: number) => {
    setImagenes(prev => prev.filter((_, i) => i !== index));
    setImagesPreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!userId || (!contenido.trim() && imagenes.length === 0)) return;

    await createPublicacion(
      {
        contenido: contenido.trim(),
        imagenes,
        visibilidad: 'publico',
      }, 
      userId,
      {
        name: userName || null,
        avatar: userAvatar || null,
        username: userUsername || null,
      }
    );
  }, [userId, contenido, imagenes, createPublicacion, userName, userAvatar, userUsername]);

  const canSubmit = userId && (contenido.trim() || imagenes.length > 0) && !isSubmitting;

  return (
    <Card className={cn("mb-6", animationClasses.fadeIn)}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {userName?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0" ref={containerRef}>
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={contenido}
                onChange={handleContentChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  // Delay para permitir click en sugerencias
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="¿Qué está pasando? Usa # para hashtags y @ para mencionar"
                className={cn(
                  "min-h-[60px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-sm",
                  "placeholder:text-muted-foreground/60",
                  transitionClasses.colors
                )}
                rows={isFocused || contenido ? 3 : 1}
              />

              {/* Sugerencias inline de hashtags y menciones */}
              {showSuggestions && activeInput && (
                <InlineSuggestions
                  type={activeInput.type}
                  suggestions={activeInput.type === 'hashtag' ? hashtagSuggestions : mentionSuggestions}
                  onSelect={handleSuggestionSelect}
                  className="top-full left-0 mt-1"
                />
              )}
            </div>

            {/* Preview de imágenes - thumbnails compactos */}
            {imagesPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {imagesPreviews.map((preview, index) => (
                  <div 
                    key={index} 
                    className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0"
                  >
                    <img 
                      src={preview} 
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className={cn(
                        "absolute -top-1 -right-1 p-0.5 rounded-full",
                        "bg-destructive text-destructive-foreground",
                        "hover:bg-destructive/90",
                        transitionClasses.colors
                      )}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Progress de subida */}
            {isUploadingImages && uploadProgress && (
              <div className="mt-3">
                <Progress value={uploadProgress.percentage} className="h-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  Subiendo imágenes... {uploadProgress.percentage}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Barra de acciones */}
        <div className={cn(
          "flex items-center justify-between mt-4 pt-3 border-t border-border",
          transitionClasses.colors
        )}>
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={imagenes.length >= MAX_IMAGES || isSubmitting}
              className={cn("gap-2 text-muted-foreground", transitionClasses.button)}
            >
              <ImageIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Galería</span>
            </Button>
            
            <CameraCapture
              onCapture={handleCameraCapture}
              buttonText=""
              buttonVariant="ghost"
              buttonClassName={cn(
                "gap-2 text-muted-foreground h-9 px-3",
                transitionClasses.button
              )}
              showLimits={false}
              maxFileSize={10485760}
              allowedFormats={['jpg', 'jpeg', 'png', 'webp']}
            />
          </div>

          <div className="flex items-center gap-3">
            {contenido.length > 0 && (
              <span className={cn(
                "text-xs",
                contenido.length > MAX_CONTENT_LENGTH * 0.9 
                  ? "text-destructive" 
                  : "text-muted-foreground"
              )}>
                {contenido.length}/{MAX_CONTENT_LENGTH}
              </span>
            )}

            <Button 
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="sm"
              className={cn("gap-2", transitionClasses.button)}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publicar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
