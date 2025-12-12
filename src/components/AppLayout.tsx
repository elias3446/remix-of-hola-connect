import { useEffect, memo } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useUserDataReady } from "@/hooks/entidades";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PageHeader } from "@/components/PageHeader";
import { useUserPresence } from "@/hooks/messages/useUserPresence";
import { AssistantButton } from "@/components/asistente";

// Memorizar componentes que no deben re-renderizarse
const MemoizedAppSidebar = memo(AppSidebar);
const MemoizedPageHeader = memo(PageHeader);

// Flag global para persistir entre navegaciones (no se reinicia con el componente)
let hasShownLayout = false;

function LayoutContent() {
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated, hasInitialized, isSigningOut } = useAuth();
  const { isReady, isLoading: dataLoading } = useUserDataReady();
  
  // Inicializar presencia global cuando el usuario está autenticado
  useUserPresence();

  useEffect(() => {
    if (hasInitialized && !authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, hasInitialized, navigate]);

  // Mostrar LoadingScreen durante el proceso de cierre de sesión
  if (isSigningOut) {
    return <LoadingScreen message="Cerrando sesión..." />;
  }

  // Si aún no se ha mostrado el layout, verificar condiciones
  if (!hasShownLayout) {
    if (authLoading || !hasInitialized) {
      return <LoadingScreen message="Verificando sesión..." />;
    }

    if (!isAuthenticated) {
      return null;
    }

    if (dataLoading || !isReady) {
      return <LoadingScreen message="Cargando datos del usuario..." />;
    }
    
    // Marcar que ya mostramos el layout (persiste globalmente)
    hasShownLayout = true;
  } else {
    // Si ya mostramos el layout pero perdemos autenticación, redirigir
    if (hasInitialized && !authLoading && !isAuthenticated) {
      return null;
    }
  }

  return (
    <div className="flex min-h-svh w-full">
      <MemoizedAppSidebar />
      <SidebarInset className="flex flex-col flex-1 h-svh overflow-hidden">
        <MemoizedPageHeader />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </SidebarInset>
      <AssistantButton />
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <LayoutContent />
    </SidebarProvider>
  );
}

// Función para resetear el flag (útil para logout)
export function resetLayoutShown() {
  hasShownLayout = false;
}
