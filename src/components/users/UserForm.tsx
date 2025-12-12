import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { User, Eye, EyeOff, RefreshCw, AlertTriangle, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { FormHeader } from '@/components/ui/form-header';
import { FormFooter } from '@/components/ui/form-footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingScreen } from '@/components/LoadingScreen';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFormNavigation } from '@/hooks/controlador/useFormNavigation';
import { useCreateUser } from '@/hooks/users/useCreateUser';
import { useUpdateUser } from '@/hooks/users/useUpdateUser';
import { useOptimizedUsers } from '@/hooks/entidades/useOptimizedUsers';
import { useOptimizedUserRolesList } from '@/hooks/entidades/useOptimizedUserRolesList';
import { useValidateEmail } from '@/hooks/controlador/useValidateEmail';
import { useGeneratePassword } from '@/hooks/controlador/useGeneratePassword';
import { useRolePermissions } from '@/hooks/controlador/useRolePermissions';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';
import { useChangeUserEmail } from '@/hooks/controlador/useChangeUserEmail';
import { PasswordStrength } from '@/components/ui/password-strength';
import { animationClasses } from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];

interface LocationState {
  from?: string;
}

const DEFAULT_BACK_ROUTE = '/usuarios';

// Definición de roles con sus colores y descripciones
const USER_ROLES: { value: UserRole; label: string; description: string; color: string }[] = [
  { value: 'super_admin', label: 'Super Admin', description: 'Rol de super administrador con acceso total al sistema', color: 'bg-red-500' },
  { value: 'administrador', label: 'Administrador', description: 'Rol de administrador con todos los permisos del sistema', color: 'bg-red-500' },
  { value: 'mantenimiento', label: 'Mantenimiento', description: 'Rol de mantenimiento con permisos específicos', color: 'bg-blue-500' },
  { value: 'usuario_regular', label: 'Usuario Regular', description: 'Rol básico de usuario con permisos limitados', color: 'bg-blue-500' },
  { value: 'estudiante_personal', label: 'Estudiante/Personal', description: 'Estudiante o personal de la universidad', color: 'bg-green-500' },
  { value: 'operador_analista', label: 'Operador/Analista', description: 'Operador o analista del sistema', color: 'bg-muted-foreground' },
  { value: 'seguridad_uce', label: 'Seguridad UCE', description: 'Personal de seguridad de la universidad', color: 'bg-muted-foreground' },
];

// Agrupación de permisos por categoría
const PERMISSION_GROUPS: { title: string; permissions: { value: UserPermission; label: string }[] }[] = [
  {
    title: 'Reportes',
    permissions: [
      { value: 'ver_reporte', label: 'Ver Reportes' },
      { value: 'crear_reporte', label: 'Crear Reportes' },
      { value: 'editar_reporte', label: 'Editar Reportes' },
      { value: 'eliminar_reporte', label: 'Eliminar Reportes' },
    ],
  },
  {
    title: 'Usuarios',
    permissions: [
      { value: 'ver_usuario', label: 'Ver Usuarios' },
      { value: 'crear_usuario', label: 'Crear Usuarios' },
      { value: 'editar_usuario', label: 'Editar Usuarios' },
      { value: 'eliminar_usuario', label: 'Eliminar Usuarios' },
    ],
  },
  {
    title: 'Categorías',
    permissions: [
      { value: 'ver_categoria', label: 'Ver Categorías' },
      { value: 'crear_categoria', label: 'Crear Categorías' },
      { value: 'editar_categoria', label: 'Editar Categorías' },
      { value: 'eliminar_categoria', label: 'Eliminar Categorías' },
    ],
  },
  {
    title: 'Tipos de Reportes',
    permissions: [
      { value: 'ver_estado', label: 'Ver Tipos de Reportes' },
      { value: 'crear_estado', label: 'Crear Tipos de Reportes' },
      { value: 'editar_estado', label: 'Editar Tipos de Reportes' },
      { value: 'eliminar_estado', label: 'Eliminar Tipos de Reportes' },
    ],
  },
];

