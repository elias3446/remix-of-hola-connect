import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useOptimizedComponent,
  useThrottle,
  transitionClasses,
} from "@/hooks/optimizacion";

export type ConfirmationVariant = "destructive" | "default" | "warning";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const variantStyles: Record<ConfirmationVariant, string> = {
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  warning: "bg-amber-500 text-white hover:bg-amber-600",
};

export const ConfirmationDialog = React.memo(function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationDialogProps) {
  const [isPending, setIsPending] = React.useState(false);

  // Optimización de props
  const { stableProps } = useOptimizedComponent(
    { title, description, confirmLabel, cancelLabel, variant },
    { componentName: "ConfirmationDialog" }
  );

  // Throttle para evitar doble click
  const handleConfirm = useThrottle(async () => {
    if (isPending || isLoading) return;
    
    setIsPending(true);
    
    try {
      // Ejecutar la acción de confirmación PRIMERO
      await onConfirm();
      // Cerrar el diálogo DESPUÉS de completar la acción
      onOpenChange(false);
    } catch (error) {
      console.error("[ConfirmationDialog] Confirmation action failed:", error);
    } finally {
      setIsPending(false);
    }
  }, 500);

  const handleCancel = React.useCallback(() => {
    onCancel?.();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  const loading = isLoading || isPending;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn("sm:max-w-[425px]", transitionClasses.normal)}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">
            {stableProps.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {stableProps.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={loading}
            className={cn(
              buttonVariants({ variant: "outline" }),
              transitionClasses.button
            )}
          >
            {stableProps.cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              variantStyles[stableProps.variant],
              transitionClasses.button
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Procesando...
              </span>
            ) : (
              stableProps.confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

// Hook for easier usage
interface UseConfirmationOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
}

export function useConfirmation() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [options, setOptions] = React.useState<UseConfirmationOptions | null>(null);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((opts: UseConfirmationOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = React.useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resolveRef.current?.(false);
      resolveRef.current = null;
    }
  }, []);

  const ConfirmationDialogComponent = React.useMemo(() => {
    if (!options) return null;
    
    return (
      <ConfirmationDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        title={options.title}
        description={options.description}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        variant={options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }, [isOpen, options, handleOpenChange, handleConfirm, handleCancel]);

  return {
    confirm,
    ConfirmationDialog: ConfirmationDialogComponent,
  };
}
