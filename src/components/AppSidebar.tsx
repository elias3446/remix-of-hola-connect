import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Plus,
  Navigation,
  FolderTree,
  Users,
  Tags,
  MessageSquare,
  Bell,
  Share2,
  Eye,
  Settings,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAnimations, transitionClasses, hoverClasses } from "@/hooks/optimizacion";
import { useMenuVisibility, type MenuItem } from "@/hooks/controlador/useMenuVisibility";
import { useUserDataReady } from "@/hooks/entidades";
import { useNotificationCount } from "@/hooks/controlador/useNotificationCount";
import { UserMenu } from "@/components/UserMenu";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database['public']['Enums']['user_role'];
type UserPermission = Database['public']['Enums']['user_permission'];

interface SidebarMenuItem extends MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  permissions?: UserPermission[];
}

const menuItems: SidebarMenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { 
    title: "Reportes", 
    url: "/reportes", 
    icon: FileText,
    permissions: ['ver_reporte']
  },
  { 
    title: "Mis Reportes", 
    url: "/mis-reportes", 
    icon: ClipboardList,
    permissions: ['ver_reporte']
  },
  { 
    title: "Crear Reporte", 
    url: "/crear-reporte", 
    icon: Plus,
    permissions: ['crear_reporte']
  },
  { 
    title: "Rastreo en Vivo", 
    url: "/rastreo", 
    icon: Navigation 
  },
  { 
    title: "Tipo de Reportes", 
    url: "/tipo-reportes", 
    icon: FolderTree,
    permissions: ['ver_estado'],
    roles: ['mantenimiento', 'operador_analista']
  },
  { 
    title: "Usuarios", 
    url: "/usuarios", 
    icon: Users,
    permissions: ['ver_usuario'],
    roles: ['super_admin', 'administrador']
  },
  { 
    title: "Categorías", 
    url: "/categorias", 
    icon: Tags,
    permissions: ['ver_categoria'],
    roles: ['mantenimiento', 'operador_analista']
  },
  { 
    title: "Mensajes", 
    url: "/mensajes", 
    icon: MessageSquare 
  },
  { 
    title: "Notificaciones", 
    url: "/notificaciones", 
    icon: Bell
  },
  { 
    title: "Red Social", 
    url: "/red-social", 
    icon: Share2 
  },
  { 
    title: "Auditoría", 
    url: "/auditoria", 
    icon: Eye,
    roles: ['super_admin', 'administrador']
  },
  { title: "Configuración", url: "/configuracion", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { state, isMobile } = useSidebar();
  const { getStaggerClass } = useAnimations();
  
  // Obtener datos del usuario desde el caché de React Query
  const { profile, userRoles } = useUserDataReady();
  
  // Obtener conteo de notificaciones en tiempo real
  const { unreadCount: notificationCount } = useNotificationCount();
  
  // Filtrar menú según roles y permisos del usuario
  const { filterMenuItems } = useMenuVisibility({ userRoles });
  
  // En móvil siempre mostrar expandido, solo colapsar en desktop
  const isCollapsed = !isMobile && state === "collapsed";

  // Filtrar items según roles y permisos
  const visibleMenuItems = filterMenuItems(menuItems);


  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <div className={cn(
          "flex items-center h-14",
          transitionClasses.normal,
          isCollapsed ? "justify-center px-0" : "justify-between px-2"
        )}>
          {isCollapsed ? (
            <SidebarTrigger className={cn(
              "text-sidebar-foreground h-8 w-8",
              transitionClasses.colors,
              hoverClasses.bgAccent
            )} />
          ) : (
            <>
              <NavLink 
                to="/bienvenida" 
                className={cn("flex items-center gap-2", transitionClasses.normal, hoverClasses.opacity)}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg bg-primary",
                  transitionClasses.transform,
                  "hover:scale-105"
                )}>
                  <Shield className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-sidebar-foreground">
                  UniAlerta UCE
                </span>
              </NavLink>
              <SidebarTrigger className={cn(
                "text-sidebar-foreground",
                transitionClasses.colors,
                hoverClasses.bgAccent
              )} />
            </>
          )}
        </div>
      </SidebarHeader>

      {/* Menu Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item, index) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem 
                    key={item.title}
                    className={getStaggerClass(index, 30)}
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={transitionClasses.colors}
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 relative",
                          transitionClasses.colors,
                          isActive && "text-primary font-medium"
                        )}
                      >
                        <div className="relative">
                          <item.icon className={cn(
                            "h-4 w-4",
                            transitionClasses.colors,
                            isActive && "text-primary"
                          )} />
                          {/* Badge en icono cuando colapsado */}
                          {item.title === "Notificaciones" && notificationCount > 0 && isCollapsed && (
                            <Badge
                              variant="destructive"
                              className={cn(
                                "absolute -top-2 -right-2 h-4 min-w-4 rounded-full px-1 text-[10px] flex items-center justify-center",
                                "animate-pulse"
                              )}
                            >
                              {notificationCount > 9 ? "9+" : notificationCount}
                            </Badge>
                          )}
                        </div>
                        <span>{item.title}</span>
                        {/* Badge normal cuando expandido */}
                        {item.title === "Notificaciones" && notificationCount > 0 && !isCollapsed && (
                          <Badge
                            variant="destructive"
                            className={cn(
                              "ml-auto h-5 min-w-5 rounded-full px-1.5 text-xs",
                              "animate-pulse"
                            )}
                          >
                            {notificationCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer - User Menu Component */}
      <SidebarFooter className="border-t border-sidebar-border">
        <UserMenu isCollapsed={isCollapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}
