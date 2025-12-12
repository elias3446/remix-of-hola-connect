import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon, Download, ZoomIn, ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState, useCallback, useMemo, memo } from "react";
import {
  useLazyLoad,
  useAnimations,
  transitionClasses,
  hoverClasses,
  skeletonClasses,
} from "@/hooks/optimizacion";

interface ReporteEvidenciaProps {
  imagenes?: string[];
  /** Modo compacto para uso en modales */
  compact?: boolean;
  /** Modo avatar para mostrar una sola imagen circular clickeable */
  avatarMode?: boolean;
  /** Tamaño del avatar (solo aplica en avatarMode) */
  avatarSize?: 'sm' | 'md' | 'lg' | 'xl';
  /** Callback para remover una imagen (solo en modo edición) */
  onRemove?: (index: number) => void;
}

// Componente memoizado para cada imagen individual
const ImagenItem = memo(({ 
  imagen, 
  index, 
  isSelected, 
  onToggleSelection, 
  onOpenImage, 
  onDownload,
  onRemove,
  staggerClass,
  compact,
}: {
  imagen: string;
  index: number;
  isSelected: boolean;
  onToggleSelection: (index: number) => void;
  onOpenImage: (index: number) => void;
  onDownload: (imageUrl: string, index: number) => void;
  onRemove?: (index: number) => void;
  staggerClass: string;
  compact?: boolean;
}) => {
  const { elementRef, isVisible, hasLoaded } = useLazyLoad(0.1, '50px');

  return (
    <div 
      ref={elementRef}
      className={`relative group rounded-lg overflow-hidden border bg-muted ${transitionClasses.card} ${staggerClass}`}
    >
      {/* Checkbox de selección - oculto en modo compacto */}
      {!compact && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(index)}
            className="bg-white border-2 border-white shadow-lg data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>
      )}
      
      {hasLoaded ? (
        <img
          src={imagen}
          alt={`Evidencia ${index + 1}`}
          className={`w-full ${compact ? 'h-28' : 'h-48'} object-cover ${transitionClasses.opacity}`}
          loading="lazy"
        />
      ) : (
        <div className={`${skeletonClasses.imageRect} w-full ${compact ? 'h-28' : 'h-48'}`} />
      )}
      
      <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 ${transitionClasses.opacity} flex flex-col items-center justify-center gap-2`}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onOpenImage(index)}
          className={`${compact ? 'h-7 text-xs px-2' : 'w-32'} ${transitionClasses.button}`}
        >
          <ZoomIn className={compact ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
          Ver
        </Button>
        {onRemove ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => onRemove(index)}
            className={`${compact ? 'h-7 text-xs px-2' : 'w-32'} ${transitionClasses.button}`}
          >
            <Trash2 className={compact ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
            Quitar
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onDownload(imagen, index)}
            className={`${compact ? 'h-7 text-xs px-2' : 'w-32'} ${transitionClasses.button}`}
          >
            <Download className={compact ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
            Descargar
          </Button>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
        <p className={`text-white font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>Imagen {index + 1}</p>
      </div>
    </div>
  );
});

ImagenItem.displayName = 'ImagenItem';

