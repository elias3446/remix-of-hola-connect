import { useLocation } from "react-router-dom";
import { Bell, LayoutDashboard, FileText, ClipboardList, Plus, Navigation, FolderTree, Users, Tags, MessageSquare, Share2, Eye, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useUserDataReady } from "@/hooks/entidades";
import { useSignOut } from "@/hooks/controlador/useSignOut";
import { useNavigate } from "react-router-dom";
import { transitionClasses, hoverClasses } from "@/hooks/optimizacion";
import { useOptimizedComponent } from "@/hooks/optimizacion/useOptimizedComponent";
import { NotificationsDropdown } from "@/components/notifications";
import { ChevronDown, LogOut } from "lucide-react";

import { Shield } from "lucide-react";

// Mapeo de rutas a iconos y títulos
const pageConfig: Record<string, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  "/bienvenida": { title: "Bienvenido a UniAlerta UCE", icon: Shield },
  "/dashboard": { title: "Dashboard", icon: LayoutDashboard },
  "/reportes": { title: "Reportes", icon: FileText },
  "/mis-reportes": { title: "Mis Reportes", icon: ClipboardList },
  "/crear-reporte": { title: "Crear Reporte", icon: Plus },
  "/rastreo": { title: "Rastreo en Vivo", icon: Navigation },
  "/tipo-reportes": { title: "Tipo de Reportes", icon: FolderTree },
  "/usuarios": { title: "Usuarios", icon: Users },
  "/categorias": { title: "Categorías", icon: Tags },
  "/mensajes": { title: "Mensajes", icon: MessageSquare },
  "/notificaciones": { title: "Notificaciones", icon: Bell },
  "/red-social": { title: "Red Social", icon: Share2 },
  "/auditoria": { title: "Auditoría", icon: Eye },
  "/configuracion": { title: "Configuración", icon: Settings },
  "/perfil": { title: "Mi Perfil", icon: User },
};

export function PageHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useUserDataReady();
  const { signOut, loading } = useSignOut();
  const { isMobile } = useSidebar();

  // Optimización del componente
  useOptimizedComponent({ pathname: location.pathname, profile }, { componentName: 'PageHeader' });

  // Obtener configuración de la página actual
  const currentPage = pageConfig[location.pathname] || { 
    title: "UniAlerta UCE", 
    icon: LayoutDashboard 
  };
  const PageIcon = currentPage.icon;

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

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate("/login");
    }
  };

  const handleProfileClick = () => {
    navigate("/perfil");
  };

  return (
    <header className={cn(
      "flex items-center justify-between h-14 px-2 md:px-4 border-b border-border bg-background shrink-0",
      transitionClasses.normal
    )}>
      {/* Título con icono */}
      <div className={cn(
        "flex items-center gap-2 flex-1 min-w-0",
        transitionClasses.opacity
      )}>
        {/* Hamburger menu for mobile */}
        {isMobile && (
          <SidebarTrigger className={cn(
            "h-8 w-8 shrink-0",
            transitionClasses.colors,
            hoverClasses.bgAccent
          )} />
        )}
        <PageIcon className={cn(
          "h-5 w-5 text-primary shrink-0",
          transitionClasses.colors
        )} />
        <h1 className="text-sm md:text-base font-medium text-foreground truncate">
          {currentPage.title}
        </h1>
      </div>

      {/* Acciones: Notificaciones y Usuario */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notificaciones Dropdown */}
        <NotificationsDropdown />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-2 rounded-full",
              transitionClasses.normal,
              hoverClasses.bgAccent,
              "p-1 pr-2"
            )}>
              <Avatar className={cn(
                "h-8 w-8",
                transitionClasses.transform,
                "hover:scale-105"
              )}>
                {profile?.avatar && (
                  <AvatarImage src={profile.avatar} alt={profile?.name || 'Usuario'} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {getInitials(profile?.name, profile?.email)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground hidden md:block",
                transitionClasses.transform
              )} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleProfileClick}
              className={cn(
                "cursor-pointer gap-2",
                transitionClasses.colors
              )}
            >
              <User className="h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleSignOut}
              disabled={loading}
              className={cn(
                "cursor-pointer gap-2 text-destructive focus:text-destructive",
                transitionClasses.colors
              )}
            >
              <LogOut className="h-4 w-4" />
              <span>{loading ? "Cerrando..." : "Cerrar sesión"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
