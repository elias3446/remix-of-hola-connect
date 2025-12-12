import { FolderTree } from 'lucide-react';
import { useBulkUpload, BulkUploadConfig, FieldConfig } from '@/hooks/controlador/useBulkUpload';
import { BulkUpload } from '@/components/ui/bulk-upload';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryFormEmbedded } from '@/components/categories/CategoryFormEmbedded';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';
import { useMemo } from 'react';

export default function CategoriasBulkUpload() {
  const { user } = useAuth();
  const { data: profile } = useOptimizedProfile(user?.id ?? null);
  const { create } = useOptimizedCategories();

  const fields: FieldConfig[] = [
    { key: 'nombre', label: 'Nombre', required: true },
    { key: 'descripcion', label: 'Descripción', required: false },
    { 
      key: 'color', 
      label: 'Color', 
      required: false,
      validate: (value) => {
        if (value && !value.startsWith('#')) return 'El color debe ser hexadecimal (ej: #3B82F6)';
        return null;
      }
    },
    { key: 'icono', label: 'Icono', required: false },
  ];

  const config: BulkUploadConfig = useMemo(() => ({
    entityType: 'categorias',
    entityLabel: 'Categoría',
    entityLabelPlural: 'Categorías',
    fields,
    templateFileName: 'plantilla_categorias.csv',
    queryKey: 'categories',
    processRow: async (row, rowNumber) => {
      if (!profile?.id) {
        return { success: false, error: 'Perfil de usuario no encontrado' };
      }

      try {
        const result = await create({
          nombre: row.nombre,
          descripcion: row.descripcion || null,
          color: row.color || '#3B82F6',
          icono: row.icono || 'circle',
          user_id: profile.id,
          activo: true,
        });

        if (!result) {
          return { success: false, error: 'No se pudo crear la categoría' };
        }

        return { success: true };
      } catch (error: any) {
        console.error('[CategoriasBulkUpload] Error creando categoría:', error);
        if (error?.code === '23505') {
          return { success: false, error: 'Ya existe una categoría con ese nombre' };
        }
        if (error?.code === '42501') {
          return { success: false, error: 'Sin permisos para crear categorías (RLS)' };
        }
        return { success: false, error: error?.message || 'Error desconocido' };
      }
    },
  }), [create, profile?.id]);

  const bulkUpload = useBulkUpload(config);

  return (
    <div className="h-full bg-background overflow-y-auto">
      <BulkUpload 
        bulkUpload={bulkUpload} 
        backPath="/categorias" 
        icon={FolderTree}
        renderEditForm={(props) => <CategoryFormEmbedded {...props} />}
      />
    </div>
  );
}
