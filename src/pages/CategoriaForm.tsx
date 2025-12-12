import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { useOptimizedCategories, Category } from '@/hooks/entidades';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Página de formulario para crear/editar categorías
 */
export default function CategoriaFormPage() {
  const { id } = useParams<{ id: string }>();
  const { data: categories, isLoading } = useOptimizedCategories();
  const [category, setCategory] = useState<Category | null>(null);

  const isEditing = !!id;

  useEffect(() => {
    if (isEditing && categories.length > 0) {
      const found = categories.find((c) => c.id === id);
      setCategory(found || null);
    }
  }, [id, categories, isEditing]);

  // Mostrar skeleton mientras carga en modo edición
  if (isEditing && (isLoading || !category)) {
    return (
      <div className="flex flex-col h-full">
        <div className="py-4 px-6 bg-secondary/50 border-b border-border">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="p-6">
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <CategoryForm key={category?.id || 'new'} category={category} />
    </div>
  );
}
