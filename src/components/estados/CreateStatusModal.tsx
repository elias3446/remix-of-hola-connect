/**
 * Modal para crear un nuevo estado
 * Las imágenes se almacenan localmente hasta publicar, luego se suben a Cloudinary
 */
import { useState } from 'react';
import { MessageCircle, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CameraCapture } from '@/components/ui/camera-capture';
import { cn } from '@/lib/utils';
import { 
  transitionClasses, 
  animationClasses 
} from '@/hooks/optimizacion';
import { useCloudinaryUpload } from '@/hooks/controlador/useCloudinaryUpload';
import { ReporteEvidencia } from '@/components/ui/ReporteEvidencia';
import type { CreateEstadoOptions, EstadoVisibilidad } from '@/hooks/estados/types';

/** Imagen local antes de subir a Cloudinary */
interface LocalImage {
  dataUrl: string;
  previewUrl: string;
}

type StatusSource = 'mensajes' | 'social';

interface CreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (options: CreateEstadoOptions) => Promise<unknown>;
  isSubmitting?: boolean;
  /** Origen del modal para determinar la opción de compartir */
  source?: StatusSource;
}

export function CreateStatusModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  source = 'social',
}: CreateStatusModalProps) {
  const [contenido, setContenido] = useState('');
  // Imágenes locales (data URLs) antes de publicar
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [visibilidad, setVisibilidad] = useState<EstadoVisibilidad>('todos');
  const [compartirOtro, setCompartirOtro] = useState(false);

  const { uploadFromDataUrl, isUploading } = useCloudinaryUpload();

  // Capturar imagen localmente (no subir aún a Cloudinary)
  const handleImageCapture = (imageDataUrl: string) => {
    setLocalImages(prev => [...prev, {
      dataUrl: imageDataUrl,
      previewUrl: imageDataUrl,
    }]);
  };

  // Remover imagen local
  const removeImage = (index: number) => {
    setLocalImages(prev => prev.filter((_, i) => i !== index));
  };

  // Obtener URLs de preview para mostrar en ReporteEvidencia
  const previewUrls = localImages.map(img => img.previewUrl);

  const handleSubmit = async () => {
    if (!contenido.trim() && localImages.length === 0) return;

    // Subir imágenes a Cloudinary al momento de publicar
    const uploadedUrls: string[] = [];
    for (const img of localImages) {
      try {
        const result = await uploadFromDataUrl(img.dataUrl, {
          folder: 'estados',
          tags: ['estado', 'status'],
        });
        uploadedUrls.push(result.secure_url);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }

    // Determinar compartir según origen
    const compartido_en_mensajes = source === 'social' ? compartirOtro : true;
    const compartido_en_social = source === 'mensajes' ? compartirOtro : true;

    await onSubmit({
      contenido: contenido.trim() || undefined,
      imagenes: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      visibilidad,
      compartido_en_mensajes,
      compartido_en_social,
    });

    // Reset form
    setContenido('');
    setLocalImages([]);
    setVisibilidad('todos');
    setCompartirOtro(false);
    onClose();
  };

  const isValid = contenido.trim().length > 0 || localImages.length > 0;

  // Texto dinámico según origen
  const shareLabel = source === 'mensajes' 
    ? 'Compartir también en Red Social' 
    : 'Compartir también en Mensajes';
  const ShareIcon = source === 'mensajes' ? Share2 : MessageCircle;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(
        "w-[95vw] max-w-lg p-0 flex flex-col",
        "max-h-[90vh] sm:max-h-[85vh]",
        animationClasses.fadeIn
      )}>
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 shrink-0">
          <DialogTitle className="text-base sm:text-lg font-semibold">Crear Estado</DialogTitle>
          <DialogDescription className="sr-only">
            Crea un nuevo estado que será visible por 24 horas
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-4 sm:space-y-5">
            {/* Contenido */}
            <div className="space-y-2">
              <Label htmlFor="contenido" className="text-sm font-medium">Contenido</Label>
              <Textarea
                id="contenido"
                placeholder="Escribe algo..."
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                className={cn(
                  "min-h-[80px] sm:min-h-[100px] resize-y",
                  "border-border focus:border-primary focus:ring-1 focus:ring-primary",
                  "text-sm sm:text-base"
                )}
                maxLength={500}
              />
            </div>

            {/* Imágenes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Imágenes {previewUrls.length > 0 && `(${previewUrls.length})`}
              </Label>
              
              {/* Galería de imágenes usando ReporteEvidencia */}
              {previewUrls.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden mb-2">
                  <ReporteEvidencia 
                    imagenes={previewUrls} 
                    compact 
                    onRemove={removeImage}
                  />
                </div>
              )}

              {/* Botón de captura - estilo limpio como la referencia */}
              <div className="w-full">
                <CameraCapture
                  onCapture={handleImageCapture}
                  buttonText="Capturar/Subir Imagen"
                  buttonVariant="outline"
                  buttonClassName="w-full h-10 sm:h-11 justify-center text-sm sm:text-base"
                  maxFileSize={10485760}
                  allowedFormats={['jpg', 'png', 'jpeg', 'gif', 'webp']}
                  showLimits={true}
                />
              </div>
            </div>

            {/* Visibilidad */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-sm font-medium">Visibilidad</Label>
              <RadioGroup
                value={visibilidad}
                onValueChange={(value) => setVisibilidad(value as EstadoVisibilidad)}
                className="space-y-1.5 sm:space-y-2"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="todos" id="vis-todos" className="h-4 w-4 sm:h-5 sm:w-5" />
                  <Label 
                    htmlFor="vis-todos" 
                    className="text-sm sm:text-base font-normal cursor-pointer"
                  >
                    Todos
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="contactos" id="vis-contactos" className="h-4 w-4 sm:h-5 sm:w-5" />
                  <Label 
                    htmlFor="vis-contactos" 
                    className="text-sm sm:text-base font-normal cursor-pointer"
                  >
                    Solo Contactos
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="privado" id="vis-privado" className="h-4 w-4 sm:h-5 sm:w-5" />
                  <Label 
                    htmlFor="vis-privado" 
                    className="text-sm sm:text-base font-normal cursor-pointer"
                  >
                    Privado
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Opción de compartir */}
            <div className={cn(
              "flex items-center justify-between",
              "p-3 sm:p-4 rounded-lg",
              "bg-muted/50 border border-border"
            )}>
              <div className="flex items-center gap-2">
                <ShareIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-medium">{shareLabel}</span>
              </div>
              <Switch
                checked={compartirOtro}
                onCheckedChange={setCompartirOtro}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Footer con botones */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-background shrink-0 space-y-3">
          <div className="flex gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={cn(
                "flex-1 h-10 sm:h-11 text-sm sm:text-base",
                transitionClasses.button
              )}
              disabled={isSubmitting || isUploading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className={cn(
                "flex-1 h-10 sm:h-11 text-sm sm:text-base",
                transitionClasses.button
              )}
              disabled={!isValid || isSubmitting || isUploading}
            >
              {isSubmitting || isUploading ? 'Publicando...' : 'Publicar Estado'}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Tu estado será visible por 24 horas
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
