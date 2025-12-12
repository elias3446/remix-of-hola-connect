import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  User,
  Mail,
  Calendar,
  Shield,
  Edit,
  CheckCircle,
  XCircle,
  ClipboardList,
  Users,
  BarChart3,
  Activity,
  History,
  ExternalLink,
  Clock,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntityListCard, EntityListItem } from '@/components/ui/entity-list-card';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { ReporteEvidencia } from '@/components/ui/ReporteEvidencia';
import { ActivityDashboard } from '@/components/audit/ActivityDashboard';
import { AuditPanel } from '@/components/audit/AuditPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserDataReady } from '@/hooks/entidades/useUserDataReady';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { useOptimizedUserRolesList } from '@/hooks/entidades/useOptimizedUserRolesList';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  useOptimizedComponent, 
  animationClasses, 
  transitionClasses 
} from '@/hooks/optimizacion';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Relacion = Database['public']['Tables']['relaciones']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface FriendWithProfile extends Relacion {
  friend_profile?: Profile | null;
}

interface PendingRequestWithProfile extends Relacion {
  target_profile?: Profile | null;
}

interface ReceivedRequestWithProfile extends Relacion {
  sender_profile?: Profile | null;
}

/**
 * Hook para obtener amigos del usuario actual (relaciones de tipo 'amigo' aceptadas)
 */
