import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Info, AlertTriangle, Mail, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FormHeader } from '@/components/ui/form-header';
import { FormFooter } from '@/components/ui/form-footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PasswordStrength } from '@/components/ui/password-strength';
import { CameraCapture } from '@/components/ui/camera-capture';
import { ReporteEvidencia } from '@/components/ui/ReporteEvidencia';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFormNavigation } from '@/hooks/controlador/useFormNavigation';
import { useUpdateUser } from '@/hooks/users/useUpdateUser';
import { useChangePassword } from '@/hooks/controlador/useChangePassword';
import { useUserDataReady } from '@/hooks/entidades/useUserDataReady';
import { useCloudinaryUpload } from '@/hooks/controlador/useCloudinaryUpload';
import { useValidateEmail } from '@/hooks/controlador/useValidateEmail';
import { useGeneratePassword } from '@/hooks/controlador/useGeneratePassword';
import { 
  animationClasses, 
  transitionClasses, 
  useOptimizedComponent,
} from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';

const DEFAULT_BACK_ROUTE = '/perfil';

export function EditProfileForm() {
  const navigate = useNavigate();
  const { profile, isLoading: isLoadingProfile, isReady } = useUserDataReady();
  
  const { updateUser, loading: isUpdating } = useUpdateUser();
  const { changePassword, loading: isChangingPassword } = useChangePassword({
    onSuccess: () => {
      toast.success('Contraseña actualizada exitosamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error) => toast.error(error),
  });
  const { uploadFromDataUrl, isUploading } = useCloudinaryUpload();
  
  // Estado del formulario - Información Personal
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  
  // Hook para generar contraseña (para el modal)
  const {
    password: generatedPassword,
    generatePassword,
  } = useGeneratePassword({ length: 12 });
  
  // Estado para email editable en formulario
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  
  // Estado para contraseña actual en formulario
  const [currentEmailPassword, setCurrentEmailPassword] = useState('');
  const [showCurrentEmailPassword, setShowCurrentEmailPassword] = useState(false);
  
  // Estado para el diálogo de confirmación con nueva contraseña
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmailPassword, setNewEmailPassword] = useState('');
  const [showNewEmailPassword, setShowNewEmailPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  // Estado del formulario - Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estado de la pestaña activa
  const [activeTab, setActiveTab] = useState('info');
  
  // Validación de email
  const { isValid: isEmailValid, error: emailError } = useValidateEmail(email);
  
  // Optimización del componente
  useOptimizedComponent(
    { nombre, apellido, activeTab },
    { componentName: 'EditProfileForm' }
  );

  // Cargar datos del perfil cuando estén disponibles
  useEffect(() => {
    if (profile) {
      // Separar nombre y apellido
      const nameParts = (profile.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setNombre(firstName);
      setApellido(lastName);
      setAvatar(profile.avatar || null);
      setEmail(profile.email || '');
      setOriginalEmail(profile.email || '');
    }
  }, [profile]);

  // Navegación del formulario
  const { goBack } = useFormNavigation({
    defaultBackRoute: DEFAULT_BACK_ROUTE,
  });

  // Validación del formulario de información personal
  const isInfoFormValid = useMemo(() => {
    return nombre.trim().length >= 2;
  }, [nombre]);

  // Validación del formulario de contraseña
  const isPasswordFormValid = useMemo(() => {
    if (!currentPassword || !newPassword || !confirmPassword) return false;
    if (newPassword !== confirmPassword) return false;
    if (newPassword.length < 8) return false;
    if (!/[A-Z]/.test(newPassword)) return false;
    if (!/[a-z]/.test(newPassword)) return false;
    if (!/\d/.test(newPassword)) return false;
    if (!/[!@#$%^&*]/.test(newPassword)) return false;
    return true;
  }, [currentPassword, newPassword, confirmPassword]);

  const isSubmitting = isUpdating || isChangingPassword || isUploading || isVerifyingPassword;

  // Obtener iniciales del usuario para el avatar
  const getInitials = useCallback(() => {
    const first = nombre.charAt(0).toUpperCase();
    const last = apellido.charAt(0).toUpperCase();
    return `${first}${last}` || 'U';
  }, [nombre, apellido]);

  // Manejar captura de avatar
  const handleAvatarCapture = async (imageUrl: string) => {
    try {
      // Subir a Cloudinary
      const result = await uploadFromDataUrl(imageUrl, { folder: 'avatars' });
      if (result?.secure_url) {
        setAvatar(result.secure_url);
        toast.success('Imagen capturada exitosamente');
      }
    } catch (error) {
      console.error('Error al subir imagen:', error);
      toast.error('Error al subir la imagen');
    }
  };

  // Detectar si el email ha cambiado
  const emailHasChanged = email !== originalEmail && email.length > 0;

  // Abrir diálogo de confirmación con nueva contraseña (verificando contraseña actual)
  const handleOpenEmailDialog = async () => {
    if (!emailHasChanged || !currentEmailPassword) {
      if (!currentEmailPassword) {
        toast.error('Ingresa tu contraseña actual para verificar tu identidad');
      }
      return;
    }

    // Verificar contraseña actual antes de abrir el modal
    setIsVerifyingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: originalEmail,
        password: currentEmailPassword,
      });

      if (signInError) {
        toast.error('La contraseña actual es incorrecta');
        return;
      }

      // Contraseña válida, abrir modal
      generatePassword();
      setShowEmailDialog(true);
    } catch (error) {
      toast.error('Error al verificar la contraseña');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Efecto para establecer la contraseña generada
  useEffect(() => {
    if (showEmailDialog && generatedPassword) {
      setNewEmailPassword(generatedPassword);
    }
  }, [generatedPassword, showEmailDialog]);

  // Generar nueva contraseña para el email
  const handleGenerateEmailPassword = () => {
    generatePassword();
  };

  // Cancelar cambio de email - restaurar original
  const handleCancelEmailChange = () => {
    setEmail(originalEmail);
    setCurrentEmailPassword('');
    setNewEmailPassword('');
    setShowEmailDialog(false);
  };

  // Confirmar cambio de email propio (usando función RPC sin permisos de admin)
  const handleConfirmEmailChange = async () => {
    if (!profile?.id || !emailHasChanged) return;

    setIsVerifyingPassword(true);
    try {
      // PASO 1: Llamar a complete_own_email_change (sin verificación de permisos admin)
      const { data: changeResult, error: changeError } = await supabase
        .rpc('complete_own_email_change', {
          p_new_email: email
        });

      if (changeError) {
        throw new Error(`Error al cambiar email: ${changeError.message}`);
      }

      const result = changeResult as { success: boolean; profile_id: string };
      
      if (!result?.success) {
        throw new Error('Error al completar el cambio de email');
      }

      // PASO 2: Crear nuevo usuario en auth con el nuevo email
      const { error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: newEmailPassword,
        options: {
          data: {
            existing_profile_id: result.profile_id,
            signup_source: 'self_email_change',
            password: newEmailPassword
          }
        }
      });

      if (signUpError) {
        throw new Error(`Error al crear nuevo usuario: ${signUpError.message}`);
      }

      setShowEmailDialog(false);
      setOriginalEmail(email);
      setCurrentEmailPassword('');
      setNewEmailPassword('');
      toast.success(
        'Email cambiado exitosamente. Guarda tu nueva contraseña.',
        { duration: 5000 }
      );
      
      // Cerrar sesión ya que el usuario cambió
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cambiar el email';
      toast.error(message);
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Manejar envío del formulario de información personal
  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isInfoFormValid || !profile?.id) {
      toast.error('Por favor, completa todos los campos requeridos');
      return;
    }

    // Si el email cambió, abrir modal de confirmación
    if (emailHasChanged && isEmailValid) {
      if (!currentEmailPassword) {
        toast.error('Ingresa tu contraseña actual para cambiar el email');
        return;
      }
      handleOpenEmailDialog();
      return;
    }

    try {
      // Actualizar solo nombre y avatar (sin cambio de email)
      const result = await updateUser(profile.id, {
        name: `${nombre.trim()} ${apellido.trim()}`.trim(),
        avatar: avatar || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Perfil actualizado exitosamente');
      navigate(DEFAULT_BACK_ROUTE);
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      toast.error('Error al actualizar el perfil');
    }
  };

  // Manejar envío del formulario de contraseña
  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordFormValid) {
      toast.error('Por favor, verifica los requisitos de contraseña');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    await changePassword(currentPassword, newPassword, confirmPassword);
  };

  // Mostrar LoadingScreen mientras carga
  if (isLoadingProfile || !isReady) {
    return <LoadingScreen message="Cargando perfil..." />;
  }

  // Si no hay perfil
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <User className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">No se encontró el perfil</h2>
        <Button onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', animationClasses.fadeIn)}>
      <FormHeader
        title="Editar Mi Perfil"
        description="Actualiza tu información personal"
        icon={User}
        onBack={goBack}
        showBackButton={true}
      />

      <div className="flex flex-col flex-1">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-3xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="info" className="gap-2">
                <User className="h-4 w-4" />
                <span>Información Personal</span>
              </TabsTrigger>
              <TabsTrigger value="password" className="gap-2">
                <Lock className="h-4 w-4" />
                <span>Contraseña</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Información Personal */}
            <TabsContent value="info" className={animationClasses.fadeIn}>
              <form id="info-form" onSubmit={handleSubmitInfo}>
                <Card className={cn('border border-border shadow-sm', transitionClasses.card)}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-6">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-base font-medium text-foreground">
                        Información Personal
                      </h2>
                    </div>

                    <div className="space-y-6">
                      {/* Avatar */}
                      <div className="flex flex-col items-center gap-4">
                        {avatar ? (
                          <ReporteEvidencia 
                            imagenes={[avatar]} 
                            avatarMode 
                            avatarSize="lg"
                          />
                        ) : (
                          <Avatar className="h-24 w-24 border-2 border-border">
                            <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                              {getInitials()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <CameraCapture
                          onCapture={handleAvatarCapture}
                          buttonText="Cambiar Avatar"
                          buttonVariant="outline"
                          maxFileSize={5242880}
                          allowedFormats={['jpg', 'png', 'gif', 'webp']}
                          showLimits={true}
                        />
                      </div>

                      {/* Nombre y Apellido */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nombre" className="text-sm font-medium">
                            Nombre <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="nombre"
                            type="text"
                            placeholder="Ingresa tu nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="bg-input border-border"
                            required
                            minLength={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apellido" className="text-sm font-medium">
                            Apellido
                          </Label>
                          <Input
                            id="apellido"
                            type="text"
                            placeholder="Ingresa tu apellido"
                            value={apellido}
                            onChange={(e) => setApellido(e.target.value)}
                            className="bg-input border-border"
                          />
                        </div>
                      </div>

                      {/* Email - editable directamente */}
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Correo Electrónico <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="correo@ejemplo.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={cn(
                            'bg-input border-border',
                            emailError && email.length > 0 && 'border-destructive',
                            emailHasChanged && isEmailValid && 'border-amber-500'
                          )}
                        />
                        {emailError && email.length > 0 && (
                          <p className="text-sm text-destructive">{emailError}</p>
                        )}
                        {emailHasChanged && isEmailValid && (
                          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                            <Info className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                            <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
                              <strong>Importante:</strong> Para cambiar tu email, debes ingresar tu contraseña actual. Se generará una nueva contraseña automáticamente y se cerrarán TODAS tus sesiones activas por seguridad.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Campo de contraseña actual cuando el email cambia */}
                      {emailHasChanged && isEmailValid && (
                        <div className="space-y-2">
                          <Label htmlFor="currentEmailPassword" className="text-sm font-medium">
                            Contraseña Actual <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="currentEmailPassword"
                              type={showCurrentEmailPassword ? 'text' : 'password'}
                              placeholder="Tu contraseña actual"
                              value={currentEmailPassword}
                              onChange={(e) => setCurrentEmailPassword(e.target.value)}
                              className="bg-input border-border pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowCurrentEmailPassword(!showCurrentEmailPassword)}
                            >
                              {showCurrentEmailPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>

            {/* Tab: Contraseña */}
            <TabsContent value="password" className={animationClasses.fadeIn}>
              <form id="password-form" onSubmit={handleSubmitPassword}>
                <Card className={cn('border border-border shadow-sm', transitionClasses.card)}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-base font-medium text-foreground">
                        Cambiar Contraseña
                      </h2>
                    </div>

                    {/* Aviso de seguridad */}
                    <Alert className="mb-6 bg-muted/50 border-border">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Seguridad:</strong> Por tu seguridad, necesitamos verificar tu contraseña actual antes de cambiarla.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      {/* Contraseña Actual */}
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-medium">
                          Contraseña Actual <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? 'text' : 'password'}
                            placeholder="Ingresa tu contraseña actual"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="bg-input border-border pr-10"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Nueva Contraseña */}
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium">
                          Nueva Contraseña <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Ingresa tu nueva contraseña"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-input border-border pr-10"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Confirmar Nueva Contraseña */}
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium">
                          Confirmar Nueva Contraseña <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirma tu nueva contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={cn(
                              'bg-input border-border pr-10',
                              confirmPassword && newPassword !== confirmPassword && 'border-destructive'
                            )}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Las contraseñas no coinciden
                          </p>
                        )}
                      </div>

                      {/* Requisitos de contraseña */}
                      <PasswordStrength 
                        password={newPassword} 
                        title="Requisitos de contraseña:"
                      />
                    </div>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* FormFooter - fuera del área scrollable */}
        {activeTab === 'info' ? (
          <FormFooter
            cancelText="Cancelar"
            submitText={isVerifyingPassword ? "Verificando..." : (emailHasChanged ? "Verificar y Continuar" : "Guardar Cambios")}
            onCancel={goBack}
            isSubmitting={isSubmitting}
            isValid={isInfoFormValid && (!emailHasChanged || (isEmailValid && !!currentEmailPassword))}
            submitButtonType="submit"
            formId="info-form"
          />
        ) : (
          <FormFooter
            cancelText="Cancelar"
            submitText="Actualizar Contraseña"
            onCancel={goBack}
            isSubmitting={isSubmitting}
            isValid={isPasswordFormValid}
            submitButtonType="submit"
            formId="password-form"
          />
        )}
      </div>

      {/* Diálogo de confirmación de cambio de email con nueva contraseña */}
      <Dialog open={showEmailDialog} onOpenChange={(open) => {
        if (!open) handleCancelEmailChange();
      }}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Confirmar Cambio de Email
            </DialogTitle>
            <DialogDescription>
              Se generará una nueva contraseña para tu cuenta con el nuevo email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email Actual</Label>
                <p className="text-sm font-medium truncate">{originalEmail}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nuevo Email</Label>
                <p className="text-sm font-medium text-primary truncate">{email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newEmailPassword" className="text-sm font-medium">
                Nueva Contraseña <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="newEmailPassword"
                    type={showNewEmailPassword ? 'text' : 'password'}
                    value={newEmailPassword}
                    onChange={(e) => setNewEmailPassword(e.target.value)}
                    className="bg-input border-border pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewEmailPassword(!showNewEmailPassword)}
                  >
                    {showNewEmailPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateEmailPassword}
                  className="shrink-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <PasswordStrength password={newEmailPassword} />
            </div>

            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <AlertTitle className="text-amber-800 dark:text-amber-400 text-sm font-medium">
                Importante
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
                Guarda tu nueva contraseña. Deberás usarla para iniciar sesión con tu nuevo correo.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEmailChange}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmEmailChange}
              disabled={!newEmailPassword || newEmailPassword.length < 8 || isVerifyingPassword}
              className="w-full sm:w-auto"
            >
              {isVerifyingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cambiando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
