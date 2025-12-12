import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { UserDetails } from '@/components/details';
import { useOptimizedUsers, User } from '@/hooks/entidades/useOptimizedUsers';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';

/**
 * Página de detalle de usuario
 */
export default function UsuarioDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: users, isLoading } = useOptimizedUsers();

  // Buscar el usuario directamente sin useEffect
  const user = users.find((u) => u.id === id) || null;

  // Mostrar LoadingScreen mientras carga o mientras no se ha procesado
  if (isLoading || (users.length === 0 && !user)) {
    return <LoadingScreen message="Cargando detalles del usuario..." />;
  }

  // Mostrar mensaje si no se encuentra
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Usuario no encontrado</h2>
        <Button onClick={() => navigate('/usuarios')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Usuarios
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <UserDetails key={user.id} user={user} />
    </div>
  );
}