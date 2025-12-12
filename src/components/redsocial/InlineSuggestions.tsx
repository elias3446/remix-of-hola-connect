/**
 * Componente de sugerencias inline para hashtags y menciones
 * Aparece mientras el usuario escribe # o @ en un textarea
 */
import { useCallback } from 'react';
import { Hash, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { animationClasses } from '@/hooks/optimizacion';

interface HashtagSuggestion {
  id: string;
  nombre: string;
  uso_count: number | null;
}

interface MentionSuggestion {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
}

interface InlineSuggestionsProps {
  type: 'hashtag' | 'mention';
  suggestions: HashtagSuggestion[] | MentionSuggestion[];
  onSelect: (value: string) => void;
  className?: string;
  position?: { top?: number; left?: number; bottom?: number };
}

export function InlineSuggestions({
  type,
  suggestions,
  onSelect,
  className,
  position,
}: InlineSuggestionsProps) {
  if (suggestions.length === 0) return null;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSelect = useCallback((value: string) => {
    onSelect(value);
  }, [onSelect]);

  return (
    <div
      className={cn(
        "absolute z-50 w-64 max-h-48 overflow-y-auto",
        "bg-popover border border-border rounded-lg shadow-lg",
        animationClasses.fadeIn,
        className
      )}
      style={position}
    >
      {type === 'hashtag' ? (
        <div className="p-1">
          <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Hashtags
          </div>
          {(suggestions as HashtagSuggestion[]).map((hashtag) => (
            <button
              key={hashtag.id}
              onClick={() => handleSelect(hashtag.nombre)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md",
                "hover:bg-accent hover:text-accent-foreground transition-colors",
                "focus:bg-accent focus:text-accent-foreground focus:outline-none"
              )}
            >
              <span className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{hashtag.nombre}</span>
              </span>
              {hashtag.uso_count !== null && hashtag.uso_count > 0 && (
                <span className="text-xs text-muted-foreground">
                  {hashtag.uso_count.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="p-1">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Usuarios
          </div>
          {(suggestions as MentionSuggestion[]).map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user.username || user.name || user.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md",
                "hover:bg-accent hover:text-accent-foreground transition-colors",
                "focus:bg-accent focus:text-accent-foreground focus:outline-none"
              )}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">
                  {user.name || 'Usuario'}
                </p>
                {user.username && (
                  <p className="text-xs text-muted-foreground">
                    @{user.username}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Hook helper para insertar hashtag/mención en el texto
 */
export function insertSuggestion(
  text: string,
  suggestion: string,
  type: 'hashtag' | 'mention'
): string {
  const prefix = type === 'hashtag' ? '#' : '@';
  const regex = type === 'hashtag' ? /#\w*$/ : /@\w*$/;
  
  // Reemplazar el texto parcial con la sugerencia completa
  const newText = text.replace(regex, `${prefix}${suggestion} `);
  return newText;
}
