import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ClipboardList, 
  MessageSquare, 
  Navigation, 
  Users, 
  FileText, 
  Tags, 
  FolderTree, 
  Bell, 
  Settings 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAnimations, transitionClasses, hoverClasses } from '@/hooks/optimizacion';
import { useOptimizedComponent } from '@/hooks/optimizacion/useOptimizedComponent';
import { useUserDataReady } from '@/hooks/entidades';
import { useMenuVisibility, type MenuItem } from '@/hooks/controlador/useMenuVisibility';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];

interface QuickAccessItem extends MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  roles?: UserRole[];
  permissions?: UserPermission[];
}

const quickAccessItems: QuickAccessItem[] = [
  { 
    title: "Crear Reporte", 
    url: "/crear-reporte", 
    icon: Plus,
    description: "Registra un nuevo reporte en el sistema",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    permissions: ['crear_reporte']
  },
  { 
    title: "Mis Reportes", 
    url: "/mis-reportes", 
    icon: ClipboardList,
    description: "Consulta tus reportes creados",
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    permissions: ['ver_reporte']
  },
  { 
    title: "Red Social", 
    url: "/red-social", 
    icon: MessageSquare,
    description: "Interactúa con la comunidad",
    color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
  },
  { 
    title: "Rastreo en Vivo", 
    url: "/rastreo", 
    icon: Navigation,
    description: "Visualiza ubicaciones en tiempo real",
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  },
  { 
    title: "Gestión de Usuarios", 
    url: "/usuarios", 
    icon: Users,
    description: "Administra usuarios del sistema",
    color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    permissions: ['ver_usuario'],
    roles: ['super_admin', 'administrador']
  },
  { 
    title: "Todos los Reportes", 
    url: "/reportes", 
    icon: FileText,
    description: "Consulta y gestiona reportes",
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    permissions: ['ver_reporte']
  },
  { 
    title: "Categorías", 
    url: "/categorias", 
    icon: Tags,
    description: "Gestiona categorías del sistema",
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    permissions: ['ver_categoria'],
    roles: ['mantenimiento', 'operador_analista']
  },
  { 
    title: "Estados", 
    url: "/tipo-reportes", 
    icon: FolderTree,
    description: "Gestiona estados del sistema",
    color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    permissions: ['ver_estado'],
    roles: ['mantenimiento', 'operador_analista']
  },
  { 
    title: "Notificaciones", 
    url: "/notificaciones", 
    icon: Bell,
    description: "Revisa tus notificaciones",
    color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
  { 
    title: "Configuración", 
    url: "/configuracion", 
    icon: Settings,
    description: "Personaliza tu experiencia",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
  },
];

const Bienvenida = memo(function Bienvenida() {
  const navigate = useNavigate();
  const { getStaggerClass } = useAnimations();
  const { profile, userRoles, isLoading } = useUserDataReady();
  const { filterMenuItems } = useMenuVisibility({ userRoles });

  // Optimización del componente
  useOptimizedComponent({ profile, userRoles }, { componentName: 'Bienvenida' });

  // Filtrar items según roles y permisos
  const visibleItems = filterMenuItems(quickAccessItems);

  // Obtener iniciales del usuario
  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "US";
  };

  // Obtener nombre para mostrar
  const getDisplayName = () => {
    if (profile?.name) {
      return profile.name.toUpperCase();
    }
    if (profile?.email) {
      return profile.email.split('@')[0].toUpperCase();
    }
    return 'USUARIO';
  };

  if (isLoading) {
    return <LoadingScreen message="Cargando página de bienvenida..." />;
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
      {/* Banner de bienvenida */}
      <Card className={cn(
        "bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20",
        transitionClasses.normal,
        getStaggerClass(0, 100)
      )}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className={cn(
              "h-14 w-14 md:h-16 md:w-16",
              transitionClasses.transform,
              "hover:scale-105"
            )}>
              {profile?.avatar && (
                <AvatarImage src={profile.avatar} alt={profile?.name || 'Usuario'} />
              )}
              <AvatarFallback className="bg-primary/20 text-primary text-lg md:text-xl font-bold">
                {getInitials(profile?.name, profile?.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                ¡Bienvenido, {getDisplayName()}!
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Has iniciado sesión exitosamente en UniAlerta UCE
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de Accesos Rápidos */}
      <div className={cn("space-y-4", getStaggerClass(1, 100))}>
        <h2 className="text-lg font-semibold text-foreground">Accesos Rápidos</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map((item, index) => (
            <Card
              key={item.title}
              onClick={() => navigate(item.url)}
              className={cn(
                "cursor-pointer group",
                transitionClasses.normal,
                hoverClasses.scale,
                "hover:shadow-md hover:border-primary/30",
                getStaggerClass(index + 2, 50)
              )}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-lg shrink-0",
                  item.color,
                  transitionClasses.colors
                )}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className={cn(
                    "font-medium text-foreground truncate",
                    transitionClasses.colors,
                    "group-hover:text-primary"
                  )}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
});

export default Bienvenida;
