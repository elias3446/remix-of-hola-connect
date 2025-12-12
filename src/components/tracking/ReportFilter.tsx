import React from 'react';
import { Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { transitionClasses } from '@/hooks/optimizacion';

export type ReportFilterType = 
  | 'todos'
  | 'pendientes_publicos'
  | 'en_proceso_publicos'
  | 'pendientes_privados'
  | 'en_proceso_privados';

interface ReportFilterProps {
  value: ReportFilterType;
  onChange: (value: ReportFilterType) => void;
  className?: string;
}

const filterOptions: { value: ReportFilterType; label: string }[] = [
  { value: 'todos', label: 'Todos los reportes' },
  { value: 'pendientes_publicos', label: 'Pendientes Públicos' },
  { value: 'en_proceso_publicos', label: 'En Proceso Públicos' },
  { value: 'pendientes_privados', label: 'Pendientes Privados' },
  { value: 'en_proceso_privados', label: 'En Proceso Privados' },
];

export const ReportFilter: React.FC<ReportFilterProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Filter className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground hidden sm:inline">Filtros</span>
      <Select value={value} onValueChange={(v) => onChange(v as ReportFilterType)}>
        <SelectTrigger 
          className={cn(
            'w-[180px] sm:w-[200px] h-9',
            transitionClasses.colors
          )}
        >
          <SelectValue placeholder="Seleccionar filtro" />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
