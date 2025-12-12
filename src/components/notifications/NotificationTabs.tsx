import { memo } from 'react';
import { Mail, Bell, CheckSquare } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { transitionClasses } from '@/hooks/optimizacion';
import type { NotificationFilter } from '@/hooks/controlador/useNotifications';

interface NotificationTabsProps {
  value: NotificationFilter;
  onChange: (value: NotificationFilter) => void;
  className?: string;
}

const tabs: Array<{ value: NotificationFilter; label: string; icon: React.ElementType }> = [
  { value: 'all', label: 'Todas', icon: Mail },
  { value: 'unread', label: 'Sin leer', icon: Bell },
  { value: 'read', label: 'Leídas', icon: CheckSquare },
];

function NotificationTabsComponent({ value, onChange, className }: NotificationTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as NotificationFilter)}
      className={cn('w-full', className)}
    >
      <TabsList className="bg-muted/50 p-1 h-auto">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'gap-2 px-3 py-2 text-sm',
              'data-[state=active]:bg-card data-[state=active]:shadow-sm',
              transitionClasses.normal
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export const NotificationTabs = memo(NotificationTabsComponent);
