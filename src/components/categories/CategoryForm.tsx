import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { toast } from 'sonner';
import { FormHeader } from '@/components/ui/form-header';
import { FormFooter } from '@/components/ui/form-footer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useFormNavigation } from '@/hooks/controlador/useFormNavigation';
import { useCategoryCreatedDialog } from '@/hooks/controlador/useCategoryCreatedDialog';
import { useOptimizedCategories, Category, CategoryInsert, useOptimizedProfile } from '@/hooks/entidades';
import { animationClasses } from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';

interface LocationState {
  from?: string;
  redirect?: string;
}

const DEFAULT_BACK_ROUTE = '/categorias';

// Iconos disponibles para categorías
const CATEGORY_ICONS = [
  'folder', 'building', 'wrench', 'building-2', 'list-todo', 'zap',
  'flame', 'lightbulb', 'target', 'pin', 'star', 'rocket'
];

// Colores disponibles para categorías
const CATEGORY_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#22C55E', '#10B981',
  '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#F43F5E'
];

interface CategoryFormProps {
  /** Categoría a editar (si es null, es modo crear) */
  category?: Category | null;
  /** Callback al guardar exitosamente */
  onSuccess?: () => void;
}

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const { create, update } = useOptimizedCategories();
  const { data: profile } = useOptimizedProfile();
  const isEditing = !!category;
  
  // Estado del formulario
  const [nombre, setNombre] = useState(category?.nombre || '');
  const [descripcion, setDescripcion] = useState(category?.descripcion || '');
  const [selectedIcon, setSelectedIcon] = useState(category?.icono || CATEGORY_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(category?.color || CATEGORY_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Navegación del formulario - usa 'from' del state o ruta por defecto
  const { goBack, handleCancel, backRoute } = useFormNavigation({
    defaultBackRoute: locationState?.from || DEFAULT_BACK_ROUTE,
  });

  // Diálogo de confirmación para crear tipo de reporte
  const {
    showDialog: showCreateReportDialog,
    setShowDialog: setShowCreateReportDialog,
    showCreateReportTypeDialog,
    handleConfirmCreateReportType,
    handleCancelAndGoBack,
    fromRoute,
  } = useCategoryCreatedDialog({ defaultBackRoute: locationState?.from || DEFAULT_BACK_ROUTE });

  // Validación
  const isValid = nombre.trim().length >= 2;

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      toast.error('El nombre debe tener al menos 2 caracteres');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!profile?.id) {
        toast.error('Debes iniciar sesión para crear una categoría');
        setIsSubmitting(false);
        return;
      }

      const categoryData: CategoryInsert = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        icono: selectedIcon,
        color: selectedColor,
        user_id: profile.id,
        activo: true,
      };

      if (isEditing && category) {
        await update(category.id, categoryData);
        toast.success('Categoría actualizada exitosamente');
        onSuccess?.();
        navigate(backRoute || DEFAULT_BACK_ROUTE);
      } else {
        const result = await create(categoryData);
        // Mostrar diálogo de confirmación para crear tipo de reporte
        showCreateReportTypeDialog(result?.id);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      toast.error(isEditing ? 'Error al actualizar la categoría' : 'Error al crear la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Texto del botón "No" basado en la ruta de origen
  const cancelButtonText = fromRoute === '/tipo-reportes' 
    ? 'No, ir a Tipo de Reportes' 
    : 'No, ir a Categorías';

  return (
    <div className={cn('flex flex-col h-full', animationClasses.fadeIn)}>
      <FormHeader
        title={isEditing ? 'Editar Categoría' : 'Crear Nueva Categoría'}
        description={isEditing ? 'Modifica los datos de la categoría' : 'Completa los datos para crear una nueva categoría'}
        icon={Tag}
        onBack={goBack}
        showBackButton={true}
      />

      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <div className="flex-1 overflow-y-auto p-6">
          <Card className="border border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h2 className="text-base font-medium text-foreground">
                  Información de la Categoría
                </h2>
              </div>

              <div className="space-y-6">
                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-sm font-medium">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    type="text"
                    placeholder="Ingresa el nombre de la categoría"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="bg-input border-border"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <Label htmlFor="descripcion" className="text-sm font-medium">
                    Descripción
                  </Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Ingresa una descripción (opcional)"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="bg-input border-border min-h-[100px] resize-none"
                    maxLength={500}
                  />
                </div>

                {/* Selección de Icono */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Icono</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setSelectedIcon(icon)}
                        className={cn(
                          'h-12 w-12 rounded-lg border-2 flex items-center justify-center text-2xl transition-all duration-200',
                          selectedIcon === icon
                            ? 'border-primary bg-primary/10 scale-105'
                            : 'border-border bg-secondary hover:border-primary/50'
                        )}
                        title={icon}
                      >
                        {getIconEmoji(icon)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selección de Color */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          'h-10 w-10 rounded-lg transition-all duration-200',
                          selectedColor === color
                            ? 'ring-2 ring-offset-2 ring-primary scale-110'
                            : 'hover:scale-105'
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <FormFooter
          cancelText="Cancelar"
          submitText={isEditing ? 'Guardar Cambios' : 'Crear Categoría'}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          isValid={isValid}
          submitButtonType="submit"
        />
      </form>

      {/* Diálogo de confirmación para crear tipo de reporte */}
      <ConfirmationDialog
        open={showCreateReportDialog}
        onOpenChange={setShowCreateReportDialog}
        title="¿Crear Tipo de Reporte?"
        description="Categoría creada exitosamente. ¿Deseas crear un nuevo tipo de reporte para esta categoría?"
        confirmLabel="Sí, crear Tipo de Reporte"
        cancelLabel={cancelButtonText}
        onConfirm={handleConfirmCreateReportType}
        onCancel={handleCancelAndGoBack}
        variant="default"
      />
    </div>
  );
}

// Helper para obtener emoji según el nombre del icono
function getIconEmoji(iconName: string): string {
  const iconMap: Record<string, string> = {
    'folder': '📁',
    'building': '🏢',
    'wrench': '🔧',
    'building-2': '🏬',
    'list-todo': '📋',
    'zap': '⚡',
    'flame': '🔥',
    'lightbulb': '💡',
    'target': '🎯',
    'pin': '📍',
    'star': '⭐',
    'rocket': '🚀',
  };
  return iconMap[iconName] || '📁';
}
