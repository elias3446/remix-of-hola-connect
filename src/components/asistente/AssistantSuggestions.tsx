import { Button } from '@/components/ui/button';

interface Suggestion {
  text: string;
  action: string;
}

interface AssistantSuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
}

export function AssistantSuggestions({ suggestions, onSelect }: AssistantSuggestionsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.action}
          variant="outline"
          size="sm"
          onClick={() => onSelect(suggestion)}
          className="text-xs hover:bg-primary/10 hover:border-primary/50"
        >
          {suggestion.text}
        </Button>
      ))}
    </div>
  );
}
