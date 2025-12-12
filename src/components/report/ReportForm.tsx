import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, MapPin, Navigation, X, Loader2 } from 'lucide-react';
import { useCloudinaryUpload } from '@/hooks/controlador/useCloudinaryUpload';
import { useSimilarReports } from '@/hooks/controlador/useSimilarReports';
import { useAutoShareReport } from '@/hooks/controlador/useAutoShareReport';
import { toast } from 'sonner';
import { FormHeader } from '@/components/ui/form-header';
import { FormFooter } from '@/components/ui/form-footer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CameraCapture } from '@/components/ui/camera-capture';
import { ReportFormMap } from '@/components/Map';
import { SimilarReportsFound } from './SimilarReportsFound';
import { useFormNavigation } from '@/hooks/controlador/useFormNavigation';
import {
  useOptimizedReportes,
  ReporteInsert,
  ReporteWithDistance,
} from '@/hooks/entidades/useOptimizedReportes';
import {
  useOptimizedProfile,
  useOptimizedCategories,
  useOptimizedTipoReportes,
  useOptimizedUsers,
  useUserDataReady,
  useOptimizedUserRolesList,
} from '@/hooks/entidades';
import { useGlobalLocation } from '@/contexts/LocationContext';
import { animationClasses } from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';
import { hasRole } from '@/hooks/entidades/useOptimizedUserRoles';
import type { Database } from '@/integrations/supabase/types';
import { ReporteEvidencia } from '@/components/ui/ReporteEvidencia';

type UserRole = Database['public']['Enums']['user_role'];

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  reference?: string;
}

interface ReportFormProps {
  /** Reporte a editar (si es null, es modo crear) */
  reporte?: ReporteWithDistance | null;
  /** Callback al guardar exitosamente */
  onSuccess?: () => void;
  /** Ruta por defecto para volver */
  defaultBackRoute?: string;
}