export function UserForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const locationState = location.state as LocationState | null;
  
  const isEditMode = !!id;
  
  const { createUser, loading: isCreating } = useCreateUser();
  const { updateUser, loading: isUpdating } = useUpdateUser();
  const { data: users, isLoading: isLoadingUsers } = useOptimizedUsers();
  const { data: userRolesList, isLoading: isLoadingRoles } = useOptimizedUserRolesList();
  const { data: currentUserProfile } = useOptimizedProfile();
  const { changeUserEmail, loading: isChangingEmail } = useChangeUserEmail();
  
  // Buscar usuario existente para modo edición
  const existingUser = useMemo(() => {
    if (!isEditMode || !id) return null;
    return users.find((u) => u.id === id) || null;
  }, [users, id, isEditMode]);

  // Buscar roles del usuario existente
  const existingUserRoles = useMemo(() => {
    if (!isEditMode || !id) return null;
    return userRolesList.find((ur) => ur.user_id === id) || null;
  }, [userRolesList, id, isEditMode]);
  
  // Estado del formulario
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<UserPermission[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Estado para edición de email/contraseña
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailPassword, setNewEmailPassword] = useState('');
  const [showNewEmailPassword, setShowNewEmailPassword] = useState(false);

  // Hooks personalizados
  const { isValid: isEmailValid, error: emailError } = useValidateEmail(isEditMode ? newEmail : email);
  const {
    password,
    showPassword,
    isValid: isPasswordValid,
    generatePassword,
    setPassword,
    toggleShowPassword,
  } = useGeneratePassword({ length: 12 });
  const { getPermissionsForRoles, isPermissionLocked } = useRolePermissions();

  // Cargar datos existentes en modo edición
  useEffect(() => {
    if (isEditMode && existingUser && !isInitialized) {
      // Separar nombre y apellido
      const nameParts = (existingUser.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setNombre(firstName);
      setApellido(lastName);
      setEmail(existingUser.email || '');
      
      // Cargar roles existentes
      if (existingUserRoles?.roles) {
        setSelectedRoles(existingUserRoles.roles as UserRole[]);
        // Cargar permisos basados en roles
        const permissions = getPermissionsForRoles(existingUserRoles.roles as UserRole[]);
        // También agregar permisos adicionales si existen
        if (existingUserRoles.permisos) {
          const allPermisos = [...new Set([...permissions, ...(existingUserRoles.permisos as UserPermission[])])];
          setSelectedPermissions(allPermisos);
        } else {
          setSelectedPermissions(permissions);
        }
      }
      
      setIsInitialized(true);
    }
  }, [isEditMode, existingUser, existingUserRoles, isInitialized, getPermissionsForRoles]);

  // Navegación del formulario
  const { goBack, handleCancel } = useFormNavigation({
    defaultBackRoute: locationState?.from || DEFAULT_BACK_ROUTE,
  });

  // Validación del formulario
  const isFormValid = isEditMode
    ? nombre.trim().length >= 2 && selectedRoles.length > 0
    : nombre.trim().length >= 2 && isEmailValid && isPasswordValid && selectedRoles.length > 0;

  const isSubmitting = isCreating || isUpdating || isChangingEmail;

  // Manejar selección de rol - actualiza automáticamente los permisos
  const handleRoleToggle = (role: UserRole) => {
    const newRoles = selectedRoles.includes(role) 
      ? selectedRoles.filter((r) => r !== role) 
      : [...selectedRoles, role];
    
    setSelectedRoles(newRoles);
    
    // Actualizar permisos automáticamente basado en los roles seleccionados
    const newPermissions = getPermissionsForRoles(newRoles);
    setSelectedPermissions(newPermissions);
  };

  // Manejar selección de permiso (solo si no está bloqueado)
  const handlePermissionToggle = (permission: UserPermission) => {
    // No permitir desmarcar permisos obligatorios de los roles seleccionados
    if (isPermissionLocked(permission, selectedRoles) && selectedPermissions.includes(permission)) {
      return;
    }
    
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  // Desmarcar todos los permisos de un grupo (excepto los obligatorios)
  const handleUncheckGroup = (groupPermissions: UserPermission[]) => {
    setSelectedPermissions((prev) =>
      prev.filter((p) => {
        // Mantener el permiso si no está en el grupo a desmarcar
        if (!groupPermissions.includes(p)) return true;
        // Mantener el permiso si es obligatorio por algún rol seleccionado
        return isPermissionLocked(p, selectedRoles);
      })
    );
  };

  // Abrir diálogo de cambio de email
  const handleOpenEmailDialog = () => {
    setNewEmail('');
    setNewEmailPassword('');
    generatePassword();
    setNewEmailPassword(password);
    setShowEmailDialog(true);
  };

  // Confirmar cambio de email
  const handleConfirmEmailChange = async () => {
    if (!existingUser || !id) return;

    const oldEmail = existingUser.email || '';
    
    if (!newEmail || newEmail === oldEmail) {
      toast.error('Ingresa un email diferente al actual');
      return;
    }

    const success = await changeUserEmail(id, oldEmail, newEmail, newEmailPassword);
    
    if (success) {
      setShowEmailDialog(false);
      toast.success(
        'Email cambiado exitosamente. El usuario debe confirmar su nuevo correo.',
        { duration: 5000 }
      );
      navigate(DEFAULT_BACK_ROUTE);
    } else {
      // El hook ya muestra el error via toast, pero mantenemos el modal abierto para reintentar
    }
  };

  // Generar contraseña para nuevo email
  const handleGenerateEmailPassword = () => {
    generatePassword();
    setNewEmailPassword(password);
  };

  useEffect(() => {
    if (showEmailDialog && password) {
      setNewEmailPassword(password);
    }
  }, [password, showEmailDialog]);

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error('Por favor, completa todos los campos requeridos correctamente');
      return;
    }

    try {
      if (isEditMode && id) {
        // Modo edición
        const result = await updateUser(id, {
          name: `${nombre.trim()} ${apellido.trim()}`.trim(),
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success('Usuario actualizado exitosamente');
      } else {
        // Modo creación
        const result = await createUser({
          email: email.trim(),
          password,
          name: `${nombre.trim()} ${apellido.trim()}`.trim(),
          username: email.split('@')[0],
          roles: selectedRoles,
          permisos: selectedPermissions,
          creatorProfileId: currentUserProfile?.id,
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success('Usuario creado exitosamente');
      }
      
      navigate(DEFAULT_BACK_ROUTE);
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      toast.error(isEditMode ? 'Error al actualizar el usuario' : 'Error al crear el usuario');
    }
  };

  // Mostrar LoadingScreen mientras carga en modo edición
  if (isEditMode && (isLoadingUsers || isLoadingRoles || (users.length === 0 && !existingUser))) {
    return <LoadingScreen message="Cargando datos del usuario..." />;
  }

  // Si estamos en modo edición y no se encuentra el usuario
  if (isEditMode && users.length > 0 && !existingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <User className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Usuario no encontrado</h2>
        <Button onClick={() => navigate('/usuarios')}>
          Volver a Usuarios
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', animationClasses.fadeIn)}>
      <FormHeader
        title={isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
        description={isEditMode 
          ? `Editando información de ${existingUser?.name || 'usuario'}`
          : 'Completa los datos para crear un nuevo usuario en el sistema'
        }
        icon={User}
        onBack={goBack}
        showBackButton={true}
      />

      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna izquierda - Información del usuario */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card: Información del Usuario */}
              <Card className="border border-border shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <h2 className="text-base font-medium text-foreground">
                      Información del Usuario
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {/* Nombre y Apellido */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre" className="text-sm font-medium">
                          Nombre <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="nombre"
                          type="text"
                          placeholder="Ingresa el nombre"
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
                          placeholder="Ingresa el apellido"
                          value={apellido}
                          onChange={(e) => setApellido(e.target.value)}
                          className="bg-input border-border"
                        />
                      </div>
                    </div>

                    {/* Email - modo creación */}
                    {!isEditMode && (
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="usuario@ejemplo.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={cn(
                            'bg-input border-border',
                            emailError && email.length > 0 && 'border-destructive'
                          )}
                          required
                        />
                        {emailError && email.length > 0 && (
                          <p className="text-sm text-destructive">{emailError}</p>
                        )}
                      </div>
                    )}

                    {/* Email en modo edición - con opción de cambiar */}
                    {isEditMode && existingUser?.email && (
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="email"
                            type="email"
                            value={existingUser.email}
                            disabled
                            className="bg-muted border-border flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleOpenEmailDialog}
                            className="shrink-0"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Cambiar Email
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Al cambiar el email, el usuario deberá confirmar su nuevo correo
                        </p>
                      </div>
                    )}

                    {/* Contraseña - solo en modo creación */}
                    {!isEditMode && (
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">
                          Contraseña <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="bg-input border-border pr-10"
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={toggleShowPassword}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={generatePassword}
                            className="shrink-0"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerar
                          </Button>
                        </div>

                        {/* Alerta de seguridad */}
                        <Alert className="mt-3 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                          <AlertTitle className="text-amber-800 dark:text-amber-400 text-sm font-medium">
                            Advertencia de seguridad
                          </AlertTitle>
                          <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
                            Esta contraseña solo se muestra una vez. Guárdala de forma segura y comunícala al usuario por un canal seguro.
                          </AlertDescription>
                        </Alert>

                        <p className="text-xs text-primary">
                          Contraseña generada automáticamente. Cópiala antes de guardar.
                        </p>

                        {/* Indicador de fortaleza */}
                        <PasswordStrength password={password} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card: Tipo de Usuario (Roles) */}
              <Card className="border border-border shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Label className="text-sm font-medium">
                      Tipo de Usuario <span className="text-destructive">*</span>
                    </Label>
                  </div>

                  <div className="space-y-3">
                    {USER_ROLES.map((role) => (
                      <div
                        key={role.value}
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer',
                          selectedRoles.includes(role.value)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/50'
                        )}
                        onClick={() => handleRoleToggle(role.value)}
                      >
                        <input
                          type="checkbox"
                          id={`role-${role.value}`}
                          checked={selectedRoles.includes(role.value)}
                          onChange={() => handleRoleToggle(role.value)}
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-2 w-2 rounded-full', role.color)} />
                            <span className="font-medium text-sm">{role.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {role.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Columna derecha - Permisos del Rol */}
            <div className="lg:col-span-1">
              <Card className="border border-border shadow-sm sticky top-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-medium">Permisos del Rol</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[500px] overflow-y-auto pr-4">
                    <div className="space-y-6">
                      {PERMISSION_GROUPS.map((group) => (
                        <div key={group.title} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{group.title}</span>
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline"
                              onClick={() =>
                                handleUncheckGroup(group.permissions.map((p) => p.value))
                              }
                            >
                              Desmarcar
                            </button>
                          </div>
                          <div className="space-y-2">
                            {group.permissions.map((permission) => {
                              const isLocked = isPermissionLocked(permission.value, selectedRoles);
                              return (
                                <div
                                  key={permission.value}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    id={`perm-${permission.value}`}
                                    checked={selectedPermissions.includes(permission.value)}
                                    onChange={() => handlePermissionToggle(permission.value)}
                                    disabled={isLocked}
                                    className={cn(
                                      "h-4 w-4 rounded border-border text-primary focus:ring-primary",
                                      isLocked && "opacity-60 cursor-not-allowed"
                                    )}
                                  />
                                  <Label
                                    htmlFor={`perm-${permission.value}`}
                                    className={cn(
                                      "text-sm",
                                      isLocked ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"
                                    )}
                                  >
                                    {permission.label}
                                    {isLocked && (
                                      <span className="ml-1 text-xs text-muted-foreground">(obligatorio)</span>
                                    )}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <FormFooter
          cancelText="Cancelar"
          submitText={isEditMode ? 'Guardar Cambios' : 'Crear Usuario'}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          isValid={isFormValid}
          submitButtonType="submit"
        />
      </form>

      {/* Diálogo de cambio de email */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Cambiar Email del Usuario
            </DialogTitle>
            <DialogDescription>
              Este proceso creará una nueva cuenta de autenticación. El usuario deberá confirmar su nuevo correo electrónico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentEmail" className="text-sm font-medium">
                Email Actual
              </Label>
              <Input
                id="currentEmail"
                type="email"
                value={existingUser?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newEmail" className="text-sm font-medium">
                Nuevo Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="nuevo@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={cn(
                  'bg-input border-border',
                  emailError && newEmail.length > 0 && 'border-destructive'
                )}
              />
              {emailError && newEmail.length > 0 && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
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
                Guarda la contraseña y comunícala al usuario. Deberá usar esta contraseña para iniciar sesión con su nuevo correo.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmEmailChange}
              disabled={!newEmail || !newEmailPassword || newEmailPassword.length < 8 || isChangingEmail}
              className="w-full sm:w-auto"
            >
              {isChangingEmail ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
