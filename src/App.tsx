import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { UserPresenceProvider } from "@/contexts/UserPresenceContext";
import { NearbyReportNotificationsProvider } from "@/contexts/NearbyReportNotificationsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import Bienvenida from "./pages/Bienvenida";
import NotFound from "./pages/NotFound";
import Categorias from "./pages/Categorias";
import CategoriaForm from "./pages/CategoriaForm";
import CategoriaDetalle from "./pages/CategoriaDetalle";
import TipoReportes from "./pages/TipoReportes";
import TipoReporteForm from "./pages/TipoReporteForm";
import TipoReporteDetalle from "./pages/TipoReporteDetalle";
import Usuarios from "./pages/Usuarios";
import UsuarioForm from "./pages/UsuarioForm";
import UsuarioDetalle from "./pages/UsuarioDetalle";
import Reportes from "./pages/Reportes";
import MisReportes from "./pages/MisReportes";
import ReporteForm from "./pages/ReporteForm";
import ReporteDetalle from "./pages/ReporteDetalle";
import Auditoria from "./pages/Auditoria";
import Rastreo from "./pages/Rastreo";
import Notificaciones from "./pages/Notificaciones";
import Mensajes from "./pages/Mensajes";
import RedSocial from "./pages/RedSocial";
import PostDetalle from "./pages/PostDetalle";
import TrendingPosts from "./pages/TrendingPosts";
import PerfilRedSocial from "./pages/PerfilRedSocial";
import UsuariosBulkUpload from "./pages/UsuariosBulkUpload";
import CategoriasBulkUpload from "./pages/CategoriasBulkUpload";
import TipoReportesBulkUpload from "./pages/TipoReportesBulkUpload";
import ReportesBulkUpload from "./pages/ReportesBulkUpload";
import MiPerfil from "./pages/MiPerfil";
import EditarPerfil from "./pages/EditarPerfil";
import Configuracion from "./pages/Configuracion";
import { AppLayout } from "./components/AppLayout";

// QueryClient fuera del componente para evitar recreación en HMR
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Placeholder pages for navigation
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    <p className="text-muted-foreground mt-2">Esta página está en desarrollo.</p>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <UserPresenceProvider>
              <LocationProvider>
                <NearbyReportNotificationsProvider>
                  <Toaster />
                  <Sonner />
                  <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  
                  {/* Protected routes with AppLayout using nested routes */}
                  <Route element={<AppLayout />}>
                    <Route path="/bienvenida" element={<Bienvenida />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/reportes" element={<Reportes />} />
                    <Route path="/reportes/carga-masiva" element={<ReportesBulkUpload />} />
                    <Route path="/reportes/:id" element={<ReporteDetalle />} />
                    <Route path="/mis-reportes" element={<MisReportes />} />
                    <Route path="/crear-reporte" element={<ReporteForm />} />
                    <Route path="/reportes/:id/editar" element={<ReporteForm />} />
                    <Route path="/rastreo" element={<Rastreo />} />
                    <Route path="/tipo-reportes" element={<TipoReportes />} />
                    <Route path="/tipo-reportes/carga-masiva" element={<TipoReportesBulkUpload />} />
                    <Route path="/tipo-reportes/nuevo" element={<TipoReporteForm />} />
                    <Route path="/tipo-reportes/:id" element={<TipoReporteDetalle />} />
                    <Route path="/tipo-reportes/:id/editar" element={<TipoReporteForm />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/usuarios/carga-masiva" element={<UsuariosBulkUpload />} />
                    <Route path="/usuarios/nuevo" element={<UsuarioForm />} />
                    <Route path="/usuarios/:id" element={<UsuarioDetalle />} />
                    <Route path="/usuarios/:id/editar" element={<UsuarioForm />} />
                    <Route path="/categorias" element={<Categorias />} />
                    <Route path="/categorias/carga-masiva" element={<CategoriasBulkUpload />} />
                    <Route path="/categorias/nueva" element={<CategoriaForm />} />
                    <Route path="/categorias/:id" element={<CategoriaDetalle />} />
                    <Route path="/categorias/:id/editar" element={<CategoriaForm />} />
                    <Route path="/mensajes" element={<Mensajes />} />
                    <Route path="/notificaciones" element={<Notificaciones />} />
                    <Route path="/red-social" element={<RedSocial />} />
                    <Route path="/red-social/post/:postId" element={<PostDetalle />} />
                    <Route path="/red-social/trending" element={<TrendingPosts />} />
                    <Route path="/perfil/:username" element={<PerfilRedSocial />} />
                    <Route path="/perfil/id/:userId" element={<PerfilRedSocial />} />
                    <Route path="/auditoria" element={<Auditoria />} />
                    <Route path="/perfil" element={<MiPerfil />} />
                    <Route path="/perfil/editar" element={<EditarPerfil />} />
                    <Route path="/configuracion" element={<Configuracion />} />
                  </Route>
                  
                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </NearbyReportNotificationsProvider>
              </LocationProvider>
            </UserPresenceProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
