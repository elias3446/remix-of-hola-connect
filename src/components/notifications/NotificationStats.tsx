import { memo } from 'react';
import { Bell, CheckCircle, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useOptimizedComponent,
  transitionClasses,
  animationClasses,
} from '@/hooks/optimizacion';

interface NotificationStatsProps {
  total: number;
  unread: number;
  read: number;
  className?: string;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  sublabel: string;
  variant: 'primary' | 'destructive' | 'success';
}

const variantStyles = {
  primary: {
    border: 'border-l-4 border-l-primary',
    text: 'text-primary',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  destructive: {
    border: 'border-l-4 border-l-destructive',
    text: 'text-destructive',
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
  },
  success: {
    border: 'border-l-4 border-l-green-500',
    text: 'text-green-600 dark:text-green-500',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-600 dark:text-green-500',
  },
};

function StatCard({ icon: Icon, label, value, sublabel, variant }: StatCardProps) {
  const styles = variantStyles[variant];
  
  return (
    <div
      className={cn(
        'bg-card rounded-lg p-4 sm:p-5',
        styles.border,
        transitionClasses.normal,
        animationClasses.fadeIn
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1.5 rounded-lg', styles.iconBg)}>
          <Icon className={cn('h-4 w-4', styles.iconColor)} />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className={cn('text-3xl sm:text-4xl font-bold mb-1', styles.text)}>
        {value.toLocaleString()}
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function NotificationStatsComponent({ total, unread, read, className }: NotificationStatsProps) {
  useOptimizedComponent({ total, unread, read }, { componentName: 'NotificationStats' });
  
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-4', className)}>
      <StatCard
        icon={Mail}
        label="Total"
        value={total}
        sublabel="Notificaciones totales"
        variant="primary"
      />
      <StatCard
        icon={Bell}
        label="Sin leer"
        value={unread}
        sublabel="Requieren atención"
        variant="destructive"
      />
      <StatCard
        icon={CheckCircle}
        label="Leídas"
        value={read}
        sublabel="Completadas"
        variant="success"
      />
    </div>
  );
}

export const NotificationStats = memo(NotificationStatsComponent);