function useUserFriends(userId: string | null) {
  return useQuery({
    queryKey: ['userFriends', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Obtener relaciones de amistad aceptadas donde el usuario envió la solicitud
      const { data: sentData, error: sentError } = await supabase
        .from('relaciones')
        .select(`
          *,
          friend_profile:profiles!relaciones_user_id_fkey(*)
        `)
        .eq('seguidor_id', userId)
        .eq('estado', 'aceptado')
        .eq('tipo', 'amigo');
      
      if (sentError) {
        console.error('Error fetching sent friends:', sentError);
        return [];
      }

      // También obtener relaciones donde el usuario recibió la solicitud
      const { data: receivedData, error: receivedError } = await supabase
        .from('relaciones')
        .select(`
          *,
          friend_profile:profiles!relaciones_seguidor_id_fkey(*)
        `)
        .eq('user_id', userId)
        .eq('estado', 'aceptado')
        .eq('tipo', 'amigo');
      
      if (receivedError) {
        console.error('Error fetching received friends:', receivedError);
        return [];
      }
      
      return [...(sentData || []), ...(receivedData || [])] as FriendWithProfile[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener solicitudes de amistad pendientes enviadas
 */
function usePendingFriendRequests(userId: string | null) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['pendingFriendRequests', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('relaciones')
        .select(`
          *,
          target_profile:profiles!relaciones_user_id_fkey(*)
        `)
        .eq('seguidor_id', userId)
        .eq('estado', 'pendiente')
        .eq('tipo', 'amigo');
      
      if (error) {
        console.error('Error fetching pending requests:', error);
        return [];
      }
      
      return data as PendingRequestWithProfile[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  const cancelMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId) throw new Error('No autenticado');

      const { error } = await supabase
        .from('relaciones')
        .delete()
        .eq('user_id', targetUserId)
        .eq('seguidor_id', userId)
        .eq('tipo', 'amigo')
        .eq('estado', 'pendiente');

      if (error) throw error;
      return targetUserId;
    },
    onSuccess: (targetUserId) => {
      // Invalidar mis queries
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', userId] });
      // Invalidar queries del usuario objetivo para que su perfil se actualice
      queryClient.invalidateQueries({ queryKey: ['user-relations', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['receivedFriendRequests', targetUserId] });
      // Invalidar cualquier query de relaciones (para otros componentes)
      queryClient.invalidateQueries({ queryKey: ['user-relations'] });
      toast.success('Solicitud cancelada');
    },
    onError: (error) => {
      console.error('Error canceling friend request:', error);
      toast.error('Error al cancelar solicitud');
    },
  });

  return {
    ...query,
    cancelRequest: cancelMutation.mutate,
    isCanceling: cancelMutation.isPending,
    cancelingId: cancelMutation.variables,
  };
}

/**
 * Hook para obtener solicitudes de amistad recibidas pendientes
 */
function useReceivedFriendRequests(userId: string | null) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['receivedFriendRequests', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Solicitudes donde user_id = userId (yo recibo) y seguidor_id es quien envía
      const { data, error } = await supabase
        .from('relaciones')
        .select(`
          *,
          sender_profile:profiles!relaciones_seguidor_id_fkey(*)
        `)
        .eq('user_id', userId)
        .eq('estado', 'pendiente')
        .eq('tipo', 'amigo');
      
      if (error) {
        console.error('Error fetching received requests:', error);
        return [];
      }
      
      return data as ReceivedRequestWithProfile[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  // Aceptar solicitud de amistad
  const acceptMutation = useMutation({
    mutationFn: async (senderUserId: string) => {
      if (!userId) throw new Error('No autenticado');

      const { error } = await supabase
        .from('relaciones')
        .update({ estado: 'aceptado' })
        .eq('user_id', userId)
        .eq('seguidor_id', senderUserId)
        .eq('tipo', 'amigo')
        .eq('estado', 'pendiente');

      if (error) throw error;

      // Notificar al solicitante
      try {
        await supabase.from('notifications').insert([{
          user_id: senderUserId,
          title: 'Solicitud aceptada',
          message: 'Tu solicitud de amistad fue aceptada',
          type: 'informacion' as const,
          data: { from_user_id: userId, type: 'friend_request_accepted' },
        }]);
      } catch (e) {
        console.warn('Notification failed:', e);
      }
      return senderUserId;
    },
    onSuccess: (senderUserId) => {
      // Invalidar mis queries
      queryClient.invalidateQueries({ queryKey: ['receivedFriendRequests', userId] });
      queryClient.invalidateQueries({ queryKey: ['userFriends', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', userId] });
      // Invalidar queries del usuario que envió la solicitud
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests', senderUserId] });
      queryClient.invalidateQueries({ queryKey: ['userFriends', senderUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', senderUserId] });
      // Invalidar queries generales
      queryClient.invalidateQueries({ queryKey: ['user-relations'] });
      toast.success('Solicitud de amistad aceptada');
    },
    onError: (error) => {
      console.error('Error accepting friend request:', error);
      toast.error('Error al aceptar solicitud');
    },
  });

  // Rechazar solicitud de amistad
  const rejectMutation = useMutation({
    mutationFn: async (senderUserId: string) => {
      if (!userId) throw new Error('No autenticado');

      const { error } = await supabase
        .from('relaciones')
        .delete()
        .eq('user_id', userId)
        .eq('seguidor_id', senderUserId)
        .eq('tipo', 'amigo')
        .eq('estado', 'pendiente');

      if (error) throw error;
      return senderUserId;
    },
    onSuccess: (senderUserId) => {
      // Invalidar mis queries
      queryClient.invalidateQueries({ queryKey: ['receivedFriendRequests', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', userId] });
      // Invalidar queries del usuario que envió la solicitud
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests', senderUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-relations', senderUserId] });
      // Invalidar queries generales
      queryClient.invalidateQueries({ queryKey: ['user-relations'] });
      toast.success('Solicitud rechazada');
    },
    onError: (error) => {
      console.error('Error rejecting friend request:', error);
      toast.error('Error al rechazar solicitud');
    },
  });

  return {
    ...query,
    acceptRequest: acceptMutation.mutate,
    rejectRequest: rejectMutation.mutate,
    isAccepting: acceptMutation.isPending,
    isRejecting: rejectMutation.isPending,
    acceptingId: acceptMutation.variables,
    rejectingId: rejectMutation.variables,
  };
}

export function ProfileDetails() {
  const navigate = useNavigate();
  const { profile, userRoles, isLoading, isReady } = useUserDataReady();
  const { data: reportes } = useOptimizedReportes();
  const { data: allUserRoles } = useOptimizedUserRolesList();
  const { data: friends, isLoading: loadingFriends } = useUserFriends(profile?.id || null);
  
  const [activeTab, setActiveTab] = useState('reportes');
  
  // Optimización del componente
  useOptimizedComponent(
    { profileId: profile?.id, activeTab },
    { componentName: 'ProfileDetails' }
  );

  // Obtener roles del usuario actual
  const currentUserRoles = useMemo(() => {
    if (!profile?.id || !allUserRoles) return [];
    const userRole = allUserRoles.find(ur => ur.user_id === profile.id);
    return userRole?.roles || [];
  }, [profile?.id, allUserRoles]);

  // Reportes asignados al usuario
  const assignedReportes = useMemo(() => {
    if (!profile?.id || !reportes) return [];
    return reportes.filter(r => r.assigned_to === profile.id);
  }, [reportes, profile?.id]);

  // Convertir reportes a EntityListItem
  const reportesListItems: EntityListItem[] = useMemo(() => {
    return assignedReportes.map(r => ({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      status: r.status,
      priority: r.priority,
      created_at: r.created_at,
    }));
  }, [assignedReportes]);

  // Calcular tiempo como miembro
  const memberSince = useMemo(() => {
    if (!profile?.created_at) return '';
    try {
      return formatDistanceToNow(new Date(profile.created_at), { 
        addSuffix: false, 
        locale: es 
      });
    } catch {
      return '';
    }
  }, [profile?.created_at]);

  // Loading state
  if (isLoading || !isReady) {
    return <ProfileDetailsSkeleton />;
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No se pudo cargar el perfil</p>
      </div>
    );
  }

  const avatarFallback = (profile.name || profile.username || 'U')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className={cn("space-y-6 p-4 md:p-6 w-full max-w-full", animationClasses.fadeIn)}>
      {/* Header usando EntityPageHeader */}
      <EntityPageHeader
        title="Mi Perfil"
        description="Información personal, actividad y configuración de tu cuenta"
        icon={User}
        entityKey="perfil"
        showCreate={false}
        showBulkUpload={false}
        rightContent={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/perfil/editar')}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            <span className="hidden sm:inline">Editar Perfil</span>
          </Button>
        }
      />

      {/* Profile Card */}
      <Card className={cn("overflow-hidden", transitionClasses.card)}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar - clickeable para ver en grande */}
            {profile.avatar ? (
              <ReporteEvidencia 
                imagenes={[profile.avatar]} 
                avatarMode 
                avatarSize="lg"
              />
            ) : (
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg flex-shrink-0">
                <AvatarFallback className="text-2xl font-semibold bg-primary text-primary-foreground">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Info */}
            <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
              {/* Nombre */}
              <h2 className="text-2xl font-bold text-foreground uppercase truncate">
                {profile.name || profile.username || 'Usuario'}
              </h2>

              {/* Username */}
              {profile.username && (
                <p className="text-muted-foreground">@{profile.username}</p>
              )}

              {/* Email */}
              {profile.email && (
                <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
              )}

              {/* Rol */}
              {currentUserRoles.length > 0 && (
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Badge variant="outline" className="gap-1.5 capitalize">
                    <Shield className="h-3 w-3" />
                    {currentUserRoles[0].replace(/_/g, ' ')}
                  </Badge>
                </div>
              )}

              {/* Member since + badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Miembro desde hace {memberSince}</span>
                </div>
                
                {/* Estado */}
                <Badge 
                  className={cn(
                    "capitalize",
                    profile.estado === 'activo' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {profile.estado || 'Activo'}
                </Badge>

                {/* Email confirmado */}
                <Badge 
                  variant="secondary"
                  className={cn(
                    profile.confirmed 
                      ? "bg-foreground text-background" 
                      : "bg-amber-500/20 text-amber-600"
                  )}
                >
                  {profile.confirmed ? 'Email confirmado' : 'Email no confirmado'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className={cn("overflow-hidden", transitionClasses.card)}>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto gap-0 bg-muted/50 p-1 rounded-none border-b">
              <TabsTrigger 
                value="reportes" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-4 py-2.5"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Reportes</span>
              </TabsTrigger>
              <TabsTrigger 
                value="amigos" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-4 py-2.5"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Amigos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="estadisticas" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-4 py-2.5"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Estadísticas</span>
              </TabsTrigger>
              <TabsTrigger 
                value="actividad" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-4 py-2.5"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Actividad</span>
              </TabsTrigger>
              <TabsTrigger 
                value="cambios" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-4 py-2.5"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Cambios</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content: Reportes */}
            <TabsContent value="reportes" className={cn("p-4 md:p-6", animationClasses.fadeIn)}>
              <EntityListCard
                title={`Reportes Asignados (${assignedReportes.length})`}
                subtitle={`Reportes actualmente asignados a ${profile.name || profile.username || 'ti'}`}
                items={reportesListItems}
                detailRoute="/reportes"
                emptyMessage="Sin reportes asignados"
                emptySubMessage="No tienes reportes asignados actualmente"
                icon={<ClipboardList className="h-5 w-5 text-muted-foreground" />}
                showBadges={true}
              />
            </TabsContent>

            {/* Tab Content: Amigos */}
            <TabsContent value="amigos" className={cn("p-4 md:p-6", animationClasses.fadeIn)}>
              <FriendsTab 
                friends={friends || []} 
                isLoading={loadingFriends}
                userId={profile.id}
              />
            </TabsContent>

            {/* Tab Content: Estadísticas */}
            <TabsContent value="estadisticas" className={cn("p-4 md:p-6", animationClasses.fadeIn)}>
              <ActivityDashboard
                entityId={profile.id}
                filterType="user_id"
                email={profile.email || undefined}
                entityName={profile.name || profile.username || undefined}
                createdAt={profile.created_at}
              />
            </TabsContent>

            {/* Tab Content: Actividad */}
            <TabsContent value="actividad" className={cn("p-0", animationClasses.fadeIn)}>
              <AuditPanel
                searchByUserId={profile.id}
                title="Auditoría del Usuario"
                description={`Monitoreo completo de actividades y cambios realizados por el usuario ${profile.email || ''}`}
                className="border-0 shadow-none"
              />
            </TabsContent>

            {/* Tab Content: Cambios */}
            <TabsContent value="cambios" className={cn("p-0", animationClasses.fadeIn)}>
              <AuditPanel
                searchByRegistroId={profile.id}
                title="Historial de Cambios en la Cuenta"
                description={`Monitoreo completo de actividades y cambios realizados en la cuenta de ${profile.email || ''}`}
                className="border-0 shadow-none"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= COMPONENTES AUXILIARES =============

interface FriendsTabProps {
  friends: FriendWithProfile[];
  isLoading: boolean;
  userId: string;
}

function FriendsTab({ friends, isLoading, userId }: FriendsTabProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'friends' | 'sent' | 'received'>('friends');
  
  const { 
    data: pendingRequests, 
    isLoading: loadingPending,
    cancelRequest,
    isCanceling,
    cancelingId
  } = usePendingFriendRequests(userId);

  const {
    data: receivedRequests,
    isLoading: loadingReceived,
    acceptRequest,
    rejectRequest,
    isAccepting,
    isRejecting,
    acceptingId,
    rejectingId
  } = useReceivedFriendRequests(userId);

  if (isLoading || loadingPending || loadingReceived) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hasFriends = friends && friends.length > 0;
  const hasSent = pendingRequests && pendingRequests.length > 0;
  const hasReceived = receivedRequests && receivedRequests.length > 0;

  if (!hasFriends && !hasSent && !hasReceived) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Sin amigos</h3>
            <p className="text-sm text-muted-foreground">
              Aún no tienes contactos agregados
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs para cambiar entre secciones */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <Button
          variant={activeSection === 'friends' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSection('friends')}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Amigos
          {hasFriends && (
            <Badge variant="secondary" className="ml-1">
              {friends.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeSection === 'received' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSection('received')}
          className="gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Recibidas
          {hasReceived && (
            <Badge variant="default" className="ml-1 animate-pulse">
              {receivedRequests.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeSection === 'sent' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSection('sent')}
          className="gap-2"
        >
          <Clock className="h-4 w-4" />
          Enviadas
          {hasSent && (
            <Badge variant="secondary" className="ml-1">
              {pendingRequests.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Lista de amigos */}
      {activeSection === 'friends' && (
        <div className="grid gap-3">
          {hasFriends ? (
            friends.map((friend) => {
              const friendProfile = friend.friend_profile;
              if (!friendProfile) return null;

              const avatarFallback = (friendProfile.name || friendProfile.username || 'U')
                .substring(0, 2)
                .toUpperCase();

              return (
                <Card 
                  key={friend.id} 
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    transitionClasses.normal
                  )}
                  onClick={() => navigate(`/usuarios/${friendProfile.id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      {friendProfile.avatar ? (
                        <AvatarImage src={friendProfile.avatar} alt={friendProfile.name || ''} />
                      ) : null}
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {friendProfile.name || 'Usuario'}
                      </p>
                      {friendProfile.username && (
                        <p className="text-sm text-muted-foreground truncate">
                          @{friendProfile.username}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <Users className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No tienes amigos aún</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Lista de solicitudes recibidas (por aceptar/rechazar) */}
      {activeSection === 'received' && (
        <div className="grid gap-3">
          {hasReceived ? (
            receivedRequests.map((request) => {
              const senderProfile = request.sender_profile;
              if (!senderProfile) return null;

              const avatarFallback = (senderProfile.name || senderProfile.username || 'U')
                .substring(0, 2)
                .toUpperCase();

              const isCurrentlyAccepting = isAccepting && acceptingId === senderProfile.id;
              const isCurrentlyRejecting = isRejecting && rejectingId === senderProfile.id;
              const isProcessing = isCurrentlyAccepting || isCurrentlyRejecting;

              return (
                <Card 
                  key={request.id} 
                  className={cn(
                    "hover:bg-muted/50",
                    transitionClasses.normal
                  )}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar 
                      className="h-12 w-12 cursor-pointer"
                      onClick={() => navigate(`/usuarios/${senderProfile.id}`)}
                    >
                      {senderProfile.avatar ? (
                        <AvatarImage src={senderProfile.avatar} alt={senderProfile.name || ''} />
                      ) : null}
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/usuarios/${senderProfile.id}`)}
                    >
                      <p className="font-medium text-foreground truncate">
                        {senderProfile.name || 'Usuario'}
                      </p>
                      {senderProfile.username && (
                        <p className="text-sm text-muted-foreground truncate">
                          @{senderProfile.username}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Quiere ser tu amigo
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptRequest(senderProfile.id);
                        }}
                        disabled={isProcessing}
                        className="gap-1"
                      >
                        {isCurrentlyAccepting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Aceptar</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectRequest(senderProfile.id);
                        }}
                        disabled={isProcessing}
                        className="gap-1"
                      >
                        {isCurrentlyRejecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Rechazar</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <CheckCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No tienes solicitudes por aceptar</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Lista de solicitudes enviadas (pendientes) */}
      {activeSection === 'sent' && (
        <div className="grid gap-3">
          {hasSent ? (
            pendingRequests.map((request) => {
              const targetProfile = request.target_profile;
              if (!targetProfile) return null;

              const avatarFallback = (targetProfile.name || targetProfile.username || 'U')
                .substring(0, 2)
                .toUpperCase();

              const isCurrentlyCanceling = isCanceling && cancelingId === targetProfile.id;

              return (
                <Card 
                  key={request.id} 
                  className={cn(
                    "hover:bg-muted/50",
                    transitionClasses.normal
                  )}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar 
                      className="h-12 w-12 cursor-pointer"
                      onClick={() => navigate(`/usuarios/${targetProfile.id}`)}
                    >
                      {targetProfile.avatar ? (
                        <AvatarImage src={targetProfile.avatar} alt={targetProfile.name || ''} />
                      ) : null}
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/usuarios/${targetProfile.id}`)}
                    >
                      <p className="font-medium text-foreground truncate">
                        {targetProfile.name || 'Usuario'}
                      </p>
                      {targetProfile.username && (
                        <p className="text-sm text-muted-foreground truncate">
                          @{targetProfile.username}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Solicitud enviada
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelRequest(targetProfile.id);
                      }}
                      disabled={isCurrentlyCanceling}
                      className="gap-1 shrink-0"
                    >
                      {isCurrentlyCanceling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Cancelar</span>
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No tienes solicitudes enviadas</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileDetailsSkeleton() {
  return (
    <div className={cn("space-y-6 p-4 md:p-6", animationClasses.fadeIn)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-56" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardContent className="p-0">
          <Skeleton className="h-12 w-full" />
          <div className="p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
