import { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { BulkUploadEditFormProps } from '@/components/ui/bulk-upload';

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

export function CategoryFormEmbedded({ rowData, onSave, onCancel }: BulkUploadEditFormProps) {
  const [nombre, setNombre] = useState(rowData.nombre || '');
  const [descripcion, setDescripcion] = useState(rowData.descripcion || '');
  const [selectedIcon, setSelectedIcon] = useState(rowData.icono || CATEGORY_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(rowData.color || CATEGORY_COLORS[0]);

  useEffect(() => {
    setNombre(rowData.nombre || '');
    setDescripcion(rowData.descripcion || '');
    setSelectedIcon(rowData.icono || CATEGORY_ICONS[0]);
    setSelectedColor(rowData.color || CATEGORY_COLORS[0]);
  }, [rowData]);

  const isValid = nombre.trim().length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onSave({
      ...rowData,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      icono: selectedIcon,
      color: selectedColor,
    });
  };

  return (
    <div className="flex flex-col">
      <DialogHeader className="p-6 pb-2">
        <DialogTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Editar Categoría
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="p-6 pt-2 space-y-6">
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

        <DialogFooter className="p-6 pt-0 gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isValid}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}
