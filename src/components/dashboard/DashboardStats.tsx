import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Users, MessageSquare, MessageCircle, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconBgClass: string;
  delay?: number;
}

const StatCard = memo(function StatCard({ 
  title, 
  value, 
  description, 
  icon, 
  iconBgClass,
  delay = 0 
}: StatCardProps) {
  return (
    <Card 
      className={cn(
        'hover:shadow-md',
        animationClasses.fadeIn,
        transitionClasses.normal
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={cn(
            'p-2 sm:p-3 rounded-lg',
            iconBgClass
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

interface StatusCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBgClass: string;
  delay?: number;
}

const StatusCard = memo(function StatusCard({ 
  title, 
  value, 
  icon, 
  iconBgClass,
  delay = 0 
}: StatusCardProps) {
  return (
    <Card 
      className={cn(
        'hover:shadow-md',
        animationClasses.fadeIn,
        transitionClasses.normal
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={cn(
            'p-2 rounded-lg',
            iconBgClass
          )}>
            {icon}
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
});

interface DashboardStatsProps {
  totalReportes: number;
  usuariosActivos: number;
  publicaciones: number;
  conversaciones: number;
  pendientes: number;
  enProceso: number;
  resueltos: number;
}

export const DashboardStats = memo(function DashboardStats({
  totalReportes,
  usuariosActivos,
  publicaciones,
  conversaciones,
  pendientes,
  enProceso,
  resueltos,
}: DashboardStatsProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Reportes"
          value={totalReportes}
          description="Reportes activos en el sistema"
          icon={<FileText className="h-5 w-5 text-primary" />}
          iconBgClass="bg-primary/10"
          delay={0}
        />
        <StatCard
          title="Usuarios Activos"
          value={usuariosActivos}
          description={`${usuariosActivos} usuarios totales`}
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
          delay={50}
        />
        <StatCard
          title="Publicaciones"
          value={publicaciones}
          description="En la red social"
          icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
          iconBgClass="bg-muted"
          delay={100}
        />
        <StatCard
          title="Conversaciones"
          value={conversaciones}
          description="Chats activos"
          icon={<MessageCircle className="h-5 w-5 text-muted-foreground" />}
          iconBgClass="bg-muted"
          delay={150}
        />
      </div>

      {/* Estados de reportes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatusCard
          title="Pendientes"
          value={pendientes}
          icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
          iconBgClass="bg-amber-50 dark:bg-amber-900/20"
          delay={200}
        />
        <StatusCard
          title="En Proceso"
          value={enProceso}
          icon={<Clock className="h-4 w-4 text-blue-600" />}
          iconBgClass="bg-blue-50 dark:bg-blue-900/20"
          delay={250}
        />
        <StatusCard
          title="Resueltos"
          value={resueltos}
          icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
          iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
          delay={300}
        />
      </div>
    </div>
  );
});
