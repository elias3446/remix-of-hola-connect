import { useMemo } from 'react';
import { FileType } from 'lucide-react';
import { useBulkUpload, BulkUploadConfig, FieldConfig } from '@/hooks/controlador/useBulkUpload';
import { BulkUpload } from '@/components/ui/bulk-upload';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';
import { useOptimizedTipoReportes } from '@/hooks/entidades/useOptimizedTipoReportes';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';
import { ReportTypeFormEmbedded } from '@/components/report-types/ReportTypeFormEmbedded';

export default function TipoReportesBulkUpload() {
  const { user } = useAuth();
  const { data: profile } = useOptimizedProfile(user?.id ?? null);
  const { data: categories = [] } = useOptimizedCategories();
  const { create } = useOptimizedTipoReportes();

  const categoryNames = useMemo(() => 
    categories.filter(c => c.activo && !c.deleted_at).map(c => c.nombre.toLowerCase()),
    [categories]
  );

  const fields: FieldConfig[] = [
    { key: 'nombre', label: 'Nombre', required: true },
    { 
      key: 'categoria', 
      label: 'Categoría', 
      required: true,
      validate: (value) => {
        if (categoryNames.length > 0 && !categoryNames.includes(value.toLowerCase())) {
          return `Categoría no encontrada. Disponibles: ${categories.filter(c => c.activo).map(c => c.nombre).join(', ')}`;
        }
        return null;
      }
    },
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
    entityType: 'tipo-reportes',
    entityLabel: 'Tipo de Reporte',
    entityLabelPlural: 'Tipos de Reportes',
    fields,
    templateFileName: 'plantilla_tipo_reportes.csv',
    queryKey: 'tipoReportes',
    processRow: async (row, rowNumber) => {
      try {
        if (!profile?.id) {
          return { success: false, error: 'Perfil de usuario no encontrado' };
        }

        // Buscar la categoría por nombre
        const category = categories.find(
          c => c.nombre.toLowerCase() === row.categoria.toLowerCase()
        );

        if (!category) {
          return { success: false, error: `Categoría "${row.categoria}" no encontrada` };
        }

        const result = await create({
          nombre: row.nombre,
          descripcion: row.descripcion || null,
          color: row.color || category.color || '#3B82F6',
          icono: row.icono || category.icono || 'circle',
          category_id: category.id,
          user_id: profile.id,
          activo: true,
        });

        if (!result) {
          return { success: false, error: 'No se pudo crear el tipo de reporte' };
        }

        return { success: true };
      } catch (error: any) {
        console.error('[TipoReportesBulkUpload] Error:', error);
        if (error?.code === '23505') {
          return { success: false, error: 'Ya existe un tipo de reporte con ese nombre' };
        }
        if (error?.code === '42501') {
          return { success: false, error: 'Sin permisos para crear tipos de reporte (RLS)' };
        }
        return { success: false, error: error?.message || 'Error desconocido' };
      }
    },
  }), [create, profile?.id, categories, categoryNames]);

  const bulkUpload = useBulkUpload(config);

  return (
    <div className="h-full bg-background overflow-y-auto">
      <BulkUpload 
        bulkUpload={bulkUpload} 
        backPath="/tipo-reportes" 
        icon={FileType}
        renderEditForm={(props) => <ReportTypeFormEmbedded {...props} />}
      />
    </div>
  );
}
