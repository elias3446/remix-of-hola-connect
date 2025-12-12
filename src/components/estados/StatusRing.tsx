/**
 * Anillo de avatar con indicador de estado (stories ring)
 */
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { transitionClasses } from '@/hooks/optimizacion';

interface StatusRingProps {
  avatarUrl?: string | null;
  name?: string | null;
  username?: string | null;
  hasStatus?: boolean;
  hasUnviewed?: boolean;
  statusCount?: number;
  isOwn?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onAddClick?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: {
    ring: 'w-12 h-12',
    avatar: 'w-10 h-10',
    plus: 'w-5 h-5',
    plusIcon: 'h-3 w-3',
  },
  md: {
    ring: 'w-16 h-16',
    avatar: 'w-14 h-14',
    plus: 'w-6 h-6',
    plusIcon: 'h-3.5 w-3.5',
  },
  lg: {
    ring: 'w-20 h-20',
    avatar: 'w-[72px] h-[72px]',
    plus: 'w-7 h-7',
    plusIcon: 'h-4 w-4',
  },
};

export function StatusRing({
  avatarUrl,
  name,
  username,
  hasStatus = false,
  hasUnviewed = false,
  statusCount = 0,
  isOwn = false,
  size = 'md',
  onClick,
  onAddClick,
  className,
}: StatusRingProps) {
  const sizes = sizeClasses[size];
  const initials = name?.charAt(0)?.toUpperCase() || username?.charAt(0)?.toUpperCase() || '?';

  // Determinar estilo del anillo
  const getRingClasses = () => {
    if (isOwn && hasStatus) {
      return 'bg-gradient-to-tr from-primary via-accent to-primary p-[3px]';
    }
    if (isOwn && !hasStatus) {
      return 'bg-muted border-2 border-dashed border-muted-foreground/30';
    }
    if (hasStatus && hasUnviewed) {
      return 'bg-gradient-to-tr from-primary via-accent to-primary p-[3px]';
    }
    if (hasStatus && !hasUnviewed) {
      return 'bg-muted-foreground/30 p-[3px]';
    }
    return 'bg-muted';
  };

  const ringStyle = cn(
    "rounded-full flex items-center justify-center cursor-pointer",
    sizes.ring,
    getRingClasses(),
    transitionClasses.normal,
    className
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={ringStyle}
        title={hasStatus ? `Ver ${statusCount} estado${statusCount !== 1 ? 's' : ''}` : 'Sin estados'}
      >
        <div className={cn(
          "rounded-full bg-background p-[2px]",
          sizes.avatar
        )}>
          <Avatar className={cn("w-full h-full", transitionClasses.normal)}>
            <AvatarImage src={avatarUrl || undefined} alt={name || username || 'Usuario'} />
            <AvatarFallback className="text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </button>

      {/* Botón de agregar para el propio usuario */}
      {isOwn && (
        <button
          type="button"
          onClick={onAddClick}
          className={cn(
            "absolute bottom-0 right-0 rounded-full",
            "bg-primary text-primary-foreground",
            "flex items-center justify-center",
            "border-2 border-background",
            "hover:bg-primary/90",
            sizes.plus,
            transitionClasses.button
          )}
          title="Agregar estado"
        >
          <Plus className={sizes.plusIcon} />
        </button>
      )}
    </div>
  );
}