const PRIORITY_OPTIONS = [
  { value: 'bajo', label: 'Baja' },
  { value: 'medio', label: 'Media' },
  { value: 'alto', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const VISIBILITY_OPTIONS = [
  { value: 'publico', label: 'Público' },
  { value: 'privado', label: 'Privado' },
];

// Roles que pueden ver Estado y Configuración
const ADMIN_ROLES: UserRole[] = ['super_admin', 'administrador', 'mantenimiento', 'operador_analista', 'seguridad_uce'];

export function ReportForm({ reporte, onSuccess, defaultBackRoute = '/mis-reportes' }: ReportFormProps) {
  const navigate = useNavigate();
  const { create, update } = useOptimizedReportes();
  const { data: profile } = useOptimizedProfile();
  const { data: categories = [], isLoading: categoriesLoading } = useOptimizedCategories();
  const { data: tipoReportes = [], isLoading: tipoReportesLoading } = useOptimizedTipoReportes();
  const { data: users = [] } = useOptimizedUsers();
  const { data: allUserRoles = [] } = useOptimizedUserRolesList();
  const globalLocation = useGlobalLocation();
  const isEditing = !!reporte;

  // Obtener roles del usuario desde el caché de React Query
  const { userRoles } = useUserDataReady();

  // Verificar si el usuario puede ver Estado y Configuración
  const canViewConfigSection = useMemo(() => {
    if (!userRoles) return false;
    return ADMIN_ROLES.some(role => hasRole(userRoles, role));
  }, [userRoles]);

  // Estado del formulario - Información del Reporte
  const [nombre, setNombre] = useState(reporte?.nombre || '');
  const [descripcion, setDescripcion] = useState(reporte?.descripcion || '');
  const [categoriaId, setCategoriaId] = useState(reporte?.categoria_id || '');
  const [tipoReporteId, setTipoReporteId] = useState(reporte?.tipo_reporte_id || '');

  // Estado y Configuración
  const [priority, setPriority] = useState<string>(reporte?.priority || 'medio');
  const [status, setStatus] = useState<string>(reporte?.status || 'pendiente');
  const [visibility, setVisibility] = useState<string>(reporte?.visibility || 'publico');
  const [assignedTo, setAssignedTo] = useState(reporte?.assigned_to || '');
  const [activo, setActivo] = useState(reporte?.activo ?? true);

  // Imágenes
  const [imagenes, setImagenes] = useState<string[]>(reporte?.imagenes || []);

  // Ubicación
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [puntoReferencia, setPuntoReferencia] = useState('');
  const [edificio, setEdificio] = useState('');
  const [piso, setPiso] = useState('');
  const [aulaSala, setAulaSala] = useState('');
  const [infoAdicional, setInfoAdicional] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  
  // Estado para reportes similares
  const [showSimilarReports, setShowSimilarReports] = useState(false);
  const [similarChecked, setSimilarChecked] = useState(false);
  const [isConfirmingReport, setIsConfirmingReport] = useState(false);

  // Cloudinary upload hook
  const { uploadFromDataUrl, isUploading } = useCloudinaryUpload();
  
  // Similar reports hook
  const { 
    similarReports, 
    isLoading: isLoadingSimilar, 
    fetchSimilarReports, 
    confirmReport,
    clearReports 
  } = useSimilarReports({ radioMetros: 100, horasAtras: 24 });

  // Hook para auto-compartir reportes según settings del usuario (usa caché)
  const { autoShareReport, isAutoShareEnabled } = useAutoShareReport();

  // Navegación del formulario
  const { goBack, handleCancel } = useFormNavigation({
    defaultBackRoute,
  });

  // Inicializar ubicación desde reporte existente
  useEffect(() => {
    if (reporte?.location) {
      const loc = reporte.location as { lat?: number; lng?: number; address?: string; puntoReferencia?: string; edificio?: string; piso?: string; aulaSala?: string; infoAdicional?: string };
      if (loc.lat && loc.lng) {
        setSelectedLocation({
          latitude: loc.lat,
          longitude: loc.lng,
          address: loc.address || '',
        });
        setPuntoReferencia(loc.puntoReferencia || '');
        setEdificio(loc.edificio || '');
        setPiso(loc.piso || '');
        setAulaSala(loc.aulaSala || '');
        setInfoAdicional(loc.infoAdicional || '');
      }
    }
  }, [reporte]);

  // Filtrar categorías y tipos activos
  const activeCategories = categories.filter((cat) => cat.activo && !cat.deleted_at);
  const activeTipoReportes = tipoReportes.filter((tipo) => {
    if (!tipo.activo || tipo.deleted_at) return false;
    if (categoriaId && tipo.category_id !== categoriaId) return false;
    return true;
  });

  // Usuarios activos con permiso "editar_reporte" para asignar
  const activeUsers = useMemo(() => {
    return users.filter((user) => {
      // Debe estar activo y no eliminado
      if (user.deleted_at || user.estado !== 'activo') return false;
      
      // Buscar los roles/permisos del usuario
      const userRole = allUserRoles.find((role) => role.user_id === user.id);
      if (!userRole?.permisos) return false;
      
      // Debe tener el permiso "editar_reporte"
      return userRole.permisos.includes('editar_reporte');
    });
  }, [users, allUserRoles]);

  // Validación
  const isValid = nombre.trim().length >= 2 && selectedLocation !== null;

  // Manejar captura de imagen
  const handleImageCapture = (imageUrl: string) => {
    setImagenes((prev) => [...prev, imageUrl]);
  };

  // Eliminar imagen
  const handleRemoveImage = (index: number) => {
    setImagenes((prev) => prev.filter((_, i) => i !== index));
  };

  // Usar ubicación actual
  const handleUseMyLocation = async () => {
    if (globalLocation.location) {
      const { latitude, longitude } = globalLocation.location;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`
        );
        const data = await response.json();
        const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setSelectedLocation({
          latitude,
          longitude,
          address,
        });
      } catch {
        setSelectedLocation({
          latitude,
          longitude,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        });
      }
    } else {
      globalLocation.startTracking();
      toast.info('Obteniendo tu ubicación...');
    }
  };

  // Buscar reportes similares cuando cambia la ubicación (solo en modo crear)
  const checkSimilarReports = useCallback(async () => {
    if (isEditing || !selectedLocation) return;
    
    const reports = await fetchSimilarReports(
      selectedLocation.latitude,
      selectedLocation.longitude,
      categoriaId || undefined,
      tipoReporteId || undefined
    );
    
    if (reports.length > 0) {
      setShowSimilarReports(true);
    }
    setSimilarChecked(true);
  }, [isEditing, selectedLocation, categoriaId, tipoReporteId, fetchSimilarReports]);

  // Manejar confirmación de reporte similar ("Yo también lo vi")
  const handleConfirmSimilarReport = async (reportId: string) => {
    if (!profile?.id) {
      toast.error('Debes iniciar sesión para confirmar un reporte');
      return;
    }

    setIsConfirmingReport(true);
    const success = await confirmReport(reportId, profile.id);
    setIsConfirmingReport(false);

    if (success) {
      toast.success('¡Gracias por confirmar el reporte!');
      navigate(defaultBackRoute);
    } else {
      toast.error('No se pudo confirmar el reporte');
    }
  };

  // Manejar "Es diferente, continuar creando" - crear el reporte directamente
  const handleContinueCreating = async () => {
    clearReports();
    await createReport();
    setShowSimilarReports(false);
  };

  // Subir imágenes a Cloudinary
  const uploadImagesToCloudinary = async (images: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      setUploadProgress(`Subiendo imagen ${i + 1} de ${images.length}...`);
      
      // Si ya es una URL de Cloudinary, no subir de nuevo
      if (image.startsWith('https://res.cloudinary.com')) {
        uploadedUrls.push(image);
        continue;
      }
      
      // Subir data URL a Cloudinary
      const result = await uploadFromDataUrl(image, {
        folder: 'reportes',
        tags: ['reporte'],
      });
      
      uploadedUrls.push(result.secure_url);
    }
    
    return uploadedUrls;
  };

  // Función para crear/actualizar el reporte
  const createReport = async (): Promise<boolean> => {
    if (!selectedLocation) {
      toast.error('Debes seleccionar una ubicación en el mapa');
      return false;
    }

    setIsSubmitting(true);
    setUploadProgress('');

    try {
      if (!profile?.id) {
        toast.error('Debes iniciar sesión para crear un reporte');
        setIsSubmitting(false);
        return false;
      }

      // Subir imágenes a Cloudinary primero
      let cloudinaryUrls: string[] = [];
      if (imagenes.length > 0) {
        try {
          cloudinaryUrls = await uploadImagesToCloudinary(imagenes);
          setUploadProgress('Guardando reporte...');
        } catch (uploadError) {
          console.error('Error al subir imágenes:', uploadError);
          toast.error('Error al subir las imágenes');
          setIsSubmitting(false);
          setUploadProgress('');
          return false;
        }
      }

      // Construir objeto location con toda la información
      const locationData = {
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
        address: selectedLocation.address,
        puntoReferencia,
        edificio,
        piso,
        aulaSala,
        infoAdicional,
      };

      const reporteData: ReporteInsert = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        categoria_id: categoriaId || null,
        tipo_reporte_id: tipoReporteId || null,
        priority: priority as 'bajo' | 'medio' | 'alto' | 'urgente',
        status: status as 'pendiente' | 'en_progreso' | 'resuelto' | 'rechazado' | 'cancelado' | 'eliminado',
        visibility: visibility as 'publico' | 'privado',
        assigned_to: assignedTo || null,
        activo,
        imagenes: cloudinaryUrls.length > 0 ? cloudinaryUrls : null,
        location: locationData,
        user_id: profile.id,
      };

      if (isEditing && reporte) {
        await update({ id: reporte.id, updates: reporteData });
        toast.success('Reporte actualizado exitosamente');
      } else {
        const createdReporte = await create(reporteData);
        toast.success('Reporte creado exitosamente');
        
        // Auto-compartir en estado/feed si está habilitado en settings (usa caché)
        if (createdReporte && isAutoShareEnabled()) {
          try {
            const shareResult = await autoShareReport(createdReporte);
            if (shareResult.estadoCreated || shareResult.publicacionCreated) {
              toast.success('Reporte compartido automáticamente', {
                description: shareResult.estadoCreated && shareResult.publicacionCreated
                  ? 'Publicado en estado y feed'
                  : shareResult.estadoCreated
                    ? 'Publicado como estado'
                    : 'Publicado en el feed',
              });
            }
          } catch (shareError) {
            console.error('Error al auto-compartir reporte:', shareError);
            // No bloquear el flujo si falla el auto-share
          }
        }
      }

      onSuccess?.();
      navigate(defaultBackRoute);
      return true;
    } catch (error) {
      console.error('Error al guardar reporte:', error);
      toast.error(isEditing ? 'Error al actualizar el reporte' : 'Error al crear el reporte');
      return false;
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      if (nombre.trim().length < 2) {
        toast.error('El título debe tener al menos 2 caracteres');
      } else if (!selectedLocation) {
        toast.error('Debes seleccionar una ubicación en el mapa');
      }
      return;
    }

    // Verificar reportes similares antes de crear (solo si no se ha verificado aún)
    if (!isEditing && !similarChecked && selectedLocation) {
      const reports = await fetchSimilarReports(
        selectedLocation.latitude,
        selectedLocation.longitude,
        categoriaId || undefined,
        tipoReporteId || undefined
      );
      
      setSimilarChecked(true);
      
      if (reports.length > 0) {
        setShowSimilarReports(true);
        return; // No continuar con la creación
      }
    }

    await createReport();
  };

  return (
    <div className={cn('flex flex-col h-full', animationClasses.fadeIn)}>
      <FormHeader
        title={isEditing ? 'Editar Reporte' : 'Crear Nuevo Reporte'}
        description={
          isEditing
            ? 'Modifica los datos del reporte'
            : 'Completa los datos para crear un nuevo reporte'
        }
        icon={FileText}
        onBack={goBack}
        showBackButton={true}
      />

      {/* Modal de reportes similares */}
      <SimilarReportsFound
        reports={similarReports}
        open={showSimilarReports && similarReports.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setShowSimilarReports(false);
            // Resetear similarChecked para que se vuelva a verificar si cierra el modal
            setSimilarChecked(false);
          }
        }}
        onContinue={handleContinueCreating}
        onConfirm={handleConfirmSimilarReport}
        isConfirming={isConfirmingReport}
        isCreating={isSubmitting}
      />

      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sección: Información del Reporte */}
          <Card className="border border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h2 className="text-base font-medium text-foreground">
                  Información del Reporte
                </h2>
              </div>

              <div className="space-y-6">
                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-sm font-medium">
                    Título del Reporte <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    type="text"
                    placeholder="Ingresa el título del reporte"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="bg-input border-border"
                    required
                    minLength={2}
                    maxLength={200}
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <Label htmlFor="descripcion" className="text-sm font-medium">
                    Descripción
                  </Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Ingresa una descripción detallada (opcional)"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="bg-input border-border min-h-[100px] resize-y"
                    maxLength={2000}
                  />
                </div>

                {/* Categoría y Tipo de Reporte */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoria" className="text-sm font-medium">
                      Categoría
                    </Label>
                    <Select value={categoriaId} onValueChange={(value) => {
                      setCategoriaId(value);
                      setTipoReporteId(''); // Reset tipo when category changes
                    }}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesLoading ? (
                          <SelectItem value="loading" disabled>
                            Cargando...
                          </SelectItem>
                        ) : activeCategories.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            No hay categorías disponibles
                          </SelectItem>
                        ) : (
                          activeCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.nombre}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipoReporte" className="text-sm font-medium">
                      Tipo de Reporte
                    </Label>
                    <Select value={tipoReporteId} onValueChange={setTipoReporteId} disabled={!categoriaId}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder={categoriaId ? "Seleccionar tipo" : "Selecciona una categoría primero"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoReportesLoading ? (
                          <SelectItem value="loading" disabled>
                            Cargando...
                          </SelectItem>
                        ) : activeTipoReportes.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            {categoriaId ? 'No hay tipos para esta categoría' : 'Selecciona una categoría primero'}
                          </SelectItem>
                        ) : (
                          activeTipoReportes.map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              {tipo.nombre}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección: Estado y Configuración - Solo visible para roles administrativos */}
          {canViewConfigSection && (
            <Card className="border border-border shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <h2 className="text-base font-medium text-foreground">
                    Estado y Configuración
                  </h2>
                </div>

                <div className="space-y-6">
                  {/* Prioridad, Estado, Visibilidad */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-amber-600">Prioridad</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-green-600">Estado</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-blue-600">Visibilidad</Label>
                      <Select value={visibility} onValueChange={setVisibility}>
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VISIBILITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Asignar a */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Asignar a</Label>
                    <Select value={assignedTo || 'none'} onValueChange={(val) => setAssignedTo(val === 'none' ? '' : val)}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
                        {activeUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.username || user.email || 'Usuario sin nombre'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Switch Reporte activo */}
                  <div className="flex items-center gap-3">
                    <Switch
                      id="activo"
                      checked={activo}
                      onCheckedChange={setActivo}
                    />
                    <Label htmlFor="activo" className="text-sm font-medium cursor-pointer">
                      Reporte activo
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sección: Imágenes */}
          <Card className="border border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <h2 className="text-base font-medium text-foreground">
                  Imágenes
                </h2>
              </div>

              <div className="space-y-4">
                <CameraCapture
                  onCapture={handleImageCapture}
                  buttonText="Capturar Imagen"
                  buttonVariant="outline"
                  maxFileSize={5242880} // 5MB
                  allowedFormats={['jpg', 'png', 'jpeg', 'gif', 'webp']}
                  showLimits={true}
                />

                {/* Preview de imágenes con ReporteEvidencia */}
                {imagenes.length > 0 && (
                  <div className="mt-4">
                    <ReporteEvidencia imagenes={imagenes} />
                    {/* Botones para eliminar imágenes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                      {imagenes.map((_, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Eliminar {index + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sección: Ubicación */}
          <Card className="border border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-base font-medium text-foreground">
                    Ubicación
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseMyLocation}
                  className="gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  Usar mi ubicación
                </Button>
              </div>

              <div className="space-y-6">
                {/* Mapa */}
                <ReportFormMap
                  selectedLocation={selectedLocation}
                  onLocationSelect={setSelectedLocation}
                  className="rounded-lg overflow-hidden"
                />

                {/* Dirección */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Dirección</Label>
                  <Input
                    type="text"
                    placeholder="La dirección se mostrará automáticamente al seleccionar en el mapa"
                    value={selectedLocation?.address || ''}
                    readOnly
                    className="bg-muted border-border"
                  />
                </div>

                {/* Punto de Referencia y Edificio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Punto de Referencia</Label>
                    <Input
                      type="text"
                      placeholder="Ej: Cerca del auditorio principal"
                      value={puntoReferencia}
                      onChange={(e) => setPuntoReferencia(e.target.value)}
                      className="bg-input border-border"
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Edificio</Label>
                    <Input
                      type="text"
                      placeholder="Ej: Edificio A, Torre Norte"
                      value={edificio}
                      onChange={(e) => setEdificio(e.target.value)}
                      className="bg-input border-border"
                      maxLength={200}
                    />
                  </div>
                </div>

                {/* Piso y Aula/Sala */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Piso</Label>
                    <Input
                      type="text"
                      placeholder="Ej: 3er piso, Planta baja"
                      value={piso}
                      onChange={(e) => setPiso(e.target.value)}
                      className="bg-input border-border"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Aula/Sala</Label>
                    <Input
                      type="text"
                      placeholder="Ej: Aula 301, Laboratorio 2"
                      value={aulaSala}
                      onChange={(e) => setAulaSala(e.target.value)}
                      className="bg-input border-border"
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Información Adicional */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Información Adicional</Label>
                  <Textarea
                    placeholder="Cualquier información adicional que ayude a ubicar el incidente..."
                    value={infoAdicional}
                    onChange={(e) => setInfoAdicional(e.target.value)}
                    className="bg-input border-border min-h-[80px] resize-y"
                    maxLength={500}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <FormFooter
          cancelText="Cancelar"
          submitText={
            uploadProgress 
              ? uploadProgress 
              : isEditing 
                ? 'Guardar Cambios' 
                : 'Crear Reporte'
          }
          onCancel={handleCancel}
          isSubmitting={isSubmitting || isUploading}
          isValid={isValid}
          submitButtonType="submit"
        />
      </form>
    </div>
  );
}
