import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileType } from 'lucide-react';
import { toast } from 'sonner';
import { FormHeader } from '@/components/ui/form-header';
import { FormFooter } from '@/components/ui/form-footer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFormNavigation } from '@/hooks/controlador/useFormNavigation';
import {
  useOptimizedTipoReportes,
  TipoReporte,
  TipoReporteInsert,
  useOptimizedProfile,
  useOptimizedCategories,
} from '@/hooks/entidades';
import { animationClasses } from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';

// Iconos disponibles para tipos de reportes
const REPORT_TYPE_ICONS = [
  'document', 'bookmark', 'clipboard', 'chart', 'wrench', 'warning',
  'construction', 'lightbulb', 'target', 'pin', 'star', 'fire'
];

// Colores disponibles para tipos de reportes
const REPORT_TYPE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#22C55E', '#10B981',
  '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
];

interface ReportTypeFormProps {
  /** Tipo de reporte a editar (si es null, es modo crear) */
  tipoReporte?: TipoReporte | null;
  /** Callback al guardar exitosamente */
  onSuccess?: () => void;
}

export function ReportTypeForm({ tipoReporte, onSuccess }: ReportTypeFormProps) {
  const navigate = useNavigate();
  const { create, update } = useOptimizedTipoReportes();
  const { data: profile } = useOptimizedProfile();
  const { data: categories = [], isLoading: categoriesLoading } = useOptimizedCategories();
  const isEditing = !!tipoReporte;

  // Estado del formulario
  const [nombre, setNombre] = useState(tipoReporte?.nombre || '');
  const [descripcion, setDescripcion] = useState(tipoReporte?.descripcion || '');
  const [categoryId, setCategoryId] = useState(tipoReporte?.category_id || '');
  const [selectedIcon, setSelectedIcon] = useState(tipoReporte?.icono || REPORT_TYPE_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(tipoReporte?.color || REPORT_TYPE_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Navegación del formulario - usa 'from' param o ruta por defecto
  const { goBack, handleCancel } = useFormNavigation({
    defaultBackRoute: '/tipo-reportes',
  });

  // Validación
  const isValid = nombre.trim().length >= 2 && categoryId.trim().length > 0;

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      if (nombre.trim().length < 2) {
        toast.error('El nombre debe tener al menos 2 caracteres');
      } else if (!categoryId) {
        toast.error('Debes seleccionar una categoría');
      }
      return;
    }

    setIsSubmitting(true);

    try {
      if (!profile?.id) {
        toast.error('Debes iniciar sesión para crear un tipo de reporte');
        setIsSubmitting(false);
        return;
      }

      const tipoReporteData: TipoReporteInsert = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        category_id: categoryId || null,
        icono: selectedIcon,
        color: selectedColor,
        user_id: profile.id,
        activo: true,
      };

      if (isEditing && tipoReporte) {
        await update(tipoReporte.id, tipoReporteData);
        toast.success('Tipo de reporte actualizado exitosamente');
      } else {
        await create(tipoReporteData);
        toast.success('Tipo de reporte creado exitosamente');
      }

      onSuccess?.();
      navigate('/tipo-reportes');
    } catch (error) {
      console.error('Error al guardar tipo de reporte:', error);
      toast.error(
        isEditing ? 'Error al actualizar el tipo de reporte' : 'Error al crear el tipo de reporte'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar solo categorías activas
  const activeCategories = categories.filter((cat) => cat.activo && !cat.deleted_at);

  return (
    <div className={cn('flex flex-col h-full', animationClasses.fadeIn)}>
      <FormHeader
        title={isEditing ? 'Editar Tipo de Reporte' : 'Crear Nuevo Tipo de Reporte'}
        description={
          isEditing
            ? 'Modifica los datos del tipo de reporte'
            : 'Completa los datos para crear un nuevo tipo de reporte'
        }
        icon={FileType}
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
                  Información del Tipo de Reporte
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
                    placeholder="Ingresa el nombre del tipo de reporte"
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

                {/* Categoría */}
                <div className="space-y-2">
                  <Label htmlFor="categoria" className="text-sm font-medium">
                    Categoría <span className="text-destructive">*</span>
                  </Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesLoading ? (
                        <SelectItem value="loading" disabled>
                          Cargando categorías...
                        </SelectItem>
                      ) : activeCategories.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          No hay categorías disponibles
                        </SelectItem>
                      ) : (
                        activeCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Selecciona la categoría a la que pertenece este tipo de reporte
                  </p>
                </div>

                {/* Selección de Icono */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Icono</Label>
                  <div className="flex flex-wrap gap-2">
                    {REPORT_TYPE_ICONS.map((icon) => (
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
                    {REPORT_TYPE_COLORS.map((color) => (
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
          submitText={isEditing ? 'Guardar Cambios' : 'Crear Tipo de Reporte'}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          isValid={isValid}
          submitButtonType="submit"
        />
      </form>
    </div>
  );
}

// Helper para obtener emoji según el nombre del icono
function getIconEmoji(iconName: string): string {
  const iconMap: Record<string, string> = {
    'document': '📄',
    'bookmark': '🔖',
    'clipboard': '📋',
    'chart': '📊',
    'wrench': '🔧',
    'warning': '⚠️',
    'construction': '🚧',
    'lightbulb': '💡',
    'target': '🎯',
    'pin': '📍',
    'star': '⭐',
    'fire': '🔥',
  };
  return iconMap[iconName] || '📄';
}
