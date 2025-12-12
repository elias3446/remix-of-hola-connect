import { useState, useEffect } from 'react';
import { User, Eye, EyeOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PasswordStrength } from '@/components/ui/password-strength';
import { useGeneratePassword } from '@/hooks/controlador/useGeneratePassword';
import { useRolePermissions } from '@/hooks/controlador/useRolePermissions';
import { cn } from '@/lib/utils';
import type { BulkUploadEditFormProps } from '@/components/ui/bulk-upload';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];

// Definición de roles con sus colores y descripciones (igual que UserForm)
const USER_ROLES: { value: UserRole; label: string; description: string; color: string }[] = [
  { value: 'super_admin', label: 'Super Admin', description: 'Rol de super administrador con acceso total al sistema', color: 'bg-red-500' },
  { value: 'administrador', label: 'Administrador', description: 'Rol de administrador con todos los permisos del sistema', color: 'bg-red-500' },
  { value: 'mantenimiento', label: 'Mantenimiento', description: 'Rol de mantenimiento con permisos específicos', color: 'bg-blue-500' },
  { value: 'usuario_regular', label: 'Usuario Regular', description: 'Rol básico de usuario con permisos limitados', color: 'bg-blue-500' },
  { value: 'estudiante_personal', label: 'Estudiante/Personal', description: 'Estudiante o personal de la universidad', color: 'bg-green-500' },
  { value: 'operador_analista', label: 'Operador/Analista', description: 'Operador o analista del sistema', color: 'bg-muted-foreground' },
  { value: 'seguridad_uce', label: 'Seguridad UCE', description: 'Personal de seguridad de la universidad', color: 'bg-muted-foreground' },
];

// Agrupación de permisos por categoría (igual que UserForm)
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

export function UserFormEmbedded({ rowData, onSave, onCancel }: BulkUploadEditFormProps) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<UserPermission[]>([]);

  // Hooks personalizados (igual que UserForm)
  const {
    password,
    showPassword,
    isValid: isPasswordValid,
    generatePassword,
    setPassword,
    toggleShowPassword,
  } = useGeneratePassword({ length: 12 });
  const { getPermissionsForRoles, isPermissionLocked } = useRolePermissions();

  // Cargar datos del rowData
  useEffect(() => {
    // Separar nombre y apellido
    const fullName = rowData.nombre || '';
    const nameParts = fullName.split(' ');
    setNombre(nameParts[0] || '');
    setApellido(nameParts.slice(1).join(' ') || '');
    
    setEmail(rowData.email || '');
    setUsername(rowData.username || '');
    
    // Cargar contraseña existente o generar una nueva
    if (rowData.contraseña) {
      setPassword(rowData.contraseña);
    } else {
      generatePassword();
    }
    
    // Cargar roles
    if (rowData.roles) {
      const roles = rowData.roles.split(';').map((r: string) => r.trim()).filter(Boolean) as UserRole[];
      setSelectedRoles(roles);
      // Cargar permisos basados en roles
      const permissions = getPermissionsForRoles(roles);
      setSelectedPermissions(permissions);
    } else {
      setSelectedRoles([]);
      setSelectedPermissions([]);
    }
  }, [rowData, generatePassword, setPassword, getPermissionsForRoles]);

  // Validaciones
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = nombre.trim().length >= 2 && isEmailValid && isPasswordValid && selectedRoles.length > 0;

  // Manejar selección de rol - actualiza automáticamente los permisos (igual que UserForm)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    onSave({
      ...rowData,
      nombre: `${nombre.trim()} ${apellido.trim()}`.trim(),
      email: email.trim(),
      contraseña: password,
      username: username.trim() || email.split('@')[0],
      roles: selectedRoles.join(';'),
      permisos: selectedPermissions.join(';'),
    });
  };

  return (
    <div className="flex flex-col">
      <DialogHeader className="p-6 pb-2">
        <DialogTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Editar Usuario
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="p-6 pt-2 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Card: Información del Usuario */}
          <Card className="border border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h2 className="text-base font-medium text-foreground">
                  Información del Usuario
                </h2>
              </div>

              <div className="space-y-4">
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

                {/* Email */}
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
                      email && !isEmailValid && 'border-destructive'
                    )}
                    required
                  />
                  {email && !isEmailValid && (
                    <p className="text-sm text-destructive">Email no válido</p>
                  )}
                </div>

                {/* Contraseña */}
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
                      Esta contraseña solo se muestra una vez. Guárdala de forma segura.
                    </AlertDescription>
                  </Alert>

                  {/* Indicador de fortaleza */}
                  <PasswordStrength password={password} />
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Nombre de usuario (opcional)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si se deja vacío, se generará a partir del email
                  </p>
                </div>
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

          {/* Card: Permisos del Rol */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Permisos del Rol</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
                    <div className="grid grid-cols-2 gap-2">
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
                                <span className="ml-1 text-xs text-muted-foreground">(obl.)</span>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="p-6 pt-0 gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isFormValid}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}
