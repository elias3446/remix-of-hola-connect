import { Users } from 'lucide-react';
import { useBulkUpload, BulkUploadConfig, FieldConfig } from '@/hooks/controlador/useBulkUpload';
import { BulkUpload } from '@/components/ui/bulk-upload';
import { useAuth } from '@/contexts/AuthContext';
import { UserFormEmbedded } from '@/components/users/UserFormEmbedded';
import { useCreateUser } from '@/hooks/users/useCreateUser';
import { useMemo } from 'react';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];

export default function UsuariosBulkUpload() {
  const { user } = useAuth();
  const { createSingleUser } = useCreateUser();

  const fields: FieldConfig[] = [
    { key: 'nombre', label: 'Nombre', required: true },
    { 
      key: 'email', 
      label: 'Email', 
      required: true,
      validate: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Email no válido';
        return null;
      }
    },
    { 
      key: 'contraseña', 
      label: 'Contraseña', 
      required: true,
      validate: (value) => {
        if (value.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
        return null;
      }
    },
    { key: 'username', label: 'Username', required: false },
    { key: 'roles', label: 'Roles', required: false },
    { key: 'permisos', label: 'Permisos', required: false },
  ];

  const config: BulkUploadConfig = useMemo(() => ({
    entityType: 'usuarios',
    entityLabel: 'Usuario',
    entityLabelPlural: 'Usuarios',
    fields,
    templateFileName: 'plantilla_usuarios.csv',
    queryKey: 'users',
    processRow: async (row, rowNumber) => {
      // Parsear roles si existen
      let roles: UserRole[] = [];
      if (row.roles) {
        roles = row.roles.split(';').map(r => r.trim()).filter(Boolean) as UserRole[];
      }

      // Parsear permisos si existen
      let permisos: UserPermission[] = [];
      if (row.permisos) {
        permisos = row.permisos.split(';').map(p => p.trim()).filter(Boolean) as UserPermission[];
      }

      const result = await createSingleUser({
        email: row.email,
        password: row.contraseña,
        name: row.nombre,
        username: row.username || undefined,
        roles: roles.length > 0 ? roles : undefined,
        permisos: permisos.length > 0 ? permisos : undefined,
        creatorProfileId: user?.id,
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    },
  }), [createSingleUser, user?.id]);

  const bulkUpload = useBulkUpload(config);

  return (
    <div className="h-full bg-background overflow-y-auto">
      <BulkUpload 
        bulkUpload={bulkUpload} 
        backPath="/usuarios" 
        icon={Users}
        renderEditForm={(props) => <UserFormEmbedded {...props} />}
      />
    </div>
  );
}
