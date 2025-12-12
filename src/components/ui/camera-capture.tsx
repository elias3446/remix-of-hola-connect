import { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { Camera, ImageIcon, X, SwitchCamera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOptimizedComponent, animationClasses, transitionClasses, hoverClasses } from "@/hooks/optimizacion";
interface CameraCaptureProps {
  onCapture: (imageUrl: string) => void;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  buttonClassName?: string;
  maxFileSize?: number;
  allowedFormats?: string[];
  showLimits?: boolean;
}
export function CameraCapture({
  onCapture,
  buttonText = "Capturar Imagen",
  buttonVariant = "default",
  buttonClassName,
  maxFileSize = 10485760,
  // 10MB default
  allowedFormats = ["jpg", "png", "jpeg", "gif", "webp"],
  showLimits = true
}: CameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [hasBackCamera, setHasBackCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optimización del componente
  useOptimizedComponent({
    isOpen,
    capturedImage,
    facingMode
  }, {
    componentName: 'CameraCapture'
  });
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };
  const limitsText = showLimits ? `Máx: ${formatFileSize(maxFileSize)} • Formatos: ${allowedFormats.join(", ").toUpperCase()}` : "";
  useEffect(() => {
    // Check if device has back camera
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        // Check for back camera by looking at labels or having multiple cameras
        const hasBack = videoDevices.some(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('trasera') || device.label.toLowerCase().includes('rear') || device.label.toLowerCase().includes('environment')) || videoDevices.length > 1;
        setHasBackCamera(hasBack);
      });
    }
  }, []);
  const startCamera = async () => {
    try {
      setIsCameraReady(false);
      const constraints = {
        video: {
          facingMode: facingMode,
          width: {
            ideal: 1920
          },
          height: {
            ideal: 1080
          }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("No se pudo acceder a la cámara. Por favor verifica los permisos.");
    }
  };
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraReady(false);
    }
  };
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageUrl);
        stopCamera();
      }
    }
  };
  const switchCamera = async () => {
    stopCamera();
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };
  useEffect(() => {
    if (isOpen && !capturedImage && !stream) {
      startCamera();
    }
  }, [isOpen, facingMode]);
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setIsOpen(false);
  };
  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
      toast.success("Imagen capturada exitosamente");
    }
  };
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxFileSize) {
      toast.error(`La imagen es muy grande. Máximo permitido: ${formatFileSize(maxFileSize)}`);
      return;
    }

    // Validate file format
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && !allowedFormats.includes(fileExtension)) {
      toast.error(`Formato no permitido. Usa: ${allowedFormats.join(", ").toUpperCase()}`);
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      const imageUrl = event.target?.result as string;
      setCapturedImage(imageUrl);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };
  return <>
      <Button type="button" variant={buttonVariant} onClick={() => setIsOpen(true)} className={cn("gap-2", transitionClasses.button, buttonClassName)}>
        <Camera className="h-4 w-4" />
        {buttonText}
      </Button>

      {showLimits && limitsText && <p className="text-xs text-muted-foreground mt-1">{limitsText}</p>}

      <input ref={fileInputRef} type="file" accept={allowedFormats.map(f => `.${f}`).join(',')} onChange={handleFileSelect} className="hidden" />

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={cn("w-[95vw] sm:w-[90vw] md:w-[75vw] lg:w-[60vw] max-w-2xl overflow-hidden", "p-4 sm:p-5", "max-h-[85vh] sm:max-h-[80vh]", animationClasses.fadeIn)}>
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg font-semibold">Capturar Imagen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-5 pt-2">
            {/* Camera/Image Preview */}
            <div className={cn("relative bg-muted rounded-lg overflow-hidden flex items-center justify-center", "aspect-[4/3] sm:aspect-[4/3] md:aspect-[16/10] lg:aspect-[16/9]", "min-h-[180px] sm:min-h-[200px] md:min-h-[240px] lg:min-h-[280px]", "max-h-[50vh] md:max-h-[55vh]", transitionClasses.normal)}>
              {capturedImage ? <img src={capturedImage} alt="Captured" className={cn("w-full h-full object-contain", animationClasses.scaleIn)} /> : <>
                  {/* Video element */}
                  <video ref={videoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover absolute inset-0", !isCameraReady && "opacity-0")} />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Camera placeholder icon - shown when camera is not ready */}
                  {!isCameraReady && <div className="flex flex-col items-center justify-center text-muted-foreground/50">
                      <svg className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                        {/* Camera base/stand */}
                        <path d="M25 75 L40 55 L60 55 L75 75 L25 75" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Camera body */}
                        <rect x="30" y="30" width="40" height="25" rx="3" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Camera lens */}
                        <circle cx="50" cy="42" r="8" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Lens inner circle */}
                        <circle cx="50" cy="42" r="4" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Flash */}
                        <circle cx="62" cy="35" r="2" fill="currentColor" />
                      </svg>
                    </div>}

                  {/* Switch camera button - only visible when camera is ready and has back camera */}
                  {isCameraReady && hasBackCamera && <Button type="button" onClick={switchCamera} variant="secondary" size="icon" className={cn("absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4", "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10", "bg-background/80 backdrop-blur-sm hover:bg-background/90", transitionClasses.button, hoverClasses.scale)}>
                      <SwitchCamera className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>}
                </>}
            </div>

            {/* Controls - responsive for all breakpoints */}
            <div className={cn("flex gap-2 sm:gap-3 md:gap-4 items-center", animationClasses.fadeIn)}>
              {!capturedImage ? <>
                  {/* Capture button - "Foto" on mobile, "Capturar" on tablet+ */}
                  <Button type="button" onClick={capturePhoto} size="default" className={cn("flex-1 h-11 sm:h-12 md:h-13 text-sm sm:text-base font-medium", transitionClasses.button)} disabled={!isCameraReady}>
                    <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">Capturar</span>
                    <span className="sm:hidden">Foto</span>
                  </Button>

                  {/* Upload button */}
                  <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" size="default" className={cn("flex-1 h-11 sm:h-12 md:h-13 text-sm sm:text-base font-medium", transitionClasses.button)}>
                    <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden md:inline">Subir Archivo</span>
                    <span className="md:hidden">Subir</span>
                  </Button>
                </> : <>
                  <Button type="button" onClick={handleConfirm} size="default" className={cn("flex-1 h-11 sm:h-12 md:h-13 text-sm sm:text-base font-medium", transitionClasses.button)}>
                    <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Confirmar
                  </Button>

                  <Button type="button" onClick={handleRetake} variant="outline" size="default" className={cn("flex-1 h-11 sm:h-12 md:h-13 text-sm sm:text-base font-medium", transitionClasses.button)}>
                    <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">Tomar Otra</span>
                    <span className="sm:hidden">Otra</span>
                  </Button>

                  <Button type="button" onClick={handleClose} variant="outline" size="icon" className={cn("shrink-0 h-11 w-11 sm:h-12 sm:w-12", transitionClasses.button)}>
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </>}
            </div>

            {/* Help text - visible on tablet and larger screens */}
            
          </div>
        </DialogContent>
      </Dialog>
    </>;
}