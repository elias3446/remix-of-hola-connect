import { Button } from './button';
import { animationClasses } from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface FormFooterProps {
  /** Texto del botón de cancelar */
  cancelText?: string;
  /** Texto del botón de enviar/crear/guardar */
  submitText?: string;
  /** Función al cancelar */
  onCancel?: () => void;
  /** Función al enviar */
  onSubmit?: () => void;
  /** Si el formulario está enviando */
  isSubmitting?: boolean;
  /** Si el formulario es válido y puede enviarse */
  isValid?: boolean;
  /** Clases adicionales */
  className?: string;
  /** Tipo del botón de enviar */
  submitButtonType?: 'button' | 'submit';
  /** ID del formulario asociado (para usar fuera del form) */
  formId?: string;
}

/**
 * Footer reutilizable para formularios
 * Contiene botones de Cancelar y Crear/Guardar
 */
export function FormFooter({
  cancelText = 'Cancelar',
  submitText = 'Guardar',
  onCancel,
  onSubmit,
  isSubmitting = false,
  isValid = true,
  className,
  submitButtonType = 'submit',
  formId,
}: FormFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 py-4 px-6 border-t border-border bg-background',
        animationClasses.fadeIn,
        className
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
        className="min-w-[100px]"
      >
        {cancelText}
      </Button>
      <Button
        type={submitButtonType}
        form={formId}
        onClick={submitButtonType === 'button' ? onSubmit : undefined}
        disabled={isSubmitting || !isValid}
        className="min-w-[140px] bg-primary hover:bg-primary/90"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          submitText
        )}
      </Button>
    </div>
  );
}
