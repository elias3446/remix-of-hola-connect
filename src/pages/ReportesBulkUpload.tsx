import { useMemo, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { useBulkUpload, BulkUploadConfig, FieldConfig } from '@/hooks/controlador/useBulkUpload';
import { BulkUpload } from '@/components/ui/bulk-upload';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';
import { useOptimizedTipoReportes } from '@/hooks/entidades/useOptimizedTipoReportes';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';
import { useCloudinaryUpload } from '@/hooks/controlador/useCloudinaryUpload';
import { ReportFormEmbedded } from '@/components/report/ReportFormEmbedded';

export default function ReportesBulkUpload() {
  const { user } = useAuth();
  const { data: profile } = useOptimizedProfile(user?.id ?? null);
  const { data: categories = [] } = useOptimizedCategories();
  const { data: tipoReportes = [] } = useOptimizedTipoReportes();
  const { create } = useOptimizedReportes();
  const { uploadFromDataUrl } = useCloudinaryUpload();

  const tipoReporteNames = useMemo(() => 
    tipoReportes.filter(t => t.activo && !t.deleted_at).map(t => t.nombre.toLowerCase()),
    [tipoReportes]
  );

  // Función para subir imágenes a Cloudinary
  const uploadImagesToCloudinary = useCallback(async (images: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const image of images) {
      // Si ya es una URL de Cloudinary, no subir de nuevo
      if (image.startsWith('https://res.cloudinary.com') || image.startsWith('http')) {
        uploadedUrls.push(image);
        continue;
      }
      
      // Subir data URL a Cloudinary
      try {
        const result = await uploadFromDataUrl(image, {
          folder: 'reportes',
          tags: ['reporte', 'bulk-upload'],
        });
        uploadedUrls.push(result.secure_url);
      } catch (error) {
        console.error('Error subiendo imagen:', error);
        // Continuar con las demás imágenes
      }
    }
    
    return uploadedUrls;
  }, [uploadFromDataUrl]);

  const fields: FieldConfig[] = [
    { key: 'nombre', label: 'Nombre', required: true },
    { 
      key: 'tipo_reporte', 
      label: 'Tipo de Reporte', 
      required: true,
      validate: (value) => {
        if (tipoReporteNames.length > 0 && !tipoReporteNames.includes(value.toLowerCase())) {
          return `Tipo no encontrado. Disponibles: ${tipoReportes.filter(t => t.activo).map(t => t.nombre).slice(0, 5).join(', ')}...`;
        }
        return null;
      }
    },
    { key: 'descripcion', label: 'Descripción', required: false },
    { 
      key: 'prioridad', 
      label: 'Prioridad', 
      required: false,
      validate: (value) => {
        if (!value) return null;
        const valid = ['bajo', 'medio', 'alto', 'urgente', 'baja', 'media', 'alta'];
        if (!valid.includes(value.toLowerCase())) {
          return 'Prioridad debe ser: bajo, medio, alto o urgente';
        }
        return null;
      }
    },
    { 
      key: 'latitud', 
      label: 'Latitud', 
      required: false,
      validate: (value) => {
        if (value && isNaN(parseFloat(value))) return 'Latitud debe ser un número';
        return null;
      }
    },
    { 
      key: 'longitud', 
      label: 'Longitud', 
      required: false,
      validate: (value) => {
        if (value && isNaN(parseFloat(value))) return 'Longitud debe ser un número';
        return null;
      }
    },
  ];

  const config: BulkUploadConfig = useMemo(() => ({
    entityType: 'reportes',
    entityLabel: 'Reporte',
    entityLabelPlural: 'Reportes',
    fields,
    templateFileName: 'plantilla_reportes.csv',
    queryKey: 'reportes-with-distance',
    processRow: async (row, rowNumber) => {
      try {
        if (!profile?.id) {
          return { success: false, error: 'Perfil de usuario no encontrado' };
        }

        // Buscar el tipo de reporte por nombre o ID
        let tipoReporte = tipoReportes.find(
          t => t.nombre.toLowerCase() === row.tipo_reporte?.toLowerCase()
        );
        
        // Si viene tipo_reporte_id (desde el formulario embebido)
        if (!tipoReporte && row.tipo_reporte_id) {
          tipoReporte = tipoReportes.find(t => t.id === row.tipo_reporte_id);
        }

        if (!tipoReporte) {
          return { success: false, error: `Tipo de reporte "${row.tipo_reporte}" no encontrado` };
        }

        // Preparar geolocation si hay coordenadas
        const lat = row.latitud ? parseFloat(row.latitud) : null;
        const lng = row.longitud ? parseFloat(row.longitud) : null;
        
        let geolocation: string | undefined;

        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          geolocation = `SRID=4326;POINT(${lng} ${lat})`;
        }

        // Construir objeto location con toda la información
        const locationData = {
          lat: lat || undefined,
          lng: lng || undefined,
          address: row.direccion || '',
          puntoReferencia: row.punto_referencia || '',
          edificio: row.edificio || '',
          piso: row.piso || '',
          aulaSala: row.aula_sala || '',
          infoAdicional: row.info_adicional || '',
        };

        // Mapear prioridad (normalizar valores)
        let prioridad = row.prioridad?.toLowerCase() || 'medio';
        if (prioridad === 'baja') prioridad = 'bajo';
        if (prioridad === 'media') prioridad = 'medio';
        if (prioridad === 'alta') prioridad = 'alto';

        // Subir imágenes a Cloudinary si hay
        let cloudinaryUrls: string[] = [];
        if (row.imagenes) {
          try {
            const imagenesToUpload = JSON.parse(row.imagenes);
            if (Array.isArray(imagenesToUpload) && imagenesToUpload.length > 0) {
              cloudinaryUrls = await uploadImagesToCloudinary(imagenesToUpload);
            }
          } catch {
            // Si no es JSON, intentar como string separado por comas
            const imgs = row.imagenes.split(',').filter(Boolean);
            if (imgs.length > 0) {
              cloudinaryUrls = await uploadImagesToCloudinary(imgs);
            }
          }
        }

        const result = await create({
          nombre: row.nombre,
          descripcion: row.descripcion || null,
          tipo_reporte_id: tipoReporte.id,
          categoria_id: row.categoria_id || tipoReporte.category_id,
          user_id: profile.id,
          priority: prioridad as 'bajo' | 'medio' | 'alto' | 'urgente',
          status: (row.estado as any) || 'pendiente',
          visibility: (row.visibilidad as any) || 'privado',
          activo: row.activo !== 'false',
          assigned_to: row.asignado_a || null,
          imagenes: cloudinaryUrls.length > 0 ? cloudinaryUrls : null,
          location: (lat && lng) ? locationData : null,
          ...(geolocation && { geolocation: geolocation as any }),
        });

        if (!result) {
          return { success: false, error: 'No se pudo crear el reporte' };
        }

        return { success: true };
      } catch (error: any) {
        console.error('[ReportesBulkUpload] Error:', error);
        if (error?.code === '42501') {
          return { success: false, error: 'Sin permisos para crear reportes (RLS)' };
        }
        return { success: false, error: error?.message || 'Error desconocido' };
      }
    },
  }), [create, profile?.id, tipoReportes, tipoReporteNames, uploadImagesToCloudinary]);

  const bulkUpload = useBulkUpload(config);

  return (
    <div className="h-full bg-background overflow-y-auto">
      <BulkUpload 
        bulkUpload={bulkUpload} 
        backPath="/reportes" 
        icon={FileText}
        renderEditForm={(props) => <ReportFormEmbedded {...props} />}
      />
    </div>
  );
}
