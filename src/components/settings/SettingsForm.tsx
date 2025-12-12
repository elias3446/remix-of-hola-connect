import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Settings, 
  Bell, 
  BellRing,
  MapPin, 
  Share2, 
  MessageSquare, 
  Palette,
  Clock,
  Trash2,
  Bot,
  Moon,
  Sun,
  Monitor,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FormHeader } from '@/components/ui/form-header';
import { FormFooter } from '@/components/ui/form-footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useUserDataReady } from '@/hooks/entidades/useUserDataReady';
import { useFormNavigation } from '@/hooks/controlador/useFormNavigation';
import { useTheme } from '@/contexts/ThemeContext';
import { usePushNotifications } from '@/hooks/controlador/usePushNotifications';
import { 
  animationClasses, 
  transitionClasses, 
  useOptimizedComponent 
} from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Settings = Database['public']['Tables']['settings']['Row'];

const DEFAULT_BACK_ROUTE = '/perfil';

// Opciones de visibilidad para auto-compartir
const VISIBILITY_OPTIONS = [
  { value: 'publico', label: 'Público' },
  { value: 'amigos', label: 'Solo amigos' },
  { value: 'privado', label: 'Privado' },
];

// Opciones de tema
const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
];

export function SettingsForm() {
  const { profile, settings: userSettings, isLoading: isLoadingData, isReady, userId } = useUserDataReady();
  const { setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { permission, isSupported, requestPermission } = usePushNotifications();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState<Partial<Settings>>({
    theme: 'system',
    enabled: true,
    real_time_tracking_enabled: true,
    auto_share_reports_enabled: false,
    auto_share_as_status: false,
    auto_share_in_messages: false,
    auto_share_visibility: 'publico',
    chat_persistence_enabled: true,
    chat_auto_clear: false,
    chat_retention_days: 30,
    chat_assistant_enabled: true,
    auto_delete_read: false,
    retention_days: 90,
  });
  
  // Optimización del componente
  useOptimizedComponent(
    { profileId: profile?.id, activeTab },
    { componentName: 'SettingsForm' }
  );

  // Navegación del formulario
  const { goBack } = useFormNavigation({
    defaultBackRoute: DEFAULT_BACK_ROUTE,
  });

  // Manejar solicitud de permisos de notificación push
  const handleRequestPushPermission = async () => {
    setIsRequestingPermission(true);
    try {
      // Limpiar flag de descarte para permitir que el prompt aparezca
      localStorage.removeItem('notification_prompt_dismissed');
      
      const granted = await requestPermission();
      if (granted) {
        toast.success('Notificaciones push activadas correctamente');
      } else {
        toast.error('No se pudo activar las notificaciones push');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Error al solicitar permisos');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Cargar configuración existente
  useEffect(() => {
    if (userSettings) {
      setFormData({
        theme: userSettings.theme || 'system',
        enabled: userSettings.enabled ?? true,
        real_time_tracking_enabled: userSettings.real_time_tracking_enabled ?? true,
        auto_share_reports_enabled: userSettings.auto_share_reports_enabled ?? false,
        auto_share_as_status: userSettings.auto_share_as_status ?? false,
        auto_share_in_messages: userSettings.auto_share_in_messages ?? false,
        auto_share_visibility: userSettings.auto_share_visibility || 'publico',
        chat_persistence_enabled: userSettings.chat_persistence_enabled ?? true,
        chat_auto_clear: userSettings.chat_auto_clear ?? false,
        chat_retention_days: userSettings.chat_retention_days ?? 30,
        chat_assistant_enabled: userSettings.chat_assistant_enabled ?? true,
        auto_delete_read: userSettings.auto_delete_read ?? false,
        retention_days: userSettings.retention_days ?? 90,
      });
    }
  }, [userSettings]);

  // Actualizar campo del formulario
  const updateField = useCallback(<K extends keyof Settings>(field: K, value: Settings[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Aplicar tema inmediatamente cuando se selecciona
    if (field === 'theme' && typeof value === 'string' && ['light', 'dark', 'system'].includes(value)) {
      setTheme(value as 'light' | 'dark' | 'system');
    }
    
    // Si se activa el tracking en tiempo real, limpiar el flag de descarte del prompt
    if (field === 'real_time_tracking_enabled' && value === true) {
      localStorage.removeItem('notification_prompt_dismissed');
    }
  }, [setTheme]);

  // Guardar configuración
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.id) {
      toast.error('No se pudo identificar el usuario');
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      // Verificar si existe configuración
      if (userSettings?.id) {
        // Actualizar existente
        const { error } = await supabase
          .from('settings')
          .update(updateData)
          .eq('id', userSettings.id);

        if (error) throw error;
      } else {
        // Crear nueva configuración
        const { error } = await supabase
          .from('settings')
          .insert({
            ...updateData,
            user_id: profile.id,
          });

        if (error) throw error;
      }

      toast.success('Configuración guardada exitosamente');
      
      // Actualizar caché de React Query con los nuevos settings
      const updatedSettings = {
        ...userSettings,
        ...updateData,
        id: userSettings?.id || 'new',
        user_id: profile.id,
      };
      
      if (userId) {
        queryClient.setQueryData(['settings', userId], updatedSettings);
      }
      
      // Actualizar localStorage para persistencia
      try {
        localStorage.setItem('user_cache:settings', JSON.stringify(updatedSettings));
        localStorage.setItem('user_cache:timestamp', Date.now().toString());
      } catch (e) {
        console.warn('Error updating settings cache:', e);
      }
      
      // Aplicar tema si cambió usando el ThemeContext
      if (formData.theme && ['light', 'dark', 'system'].includes(formData.theme)) {
        setTheme(formData.theme as 'light' | 'dark' | 'system');
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar LoadingScreen mientras carga
  if (isLoadingData || !isReady) {
    return <LoadingScreen message="Cargando configuración..." />;
  }

  // Si no hay perfil
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Settings className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">No se encontró el perfil</h2>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', animationClasses.fadeIn)}>
      <FormHeader
        title="Configuración"
        description="Personaliza tu experiencia en la aplicación"
        icon={Settings}
        onBack={goBack}
        showBackButton={true}
      />

      <form id="settings-form" onSubmit={handleSubmit} className="flex flex-col flex-1">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
              <TabsTrigger value="general" className="gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="notificaciones" className="gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notificaciones</span>
              </TabsTrigger>
              <TabsTrigger value="compartir" className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Compartir</span>
              </TabsTrigger>
              <TabsTrigger value="mensajes" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Mensajes</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: General */}
            <TabsContent value="general" className={animationClasses.fadeIn}>
              <Card className={cn('border border-border shadow-sm', transitionClasses.card)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Configuración General
                  </CardTitle>
                  <CardDescription>
                    Personaliza la apariencia y comportamiento general
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tema */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Tema de la aplicación</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {THEME_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateField('theme', option.value)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all',
                              formData.theme === option.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            )}
                          >
                            <Icon className="h-6 w-6" />
                            <span className="text-sm font-medium">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Notificaciones activas */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Notificaciones activas</Label>
                      <p className="text-sm text-muted-foreground">
                        Habilitar o deshabilitar todas las notificaciones
                      </p>
                    </div>
                    <Switch
                      checked={formData.enabled ?? true}
                      onCheckedChange={(checked) => updateField('enabled', checked)}
                    />
                  </div>

                  <Separator />

                  {/* Rastreo en tiempo real */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        Rastreo en tiempo real
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Permitir notificaciones de reportes cercanos
                      </p>
                    </div>
                    <Switch
                      checked={formData.real_time_tracking_enabled ?? true}
                      onCheckedChange={(checked) => updateField('real_time_tracking_enabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Notificaciones */}
            <TabsContent value="notificaciones" className={animationClasses.fadeIn}>
              <Card className={cn('border border-border shadow-sm', transitionClasses.card)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Preferencias de Notificaciones
                  </CardTitle>
                  <CardDescription>
                    Configura cómo y cuándo recibes notificaciones
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Notificaciones Push del navegador */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <BellRing className="h-4 w-4 text-muted-foreground" />
                          Notificaciones Push del navegador
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Recibe alertas nativas del sistema operativo
                        </p>
                      </div>
                      {permission === 'granted' ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Activadas
                        </div>
                      ) : permission === 'denied' ? (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <XCircle className="h-4 w-4" />
                          Bloqueadas
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleRequestPushPermission}
                          disabled={isRequestingPermission || !isSupported}
                        >
                          {isRequestingPermission ? 'Activando...' : 'Activar'}
                        </Button>
                      )}
                    </div>
                    {permission === 'denied' && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                        Las notificaciones están bloqueadas. Para activarlas, haz clic en el icono de candado en la barra de direcciones del navegador y permite las notificaciones.
                      </p>
                    )}
                    {!isSupported && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                        Tu navegador no soporta notificaciones push.
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Auto eliminar leídas */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                        Eliminar automáticamente leídas
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Eliminar notificaciones automáticamente después de leerlas
                      </p>
                    </div>
                    <Switch
                      checked={formData.auto_delete_read ?? false}
                      onCheckedChange={(checked) => updateField('auto_delete_read', checked)}
                    />
                  </div>

                  <Separator />

                  {/* Días de retención */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Días de retención de notificaciones
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Tiempo que se conservarán las notificaciones antes de eliminarse
                    </p>
                    <Input
                      type="number"
                      min={7}
                      max={365}
                      value={formData.retention_days ?? 90}
                      onChange={(e) => updateField('retention_days', parseInt(e.target.value) || 90)}
                      className="w-32 bg-input border-border"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Compartir */}
            <TabsContent value="compartir" className={animationClasses.fadeIn}>
              <Card className={cn('border border-border shadow-sm', transitionClasses.card)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-primary" />
                    Opciones de Compartir
                  </CardTitle>
                  <CardDescription>
                    Configura cómo se comparten automáticamente tus reportes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Auto compartir reportes */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Compartir reportes automáticamente</Label>
                      <p className="text-sm text-muted-foreground">
                        Publicar automáticamente tus reportes en la red social
                      </p>
                    </div>
                    <Switch
                      checked={formData.auto_share_reports_enabled ?? false}
                      onCheckedChange={(checked) => updateField('auto_share_reports_enabled', checked)}
                    />
                  </div>

                  <Separator />

                  {/* Compartir como estado */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Compartir como estado</Label>
                      <p className="text-sm text-muted-foreground">
                        Publicar reportes como historias/estados
                      </p>
                    </div>
                    <Switch
                      checked={formData.auto_share_as_status ?? false}
                      onCheckedChange={(checked) => updateField('auto_share_as_status', checked)}
                      disabled={!formData.auto_share_reports_enabled}
                    />
                  </div>

                  <Separator />

                  {/* Compartir en mensajes */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Compartir en mensajes</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar reportes automáticamente a contactos cercanos
                      </p>
                    </div>
                    <Switch
                      checked={formData.auto_share_in_messages ?? false}
                      onCheckedChange={(checked) => updateField('auto_share_in_messages', checked)}
                      disabled={!formData.auto_share_reports_enabled}
                    />
                  </div>

                  <Separator />

                  {/* Visibilidad de auto-compartir */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Visibilidad por defecto</Label>
                    <p className="text-sm text-muted-foreground">
                      Quién puede ver tus reportes compartidos automáticamente
                    </p>
                    <Select
                      value={formData.auto_share_visibility || 'publico'}
                      onValueChange={(value) => updateField('auto_share_visibility', value)}
                      disabled={!formData.auto_share_reports_enabled}
                    >
                      <SelectTrigger className="w-48 bg-input border-border">
                        <SelectValue placeholder="Seleccionar visibilidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {VISIBILITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Mensajes */}
            <TabsContent value="mensajes" className={animationClasses.fadeIn}>
              <Card className={cn('border border-border shadow-sm', transitionClasses.card)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Configuración de Mensajes
                  </CardTitle>
                  <CardDescription>
                    Personaliza el comportamiento del chat y mensajes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Duración del chat */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Duración del chat</Label>
                      <p className="text-sm text-muted-foreground">
                        Mantener historial de conversaciones guardado
                      </p>
                    </div>
                    <Switch
                      checked={formData.chat_persistence_enabled ?? true}
                      onCheckedChange={(checked) => updateField('chat_persistence_enabled', checked)}
                    />
                  </div>

                  <Separator />

                  {/* Auto limpiar chat */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                        Limpiar automáticamente
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Eliminar mensajes antiguos automáticamente
                      </p>
                    </div>
                    <Switch
                      checked={formData.chat_auto_clear ?? false}
                      onCheckedChange={(checked) => updateField('chat_auto_clear', checked)}
                      disabled={!formData.chat_persistence_enabled}
                    />
                  </div>

                  <Separator />

                  {/* Días de retención del chat */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Días de retención de mensajes
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Tiempo que se conservarán los mensajes antes de eliminarse
                    </p>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={formData.chat_retention_days ?? 30}
                      onChange={(e) => updateField('chat_retention_days', parseInt(e.target.value) || 30)}
                      className="w-32 bg-input border-border"
                      disabled={!formData.chat_auto_clear || !formData.chat_persistence_enabled}
                    />
                  </div>

                  <Separator />

                  {/* Asistente de chat */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        Asistente de chat
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Habilitar sugerencias inteligentes en el chat
                      </p>
                    </div>
                    <Switch
                      checked={formData.chat_assistant_enabled ?? true}
                      onCheckedChange={(checked) => updateField('chat_assistant_enabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <FormFooter
          onCancel={goBack}
          submitText="Guardar Configuración"
          isSubmitting={isSubmitting}
          isValid={true}
          formId="settings-form"
        />
      </form>
    </div>
  );
}
