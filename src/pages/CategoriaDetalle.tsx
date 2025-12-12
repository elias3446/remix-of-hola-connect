import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { CategoryDetails } from '@/components/details';
import { useOptimizedCategories, Category } from '@/hooks/entidades';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';

/**
 * Página de detalle de categoría
 */
export default function CategoriaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: categories, isLoading } = useOptimizedCategories();

  // Buscar la categoría directamente sin useEffect
  const category = categories.find((c) => c.id === id) || null;

  // Mostrar LoadingScreen mientras carga o mientras no se ha procesado
  if (isLoading || (categories.length === 0 && !category)) {
    return <LoadingScreen message="Cargando detalles de la categoría..." />;
  }

  // Mostrar mensaje si no se encuentra
  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Categoría no encontrada</h2>
        <Button onClick={() => navigate('/categorias')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Categorías
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <CategoryDetails key={category.id} category={category} />
    </div>
  );
}