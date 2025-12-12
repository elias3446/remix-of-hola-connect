/**
 * Página de perfil de usuario de red social
 * Accesible via /perfil/:username o /perfil/id/:userId
 */
import { useParams } from 'react-router-dom';
import { SocialProfileView } from '@/components/redsocial/SocialProfileView';

export default function PerfilRedSocial() {
  const { username, userId } = useParams<{ username?: string; userId?: string }>();

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full">
        <SocialProfileView username={username} userId={userId} />
      </div>
    </div>
  );
}
