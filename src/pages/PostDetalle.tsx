/**
 * Página de detalle de publicación
 * Muestra PostDetailView para una publicación específica
 */
import { useParams, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { PostDetailView } from '@/components/redsocial/PostDetailView';
import { cn } from '@/lib/utils';
import { animationClasses } from '@/hooks/optimizacion';

export default function PostDetalle() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useOptimizedProfile(user?.id);

  const handleBack = () => {
    navigate('/red-social');
  };

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className={cn(
        'flex flex-col gap-4 p-4 md:p-6 w-full max-w-full',
        animationClasses.fadeIn
      )}>
        <EntityPageHeader
          title="Detalle de Publicación"
          description="Vista completa de la publicación"
          icon={FileText}
          entityKey="post-detalle"
          showCreate={false}
          showBulkUpload={false}
          showBack={true}
          onBackClick={handleBack}
        />

        <PostDetailView
          postId={postId}
          currentUserId={profile?.id}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
