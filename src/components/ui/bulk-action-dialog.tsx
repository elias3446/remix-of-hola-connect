import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  useOptimizedComponent,
  useThrottle,
  transitionClasses,
} from "@/hooks/optimizacion";
import { LucideIcon } from "lucide-react";

export interface BulkActionItem {
  id: string;
  name: string;
  subtitle?: string;
  status?: string;
  statusVariant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  avatar?: string;
  icon?: string;
}

export interface BulkActionOption {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
}

interface BulkActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon?: LucideIcon;
  items: BulkActionItem[];
  options?: BulkActionOption[];
  selectedOption?: string;
  onOptionChange?: (optionId: string) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive" | "warning";
  onConfirm: (selectedOption?: string) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  entityLabel?: string; // e.g., "reportes", "usuarios", "categorías"
}

const optionVariantStyles: Record<string, string> = {
  default: "text-primary",
  success: "text-green-600",
  warning: "text-amber-500",
  destructive: "text-destructive",
};

const confirmVariantStyles: Record<string, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  warning: "bg-amber-500 text-white hover:bg-amber-600",
};

export const BulkActionDialog = React.memo(function BulkActionDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  items,
  options,
  selectedOption,
  onOptionChange,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "default",
  onConfirm,
  onCancel,
  isLoading = false,
  entityLabel = "elementos",
}: BulkActionDialogProps) {
  const [isPending, setIsPending] = React.useState(false);

  // Optimización de props
  const { stableProps } = useOptimizedComponent(
    { title, description, confirmLabel, cancelLabel, entityLabel },
    { componentName: "BulkActionDialog" }
  );

  // Throttle para evitar doble click
  const handleConfirm = useThrottle(async () => {
    if (isPending || isLoading) return;
    
    setIsPending(true);
    
    try {
      await onConfirm(selectedOption);
      onOpenChange(false);
    } catch (error) {
      console.error("[BulkActionDialog] Confirmation action failed:", error);
    } finally {
      setIsPending(false);
    }
  }, 500);

  const handleCancel = React.useCallback(() => {
    onCancel?.();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  const loading = isLoading || isPending;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col", transitionClasses.normal)}>
        <DialogHeader className="flex flex-row items-start gap-3 shrink-0">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 space-y-1 min-w-0">
            <DialogTitle className="text-lg font-semibold">
              {stableProps.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {stableProps.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Items list */}
        <div className="space-y-2 flex-1 min-h-0 overflow-hidden">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 shrink-0">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {items.length}
            </span>
            {stableProps.entityLabel.charAt(0).toUpperCase() + stableProps.entityLabel.slice(1)} afectados ({items.length}):
          </p>
          <ScrollArea className="h-[180px] max-h-[180px] rounded-md border overflow-hidden">
            <div className="p-2 space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors"
                >
                  {item.icon ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                      {item.icon}
                    </div>
                  ) : (
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={item.avatar} alt={item.name} />
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(item.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium truncate max-w-full">{item.name}</p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate max-w-full">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  {item.status && (
                    <Badge 
                      variant={
                        item.statusVariant === "success" || item.statusVariant === "warning" 
                          ? "default" 
                          : (item.statusVariant || "secondary")
                      } 
                      className={cn(
                        "shrink-0",
                        item.statusVariant === "success" && "bg-green-500/10 text-green-600 border-green-500/20",
                        item.statusVariant === "warning" && "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}
                    >
                      {item.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Options */}
        {options && options.length > 0 && (
          <div className="space-y-2 shrink-0">
            <p className="text-sm font-medium text-muted-foreground">
              Seleccionar opciones:
            </p>
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {options.map((option) => {
                const OptionIcon = option.icon;
                const isSelected = selectedOption === option.id;
                return (
                  <div
                    key={option.id}
                    onClick={() => onOptionChange?.(option.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onOptionChange?.(option.id)}
                    />
                    {OptionIcon && (
                      <OptionIcon
                        className={cn(
                          "h-4 w-4",
                          optionVariantStyles[option.variant || "default"]
                        )}
                      />
                    )}
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          optionVariantStyles[option.variant || "default"]
                        )}
                      >
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 shrink-0 pt-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className={transitionClasses.button}
          >
            {stableProps.cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (options && options.length > 0 && !selectedOption)}
            className={cn(
              confirmVariantStyles[confirmVariant],
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
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// Hook for easier usage
interface UseBulkActionOptions {
  title: string;
  description: string;
  icon?: LucideIcon;
  options?: BulkActionOption[];
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive" | "warning";
  entityLabel?: string;
}

export function useBulkAction() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [items, setItems] = React.useState<BulkActionItem[]>([]);
  const [options, setOptions] = React.useState<UseBulkActionOptions | null>(null);
  const [selectedOption, setSelectedOption] = React.useState<string | undefined>();
  const resolveRef = React.useRef<((value: { confirmed: boolean; selectedOption?: string }) => void) | null>(null);

  const openDialog = React.useCallback(
    (itemsList: BulkActionItem[], opts: UseBulkActionOptions): Promise<{ confirmed: boolean; selectedOption?: string }> => {
      setItems(itemsList);
      setOptions(opts);
      setSelectedOption(undefined);
      setIsOpen(true);
      return new Promise((resolve) => {
        resolveRef.current = resolve;
      });
    },
    []
  );

  const handleConfirm = React.useCallback((option?: string) => {
    resolveRef.current?.({ confirmed: true, selectedOption: option });
    resolveRef.current = null;
  }, []);

  const handleCancel = React.useCallback(() => {
    resolveRef.current?.({ confirmed: false });
    resolveRef.current = null;
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resolveRef.current?.({ confirmed: false });
      resolveRef.current = null;
    }
  }, []);

  const BulkActionDialogComponent = React.useMemo(() => {
    if (!options) return null;

    return (
      <BulkActionDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        title={options.title}
        description={options.description}
        icon={options.icon}
        items={items}
        options={options.options}
        selectedOption={selectedOption}
        onOptionChange={setSelectedOption}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        confirmVariant={options.confirmVariant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        entityLabel={options.entityLabel}
      />
    );
  }, [isOpen, options, items, selectedOption, handleOpenChange, handleConfirm, handleCancel]);

  return {
    openDialog,
    BulkActionDialog: BulkActionDialogComponent,
  };
}

// Config interface for useBulkActionDialog
export interface BulkActionDialogConfig {
  title: string;
  description: string;
  items: BulkActionItem[];
  variant?: "default" | "destructive" | "warning";
  confirmLabel?: string;
  cancelLabel?: string;
  options?: BulkActionOption[];
  onConfirm: (selectedOption?: string) => void | Promise<void>;
}

// Hook for imperative dialog control
export function useBulkActionDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<BulkActionDialogConfig | null>(null);
  const [selectedOption, setSelectedOption] = React.useState<string | undefined>();

  const open = React.useCallback((newConfig: BulkActionDialogConfig) => {
    setConfig(newConfig);
    setSelectedOption(undefined);
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    setConfig(null);
    setSelectedOption(undefined);
  }, []);

  return {
    isOpen,
    config,
    selectedOption,
    setSelectedOption,
    open,
    close,
  };
}
