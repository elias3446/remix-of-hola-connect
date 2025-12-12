/**
 * Galería de imágenes para mensajes del chat
 * Permite navegar entre todas las imágenes de la conversación
 */
import { memo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { transitionClasses, animationClasses } from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';

interface ChatImageGalleryProps {
  /** Imágenes del mensaje actual */
  images: string[];
  /** Todas las imágenes de la conversación para navegación global */
  allConversationImages?: string[];
  /** Clase adicional para las imágenes en el mensaje */
  className?: string;
}

export const ChatImageGallery = memo(({ 
  images, 
  allConversationImages,
  className 
}: ChatImageGalleryProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Usar todas las imágenes de la conversación si están disponibles
  const galleryImages = allConversationImages && allConversationImages.length > 0 
    ? allConversationImages 
    : images;

  // Encontrar el offset de las imágenes actuales en la galería completa
  const findGlobalIndex = useCallback((localIndex: number): number => {
    if (!allConversationImages || allConversationImages.length === 0) {
      return localIndex;
    }
    
    // Buscar la posición donde empiezan nuestras imágenes en la galería global
    // Comparamos la secuencia completa de imágenes del mensaje
    for (let startIdx = 0; startIdx <= allConversationImages.length - images.length; startIdx++) {
      let match = true;
      for (let i = 0; i < images.length; i++) {
        if (allConversationImages[startIdx + i] !== images[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        return startIdx + localIndex;
      }
    }
    
    // Fallback: buscar la imagen específica
    const directIndex = allConversationImages.indexOf(images[localIndex]);
    return directIndex >= 0 ? directIndex : localIndex;
  }, [allConversationImages, images]);

  const openImage = useCallback((localIndex: number) => {
    const globalIndex = findGlobalIndex(localIndex);
    setCurrentIndex(globalIndex);
    setIsDialogOpen(true);
  }, [findGlobalIndex]);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => 
      prev === 0 ? galleryImages.length - 1 : prev - 1
    );
  }, [galleryImages.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => 
      prev === galleryImages.length - 1 ? 0 : prev + 1
    );
  }, [galleryImages.length]);

  const handleDownload = useCallback(async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `imagen-chat-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando imagen:", error);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') closeDialog();
  }, [goToPrevious, goToNext, closeDialog]);

  if (!images || images.length === 0) return null;

  return (
    <>
      {/* Thumbnails en el mensaje */}
      <div className={cn("grid gap-1", className)}>
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`Imagen ${idx + 1}`}
            className={cn(
              "rounded-lg max-w-full max-h-60 object-cover cursor-pointer",
              "hover:opacity-90",
              transitionClasses.opacity
            )}
            onClick={() => openImage(idx)}
          />
        ))}
      </div>

      {/* Dialog de galería */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent 
          className="max-w-5xl p-0 bg-black/95 border-none"
          onKeyDown={handleKeyDown}
        >
          <div className="relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-white">
                  {currentIndex + 1} de {galleryImages.length} {galleryImages.length > 1 ? 'imágenes' : 'imagen'}
                </DialogTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={closeDialog}
                  className={cn("text-white hover:bg-white/20", transitionClasses.fast)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Imagen principal */}
            <div className={cn(
              "relative flex items-center justify-center min-h-[70vh] p-16",
              animationClasses.scaleIn
            )}>
              <img
                src={galleryImages[currentIndex]}
                alt={`Imagen ${currentIndex + 1}`}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>

            {/* Botones de navegación */}
            {galleryImages.length > 1 && (
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={goToPrevious}
                  className={cn(
                    "pointer-events-auto h-12 w-12 rounded-full bg-white/90 hover:bg-white",
                    transitionClasses.button
                  )}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={goToNext}
                  className={cn(
                    "pointer-events-auto h-12 w-12 rounded-full bg-white/90 hover:bg-white",
                    transitionClasses.button
                  )}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            )}

            {/* Footer con descarga y thumbnails */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex flex-col items-center gap-3">
                {/* Thumbnails de navegación */}
                {galleryImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto max-w-full pb-2">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={cn(
                          "flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2",
                          idx === currentIndex 
                            ? "border-primary ring-2 ring-primary/50" 
                            : "border-transparent opacity-60 hover:opacity-100",
                          transitionClasses.opacity
                        )}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Botón de descarga */}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleDownload(galleryImages[currentIndex])}
                  className={transitionClasses.button}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Imagen
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

ChatImageGallery.displayName = 'ChatImageGallery';
