import { useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSignOut } from "@/hooks/controlador/useSignOut";
import { useUserDataReady } from "@/hooks/entidades";
import { transitionClasses } from "@/hooks/optimizacion";
import { useOptimizedComponent } from "@/hooks/optimizacion/useOptimizedComponent";
import { ChevronDown } from "lucide-react";

interface UserMenuProps {
  isCollapsed?: boolean;
}

export function UserMenu({ isCollapsed = false }: UserMenuProps) {
  const navigate = useNavigate();
  const { signOut, loading } = useSignOut();
  const { profile } = useUserDataReady();
  
  // Optimización del componente
  useOptimizedComponent({ isCollapsed, profile }, { componentName: 'UserMenu' });

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

  const userName = profile?.name;
  const userEmail = profile?.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className={cn(
          "flex items-center py-3",
          transitionClasses.normal,
          "hover:bg-muted/50",
          "rounded-md cursor-pointer",
          isCollapsed ? "justify-center px-0" : "gap-3 px-2"
        )}>
          <Avatar className={cn(
            "h-8 w-8 shrink-0",
            transitionClasses.transform,
            "hover:scale-105"
          )}>
            {profile?.avatar && (
              <AvatarImage src={profile.avatar} alt={userName || 'Usuario'} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {getInitials(userName, userEmail)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className={cn(
              "flex flex-1 items-center justify-between min-w-0",
              transitionClasses.opacity
            )}>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-sidebar-foreground truncate">
                  {userName || "Usuario"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {userEmail || "usuario@correo.com"}
                </span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground shrink-0",
                transitionClasses.transform
              )} />
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56"
        side={isCollapsed ? "right" : "top"}
      >
        <DropdownMenuLabel className="font-normal">
          <span className="font-medium">Mi cuenta</span>
        </DropdownMenuLabel>
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
  );
}
