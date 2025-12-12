/**
 * Panel para ver y gestionar miembros de un grupo
 */
import { useState } from 'react';
import { X, Shield, ShieldOff, UserMinus, UserPlus, MoreVertical, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddGroupMembersModal } from './AddGroupMembersModal';
import { useGroupManagement } from '@/hooks/messages/useGroupManagement';
import type { ConversacionExtendida } from '@/hooks/messages/types';
import { transitionClasses, animationClasses } from '@/hooks/optimizacion';

interface GroupMembersPanelProps {
  conversation: ConversacionExtendida | null;
  currentUserId: string | null;
  onClose: () => void;
}

export function GroupMembersPanel({
  conversation,
  currentUserId,
  onClose,
}: GroupMembersPanelProps) {
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const {
    groupInfo,
    participants,
    isAdmin,
    isLoading,
    addParticipants,
    removeParticipant,
    makeAdmin,
    removeAdmin,
  } = useGroupManagement({
    conversationId: conversation?.id || null,
    enabled: !!conversation?.es_grupo,
  });

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    await removeParticipant(memberToRemove.id);
    setMemberToRemove(null);
  };

  // Obtener IDs de miembros existentes para el modal
  const existingMemberIds = participants.map((p) => p.user_id).filter(Boolean) as string[];

  // Contar administradores
  const adminCount = participants.filter((p) => p.role === 'administrador').length;

  if (!conversation?.es_grupo) {
    return null;
  }

  return (
    <>
      <div className={cn(
        "w-80 border-l bg-background flex flex-col h-full",
        animationClasses.slideInRight
      )}>
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-4">
          <h3 className="font-semibold">Integrantes del grupo</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Info del grupo */}
        <div className="p-4 border-b space-y-3">
          <div>
            <p className="text-sm font-medium">
              {groupInfo?.nombre || 'Grupo'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {participants.length} integrantes · {adminCount} administrador{adminCount !== 1 ? 'es' : ''}
            </p>
          </div>

          {/* Botón para agregar miembros (solo admins) */}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAddMembers(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar integrantes
            </Button>
          )}
        </div>

        {/* Lista de miembros */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2">
              {participants.map((participant) => {
                const profile = participant.profile;
                const isCurrentUser = participant.user_id === currentUserId;
                const isParticipantAdmin = participant.role === 'administrador';
                const canManage = isAdmin && !isCurrentUser;

                return (
                  <div
                    key={participant.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      transitionClasses.colors,
                      "hover:bg-accent/50"
                    )}
                  >
                    {/* Avatar */}
                    <Avatar className="w-10 h-10">
                      {profile?.avatar && (
                        <AvatarImage src={profile.avatar} alt={profile.name || ''} />
                      )}
                      <AvatarFallback>
                        {profile?.name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {profile?.name || 'Usuario'}
                          {isCurrentUser && (
                            <span className="text-muted-foreground ml-1">(Tú)</span>
                          )}
                        </span>
                        {isParticipantAdmin && (
                          <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        @{profile?.username || 'usuario'}
                      </p>
                    </div>

                    {/* Acciones */}
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isParticipantAdmin ? (
                            <DropdownMenuItem onClick={() => removeAdmin(participant.user_id!)}>
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Quitar administrador
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => makeAdmin(participant.user_id!)}>
                              <Shield className="h-4 w-4 mr-2" />
                              Hacer administrador
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setMemberToRemove({
                              id: participant.user_id!,
                              name: profile?.name || 'este usuario',
                            })}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Eliminar del grupo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer con info de permisos */}
        {isAdmin && (
          <div className="p-3 border-t bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">
              Como administrador puedes gestionar los integrantes
            </p>
          </div>
        )}
      </div>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar del grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a {memberToRemove?.name} del grupo?
              Esta persona ya no podrá ver los mensajes del grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para agregar miembros */}
      <AddGroupMembersModal
        open={showAddMembers}
        onOpenChange={setShowAddMembers}
        onAddMembers={addParticipants}
        currentUserId={currentUserId}
        existingMemberIds={existingMemberIds}
      />
    </>
  );
}