export const ReporteEvidencia = memo(({ imagenes, compact, avatarMode, avatarSize = 'lg', onRemove }: ReporteEvidenciaProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  
  const { getStaggerClass, combineAnimations } = useAnimations();

  const openImage = useCallback((index: number) => {
    setSelectedImageIndex(index);
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedImageIndex(null);
  }, []);

  const goToPrevious = useCallback(() => {
    if (selectedImageIndex !== null && imagenes) {
      setSelectedImageIndex(selectedImageIndex === 0 ? imagenes.length - 1 : selectedImageIndex - 1);
    }
  }, [selectedImageIndex, imagenes]);

  const goToNext = useCallback(() => {
    if (selectedImageIndex !== null && imagenes) {
      setSelectedImageIndex(selectedImageIndex === imagenes.length - 1 ? 0 : selectedImageIndex + 1);
    }
  }, [selectedImageIndex, imagenes]);

  const toggleImageSelection = useCallback((index: number) => {
    setSelectedImages(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedImages.length === imagenes?.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(imagenes?.map((_, index) => index) || []);
    }
  }, [selectedImages.length, imagenes]);

  const handleDownload = useCallback(async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `evidencia-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando imagen:", error);
    }
  }, []);

  const handleBulkDownload = useCallback(async () => {
    if (!imagenes || selectedImages.length === 0) {
      toast.error("Selecciona al menos una imagen para descargar");
      return;
    }

    toast.info(`Descargando ${selectedImages.length} imagen${selectedImages.length > 1 ? 'es' : ''}...`);

    for (const index of selectedImages) {
      await handleDownload(imagenes[index], index);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    toast.success(`${selectedImages.length} imagen${selectedImages.length > 1 ? 'es' : ''} descargada${selectedImages.length > 1 ? 's' : ''}`);
    setSelectedImages([]);
  }, [imagenes, selectedImages, handleDownload]);

  // Memoizar la selección de imágenes para evitar re-renders
  const selectedImagesSet = useMemo(() => new Set(selectedImages), [selectedImages]);

  // Clases de tamaño para avatarMode
  const avatarSizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
    xl: 'h-32 w-32',
  };

  // Vista vacía - diferente para modo compacto/avatar
  if (!imagenes || imagenes.length === 0) {
    if (compact || avatarMode) {
      return null;
    }
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Evidencia Fotográfica
          </CardTitle>
          <CardDescription>
            Imágenes adjuntas al reporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No hay imágenes adjuntas a este reporte</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Modo avatar - imagen circular clickeable
  if (avatarMode && imagenes.length === 1) {
    return (
      <>
        <button
          type="button"
          onClick={() => openImage(0)}
          className={`${avatarSizeClasses[avatarSize]} rounded-full overflow-hidden border-4 border-background shadow-lg cursor-pointer group relative ${transitionClasses.normal}`}
        >
          <img
            src={imagenes[0]}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 ${transitionClasses.opacity} flex items-center justify-center`}>
            <ZoomIn className="h-6 w-6 text-white" />
          </div>
        </button>

        {/* Dialog para ver imagen grande */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl p-0">
            <div className="relative bg-black rounded-lg">
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-white">Avatar</DialogTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={closeDialog}
                    className={`text-white hover:bg-white/20 ${transitionClasses.fast}`}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="relative flex items-center justify-center min-h-[50vh] p-16 animate-scale-in">
                <img
                  src={imagenes[0]}
                  alt="Avatar"
                  className="max-w-full max-h-[50vh] object-contain rounded-lg"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleDownload(imagenes[0], 0)}
                    className={transitionClasses.button}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Modo compacto para uso en modales
  if (compact) {
    return (
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {imagenes.map((imagen, index) => (
            <ImagenItem
              key={index}
              imagen={imagen}
              index={index}
              isSelected={false}
              onToggleSelection={() => {}}
              onOpenImage={openImage}
              onDownload={handleDownload}
              onRemove={onRemove}
              staggerClass={getStaggerClass(index, 75)}
              compact
            />
          ))}
        </div>

        {/* Carousel Dialog para modo compacto */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl p-0">
            <div className="relative bg-black rounded-lg">
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-white">
                    Imagen {selectedImageIndex !== null ? selectedImageIndex + 1 : 0} de {imagenes.length}
                  </DialogTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={closeDialog}
                    className={`text-white hover:bg-white/20 ${transitionClasses.fast}`}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              {selectedImageIndex !== null && (
                <div className="relative flex items-center justify-center min-h-[60vh] p-16 animate-scale-in">
                  <img
                    src={imagenes[selectedImageIndex]}
                    alt={`Imagen ${selectedImageIndex + 1}`}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                </div>
              )}
              {imagenes.length > 1 && (
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={goToPrevious}
                    className={`pointer-events-auto h-10 w-10 rounded-full bg-white/90 hover:bg-white ${transitionClasses.button}`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={goToNext}
                    className={`pointer-events-auto h-10 w-10 rounded-full bg-white/90 hover:bg-white ${transitionClasses.button}`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Vista completa normal
  return (
    <Card className="animate-fade-in">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate">Evidencia Fotográfica ({imagenes.length})</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Imágenes adjuntas al reporte
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2">
        {selectedImages.length > 0 && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleBulkDownload}
              className={`w-full justify-center ${transitionClasses.button}`}
            >
              <Download className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Descargar ({selectedImages.length})</span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className={`w-full justify-center ${transitionClasses.button}`}
          >
            <div className={`w-4 h-4 mr-2 flex-shrink-0 rounded border-2 flex items-center justify-center ${
              selectedImages.length === imagenes.length 
                ? 'bg-primary border-primary' 
                : 'border-muted-foreground'
            }`}>
              {selectedImages.length === imagenes.length && (
                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="truncate">
              {selectedImages.length === imagenes.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {imagenes.map((imagen, index) => (
            <ImagenItem
              key={index}
              imagen={imagen}
              index={index}
              isSelected={selectedImagesSet.has(index)}
              onToggleSelection={toggleImageSelection}
              onOpenImage={openImage}
              onDownload={handleDownload}
              onRemove={onRemove}
              staggerClass={getStaggerClass(index, 75)}
            />
          ))}
        </div>

        {/* Carousel Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-5xl p-0">
            <div className="relative bg-black rounded-lg">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-white">
                    Evidencia {selectedImageIndex !== null ? selectedImageIndex + 1 : 0} de {imagenes.length}
                  </DialogTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={closeDialog}
                    className={`text-white hover:bg-white/20 ${transitionClasses.fast}`}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Image */}
              {selectedImageIndex !== null && (
                <div className="relative flex items-center justify-center min-h-[70vh] p-16 animate-scale-in">
                  <img
                    src={imagenes[selectedImageIndex]}
                    alt={`Evidencia ${selectedImageIndex + 1}`}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={goToPrevious}
                  className={`pointer-events-auto h-12 w-12 rounded-full bg-white/90 hover:bg-white ${transitionClasses.button}`}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={goToNext}
                  className={`pointer-events-auto h-12 w-12 rounded-full bg-white/90 hover:bg-white ${transitionClasses.button}`}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>

              {/* Footer with Download */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => selectedImageIndex !== null && handleDownload(imagenes[selectedImageIndex], selectedImageIndex)}
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
      </CardContent>
    </Card>
  );
});

ReporteEvidencia.displayName = 'ReporteEvidencia';
