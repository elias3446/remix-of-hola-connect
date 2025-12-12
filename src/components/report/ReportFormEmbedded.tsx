import { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, MapPin, Navigation, X, Camera, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CameraCapture } from '@/components/ui/camera-capture';
import { ReportFormMap } from '@/components/Map';
import { ReporteEvidencia } from '@/components/ui/ReporteEvidencia';
import {
  useOptimizedCategories,
  useOptimizedTipoReportes,
  useOptimizedUsers,
  useOptimizedUserRolesList,
  useUserDataReady,
} from '@/hooks/entidades';
import { useGlobalLocation } from '@/contexts/LocationContext';
import { hasRole } from '@/hooks/entidades/useOptimizedUserRoles';
import { toast } from 'sonner';
import type { BulkUploadEditFormProps } from '@/components/ui/bulk-upload';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
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

export function ReportFormEmbedded({ rowData, onSave, onCancel }: BulkUploadEditFormProps) {
  const { data: categories = [], isLoading: categoriesLoading } = useOptimizedCategories();
  const { data: tipoReportes = [], isLoading: tipoReportesLoading } = useOptimizedTipoReportes();
  const { data: users = [] } = useOptimizedUsers();
  const { data: allUserRoles = [] } = useOptimizedUserRolesList();
  const globalLocation = useGlobalLocation();
  
  // Obtener roles del usuario desde el caché de React Query
  const { userRoles } = useUserDataReady();

  // Verificar si el usuario puede ver Estado y Configuración
  const canViewConfigSection = useMemo(() => {
    if (!userRoles) return false;
    return ADMIN_ROLES.some(role => hasRole(userRoles, role));
  }, [userRoles]);

  // Estado del formulario - Información del Reporte
  const [nombre, setNombre] = useState(rowData.nombre || rowData.titulo || '');
  const [descripcion, setDescripcion] = useState(rowData.descripcion || '');
  const [categoriaId, setCategoriaId] = useState('');
  const [tipoReporteId, setTipoReporteId] = useState('');

  // Estado y Configuración
  const [priority, setPriority] = useState<string>(rowData.prioridad || 'medio');
  const [status, setStatus] = useState<string>(rowData.estado || 'pendiente');
  const [visibility, setVisibility] = useState<string>(rowData.visibilidad || 'publico');
  const [assignedTo, setAssignedTo] = useState(rowData.asignado_a || '');
  const [activo, setActivo] = useState(rowData.activo !== 'false');

  // Imágenes (se mantienen localmente como data URLs hasta procesar)
  const [imagenes, setImagenes] = useState<string[]>([]);

  // Ubicación
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [puntoReferencia, setPuntoReferencia] = useState(rowData.punto_referencia || '');
  const [edificio, setEdificio] = useState(rowData.edificio || '');
  const [piso, setPiso] = useState(rowData.piso || '');
  const [aulaSala, setAulaSala] = useState(rowData.aula_sala || '');
  const [infoAdicional, setInfoAdicional] = useState(rowData.info_adicional || '');

  // Inicializar datos desde rowData
  useEffect(() => {
    setNombre(rowData.nombre || rowData.titulo || '');
    setDescripcion(rowData.descripcion || '');
    setPriority(rowData.prioridad || 'medio');
    setStatus(rowData.estado || 'pendiente');
    setVisibility(rowData.visibilidad || 'publico');
    setAssignedTo(rowData.asignado_a || '');
    setActivo(rowData.activo !== 'false');
    setPuntoReferencia(rowData.punto_referencia || '');
    setEdificio(rowData.edificio || '');
    setPiso(rowData.piso || '');
    setAulaSala(rowData.aula_sala || '');
    setInfoAdicional(rowData.info_adicional || '');

    // Inicializar ubicación desde rowData
    const lat = rowData.latitud ? parseFloat(rowData.latitud) : null;
    const lng = rowData.longitud ? parseFloat(rowData.longitud) : null;
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setSelectedLocation({
        latitude: lat,
        longitude: lng,
        address: rowData.direccion || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      });
    } else {
      setSelectedLocation(null);
    }

    // Inicializar categoría y tipo por nombre
    if (rowData.categoria) {
      const cat = categories.find(c => c.nombre.toLowerCase() === rowData.categoria.toLowerCase());
      if (cat) setCategoriaId(cat.id);
    }
    if (rowData.tipo_reporte) {
      const tipo = tipoReportes.find(t => t.nombre.toLowerCase() === rowData.tipo_reporte.toLowerCase());
      if (tipo) setTipoReporteId(tipo.id);
    }

    // Inicializar imágenes
    if (rowData.imagenes) {
      try {
        const imgs = JSON.parse(rowData.imagenes);
        if (Array.isArray(imgs)) setImagenes(imgs);
      } catch {
        // Si no es JSON, intentar como string separado por comas
        setImagenes(rowData.imagenes.split(',').filter(Boolean));
      }
    } else {
      setImagenes([]);
    }
  }, [rowData, categories, tipoReportes]);

  // Filtrar categorías y tipos activos
  const activeCategories = categories.filter((cat) => cat.activo && !cat.deleted_at);
  const activeTipoReportes = useMemo(() => {
    return tipoReportes.filter((tipo) => {
      if (!tipo.activo || tipo.deleted_at) return false;
      if (categoriaId && tipo.category_id !== categoriaId) return false;
      return true;
    });
  }, [tipoReportes, categoriaId]);

  // Usuarios activos con permiso "editar_reporte" para asignar
  const activeUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.deleted_at || user.estado !== 'activo') return false;
      const userRole = allUserRoles.find((role) => role.user_id === user.id);
      if (!userRole?.permisos) return false;
      return userRole.permisos.includes('editar_reporte');
    });
  }, [users, allUserRoles]);

  // Validación
  const isValid = nombre.trim().length >= 2;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    // Obtener nombres de categoría y tipo
    const categoriaName = categories.find(c => c.id === categoriaId)?.nombre || rowData.categoria || '';
    const tipoReporteName = tipoReportes.find(t => t.id === tipoReporteId)?.nombre || rowData.tipo_reporte || '';

    onSave({
      ...rowData,
      nombre: nombre.trim(),
      titulo: nombre.trim(),
      descripcion: descripcion.trim(),
      categoria: categoriaName,
      categoria_id: categoriaId,
      tipo_reporte: tipoReporteName,
      tipo_reporte_id: tipoReporteId,
      prioridad: priority,
      estado: status,
      visibilidad: visibility,
      asignado_a: assignedTo,
      activo: activo ? 'true' : 'false',
      latitud: selectedLocation?.latitude?.toString() || '',
      longitud: selectedLocation?.longitude?.toString() || '',
      direccion: selectedLocation?.address || '',
      punto_referencia: puntoReferencia.trim(),
      edificio: edificio.trim(),
      piso: piso.trim(),
      aula_sala: aulaSala.trim(),
      info_adicional: infoAdicional.trim(),
      imagenes: imagenes.length > 0 ? JSON.stringify(imagenes) : '',
    });
  };

  return (
    <>
      <DialogHeader className="p-6 pb-2">
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Editar Reporte
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="p-6 pt-2 space-y-6 overflow-y-auto flex-1">
          {/* Información del Reporte */}
          <Card className="border border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h2 className="text-base font-medium text-foreground">
                  Información del Reporte
                </h2>
              </div>

              <div className="space-y-4">
                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-sm font-medium">
                    Título <span className="text-destructive">*</span>
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
                    className="bg-input border-border min-h-[80px] resize-none"
                    maxLength={2000}
                  />
                </div>

                {/* Categoría y Tipo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Categoría</Label>
                    <Select value={categoriaId} onValueChange={(value) => {
                      setCategoriaId(value);
                      setTipoReporteId('');
                    }}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesLoading ? (
                          <SelectItem value="loading" disabled>Cargando...</SelectItem>
                        ) : activeCategories.length === 0 ? (
                          <SelectItem value="empty" disabled>No hay categorías disponibles</SelectItem>
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
                    <Label className="text-sm font-medium">Tipo de Reporte</Label>
                    <Select value={tipoReporteId} onValueChange={setTipoReporteId} disabled={!categoriaId}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder={categoriaId ? "Seleccionar tipo" : "Selecciona una categoría primero"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoReportesLoading ? (
                          <SelectItem value="loading" disabled>Cargando...</SelectItem>
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

          {/* Estado y Configuración - Solo visible para roles administrativos */}
          {canViewConfigSection && (
            <Card className="border border-border shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <h2 className="text-base font-medium text-foreground">
                    Estado y Configuración
                  </h2>
                </div>

                <div className="space-y-4">
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

          {/* Imágenes */}
          <Card className="border border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <h2 className="text-base font-medium text-foreground">
                  Imágenes
                </h2>
                <span className="text-xs text-muted-foreground ml-auto">
                  Se subirán al procesar
                </span>
              </div>

              <div className="space-y-4">
                <CameraCapture
                  onCapture={handleImageCapture}
                  buttonText="Capturar Imagen"
                  buttonVariant="outline"
                  maxFileSize={5242880}
                  allowedFormats={['jpg', 'png', 'jpeg', 'gif', 'webp']}
                  showLimits={true}
                />

                {/* Preview de imágenes */}
                {imagenes.length > 0 && (
                  <div className="mt-4">
                    <ReporteEvidencia imagenes={imagenes} />
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

          {/* Ubicación */}
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

              <div className="space-y-4">
                {/* Mapa */}
                <div className="h-[250px] rounded-lg overflow-hidden border border-border">
                  <ReportFormMap
                    selectedLocation={selectedLocation}
                    onLocationSelect={setSelectedLocation}
                    className="h-full"
                  />
                </div>

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
                    className="bg-input border-border min-h-[60px] resize-none"
                    maxLength={500}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="p-6 pt-4 gap-2 shrink-0 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isValid}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
