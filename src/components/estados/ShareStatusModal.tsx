/**
 * Modal para compartir un estado
 */
import { useState } from 'react';
import { 
  Copy, 
  Check,
  Send,
  Clock,
  Repeat2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { useOptimizedProfile } from '@/hooks/entidades';
import { NewConversationModal } from '@/components/messages/NewConversationModal';
import { useConversations, useMessages } from '@/hooks/messages';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface ShareStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  estadoId: string;
  statusContent?: string;
  statusImage?: string;
  /** Tipo de contenido: 'status' para estados temporales, 'post' para publicaciones del feed */
  contentType?: 'status' | 'post';
  onShareInternal?: (estadoId: string) => void;
  onShareAsStatus?: (estadoId: string, visibility: string, shareInMessages: boolean) => void;
  onShareToProfile?: (estadoId: string, comment: string, visibility: string) => void;
  /** Callback cuando se comparte por mensaje directo exitosamente */
  onShareByMessage?: (destinatarioId: string) => void;
}

const SOCIAL_PLATFORMS = [
  {
    id: 'twitter',
    name: 'Twitter',
    icon: '𝕏',
    color: 'hover:bg-black hover:text-white',
    getUrl: (url: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'f',
    color: 'hover:bg-[#1877F2] hover:text-white',
    getUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'in',
    color: 'hover:bg-[#0A66C2] hover:text-white',
    getUrl: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '📱',
    color: 'hover:bg-[#25D366] hover:text-white',
    getUrl: (url: string) => `https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`,
  },
];

export function ShareStatusModal({
  isOpen,
  onClose,
  estadoId,
  statusContent = '',
  statusImage,
  contentType = 'status',
  onShareInternal,
  onShareAsStatus,
  onShareToProfile,
  onShareByMessage,
}: ShareStatusModalProps) {
  const { data: profile } = useOptimizedProfile();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'externo' | 'estado' | 'perfil'>('externo');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  
  // Hooks de mensajería
  const { createConversation, isCreating } = useConversations({ enabled: isOpen });
  const { sendMessage, isSending } = useMessages({ 
    conversationId: selectedConversationId, 
    enabled: !!selectedConversationId 
  });
  
  // Estado tab state
  const [visibility, setVisibility] = useState('todos');
  const [shareInMessages, setShareInMessages] = useState(false);
  
  // Perfil tab state
  const [profileComment, setProfileComment] = useState('');
  const [profileVisibility, setProfileVisibility] = useState('todos');
  const MAX_COMMENT_LENGTH = 500;

  // Generar URL del estado
  const statusUrl = `${window.location.origin}/estado/${estadoId}`;

  // User info
  const userName = profile?.name || 'Usuario';
  const userUsername = profile?.username || 'usuario';
  const userAvatar = profile?.avatar;
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(statusUrl);
      setCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Error al copiar el enlace');
    }
  };

  const handleExternalShare = (platform: typeof SOCIAL_PLATFORMS[0]) => {
    const url = platform.getUrl(statusUrl);
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    toast.success(`Compartiendo en ${platform.name}`);
  };

  const handleShareAsStatus = () => {
    if (onShareAsStatus) {
      onShareAsStatus(estadoId, visibility, shareInMessages);
      toast.success('Estado compartido en tu historia');
      onClose();
    }
  };

  const handleShareToProfile = () => {
    if (onShareToProfile) {
      onShareToProfile(estadoId, profileComment, profileVisibility);
      // El toast se muestra en el handler del componente padre
      onClose();
    } else {
      toast.info('Función próximamente disponible');
    }
  };

  // Handler para seleccionar usuario y enviar mensaje compartido
  const handleSelectUserForShare = async (userId: string) => {
    try {
      setIsSendingMessage(true);
      
      // Crear o obtener conversación existente
      const conversationId = await createConversation(userId);
      
      if (!conversationId) {
        toast.error('Error al crear la conversación');
        return;
      }

      // Preparar el contenido compartido
      const sharedContent = {
        type: contentType,
        ...(contentType === 'status' ? { estadoId } : { postId: estadoId }),
        content: statusContent,
        image: statusImage,
        sharedAt: new Date().toISOString(),
        sharedBy: {
          id: profile?.id,
          name: profile?.name,
          avatar: profile?.avatar,
          username: profile?.username,
        },
      };

      // Enviar mensaje con el contenido compartido usando RPC o inserción directa
      const { error } = await supabase.from('mensajes').insert({
        conversacion_id: conversationId,
        user_id: profile?.id,
        contenido: statusContent || 'Publicación compartida',
        shared_post: sharedContent,
      });

      if (error) throw error;

      // Actualizar timestamp de la conversación
      await supabase
        .from('conversaciones')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Invalidar queries para actualizar la UI en tiempo real
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // Llamar callback para registrar compartición
      onShareByMessage?.(userId);

      setShowUserSelector(false);
      toast.success('Publicación enviada por mensaje directo');
      onClose();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleShareInternal = () => {
    // Abrir modal de selección de usuario
    setShowUserSelector(true);
  };

  // Status preview component (dark story-style)
  const StatusPreviewCard = () => (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 border-b">
        <Clock className="h-4 w-4" />
        <span>Vista previa del estado</span>
      </div>
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-4 min-h-[140px] flex flex-col items-center justify-center relative">
        {/* Avatar ring */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full ring-2 ring-primary p-0.5">
            <Avatar className="h-full w-full">
              <AvatarImage src={userAvatar || undefined} />
              <AvatarFallback className="bg-muted text-[10px] font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="text-white text-xs font-medium">{userName}</span>
        </div>
        
        {/* Content */}
        {statusImage ? (
          <img 
            src={statusImage} 
            alt="Estado" 
            className="max-h-[100px] rounded object-contain"
          />
        ) : statusContent ? (
          <p className="text-white text-center text-sm font-medium line-clamp-3 mt-6">
            {statusContent}
          </p>
        ) : (
          <p className="text-white/60 text-center text-sm italic mt-6">
            Sin contenido
          </p>
        )}
      </div>
    </div>
  );

  // Profile post preview component
  const ProfilePreviewCard = () => (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 border-b">
        <Repeat2 className="h-4 w-4" />
        <span>Vista previa</span>
      </div>
      <div className="p-4 space-y-3">
        {/* User reposting */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Repeat2 className="h-3 w-3" />
          <span>{userName} compartió</span>
        </div>
        
        {/* Original content card */}
        <div className="border rounded-lg p-3 bg-muted/30">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar || undefined} />
              <AvatarFallback className="bg-muted text-xs font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs">{userName}</p>
              <p className="text-[10px] text-muted-foreground">@{userUsername}</p>
            </div>
          </div>
          
          {statusImage && (
            <img 
              src={statusImage} 
              alt="Contenido" 
              className="mt-2 rounded max-h-[60px] object-cover w-full"
            />
          )}
          
          {statusContent && (
            <p className="text-xs mt-2 line-clamp-2">{statusContent}</p>
          )}
          
          {!statusImage && !statusContent && (
            <p className="text-xs text-muted-foreground italic mt-2">Sin contenido</p>
          )}
        </div>
        
        {/* Comment preview */}
        {profileComment && (
          <p className="text-sm line-clamp-2">{profileComment}</p>
        )}
      </div>
    </div>
  );

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(
        "max-w-md max-h-[85vh] overflow-hidden flex flex-col",
        animationClasses.fadeIn
      )}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Compartir publicación
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Elige cómo quieres compartir esta publicación
          </p>
        </DialogHeader>

        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="w-full flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="externo">Externo</TabsTrigger>
            <TabsTrigger value="estado">Estado</TabsTrigger>
            <TabsTrigger value="perfil">En tu perfil</TabsTrigger>
          </TabsList>

          {/* Tab: Compartir externamente */}
          <TabsContent value="externo" className="space-y-4 mt-4 flex-1 overflow-hidden">
            {/* Enlace de la publicación */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Enlace de la publicación</label>
              <div className="flex gap-2">
                <Input
                  value={statusUrl}
                  readOnly
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className={transitionClasses.button}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Redes sociales */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Compartir en redes sociales</label>
              <div className="grid grid-cols-2 gap-2">
                {SOCIAL_PLATFORMS.map((platform) => (
                  <Button
                    key={platform.id}
                    type="button"
                    variant="outline"
                    onClick={() => handleExternalShare(platform)}
                    className={cn(
                      "justify-start gap-2",
                      platform.color,
                      transitionClasses.button
                    )}
                  >
                    <span className="w-5 h-5 flex items-center justify-center font-bold">
                      {platform.icon}
                    </span>
                    {platform.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Enviar mensaje directo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Enviar mensaje directo</label>
              <Button
                type="button"
                variant="outline"
                onClick={handleShareInternal}
                className={cn(
                  "w-full justify-start gap-2",
                  transitionClasses.button
                )}
              >
                <Send className="h-4 w-4" />
                Enviar a un usuario
              </Button>
            </div>
          </TabsContent>

          {/* Tab: Compartir como estado */}
          <TabsContent value="estado" className="space-y-4 mt-4 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
            <p className="text-sm text-muted-foreground">
              Esta publicación se compartirá como un estado temporal (24 horas)
            </p>

            {/* Preview */}
            <StatusPreviewCard />

            {/* Visibilidad */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Visibilidad</Label>
              <RadioGroup value={visibility} onValueChange={setVisibility} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="todos" id="visibility-todos" />
                  <Label htmlFor="visibility-todos" className="font-normal cursor-pointer">
                    Todos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contactos" id="visibility-contactos" />
                  <Label htmlFor="visibility-contactos" className="font-normal cursor-pointer">
                    Mis contactos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="privado" id="visibility-privado" />
                  <Label htmlFor="visibility-privado" className="font-normal cursor-pointer">
                    Privado (solo yo)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Compartir en mensajes */}
            <div className="flex items-center justify-between">
              <Label htmlFor="share-messages" className="text-sm font-normal">
                Compartir también en Mensajes
              </Label>
              <Switch
                id="share-messages"
                checked={shareInMessages}
                onCheckedChange={setShareInMessages}
              />
            </div>

            <Button
              type="button"
              onClick={handleShareAsStatus}
              className={cn("w-full", transitionClasses.button)}
            >
              Compartir como Estado
            </Button>
          </TabsContent>

          {/* Tab: Compartir en perfil */}
          <TabsContent value="perfil" className="space-y-4 mt-4 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
            {/* Comentario opcional */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Añade un comentario (opcional)</Label>
              <Textarea
                placeholder="¿Qué opinas sobre esto?"
                value={profileComment}
                onChange={(e) => setProfileComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                className="min-h-[80px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {profileComment.length}/{MAX_COMMENT_LENGTH}
              </p>
            </div>

            {/* Preview */}
            <ProfilePreviewCard />

            {/* Visibilidad */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Visibilidad</Label>
              <RadioGroup value={profileVisibility} onValueChange={setProfileVisibility} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="todos" id="profile-visibility-todos" />
                  <Label htmlFor="profile-visibility-todos" className="font-normal cursor-pointer">
                    Todos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contactos" id="profile-visibility-contactos" />
                  <Label htmlFor="profile-visibility-contactos" className="font-normal cursor-pointer">
                    Mis contactos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="privado" id="profile-visibility-privado" />
                  <Label htmlFor="profile-visibility-privado" className="font-normal cursor-pointer">
                    Privado (solo yo)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="button"
              onClick={handleShareToProfile}
              className={cn("w-full gap-2", transitionClasses.button)}
            >
              <Repeat2 className="h-4 w-4" />
              Compartir en tu perfil
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

      {/* Modal de selección de usuario para mensaje directo */}
      <NewConversationModal
        open={showUserSelector}
        onOpenChange={setShowUserSelector}
        onSelectUser={handleSelectUserForShare}
        currentUserId={profile?.id || null}
        isLoading={isSendingMessage || isCreating}
        sharedContent={{
          type: 'status',
          content: statusContent,
          image: statusImage,
          author: {
            name: profile?.name || null,
            avatar: profile?.avatar || null,
            username: profile?.username || null,
          },
        }}
      />
    </>
  );
}
