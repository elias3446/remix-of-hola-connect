import { memo, useState } from 'react';
import { LayoutDashboard, RefreshCw } from 'lucide-react';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DashboardStats } from './DashboardStats';
import { DashboardCharts } from './DashboardCharts';
import { DetailedAnalysisTabs } from './DetailedAnalysisTabs';
import { useDashboardStats } from '@/hooks/controlador/useDashboardStats';
import { useDashboardRefresh } from '@/hooks/controlador/useDashboardRefresh';
import { useOptimizedComponent, animationClasses, transitionClasses } from '@/hooks/optimizacion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <Skeleton key={i} className="h-[300px]" />
      ))}
    </div>
  </div>
);

export const DashboardView = memo(function DashboardView() {
  const [activeTab, setActiveTab] = useState('general');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    stats,
    reportesTrend,
    statusDistribution,
    priorityDistribution,
    socialActivityTrend,
    rolesDistribution,
    isLoading,
    refetch,
  } = useDashboardStats();
  const { refreshAll } = useDashboardRefresh();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      refreshAll();
      await refetch();
      toast.success('Dashboard actualizado');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useOptimizedComponent(
    { stats, activeTab },
    { componentName: 'DashboardView' }
  );

  return (
    <main className="flex-1 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <EntityPageHeader
        title="Dashboard"
        description="Resumen general del sistema"
        icon={LayoutDashboard}
        entityKey="dashboard"
        showCreate={false}
        showBulkUpload={false}
        rightContent={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className={cn(
              'gap-2 h-8 sm:h-9',
              transitionClasses.colors
            )}
          >
            <RefreshCw className={cn(
              'h-4 w-4',
              (isLoading || isRefreshing) && 'animate-spin'
            )} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        }
      />

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className={animationClasses.fadeIn}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="general">Vista General</TabsTrigger>
          <TabsTrigger value="detallado">Análisis Detallado</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 sm:mt-6">
          {isLoading ? (
            <DashboardSkeleton />
          ) : stats ? (
            <div className="space-y-6">
              <DashboardStats
                totalReportes={stats.totalReportes}
                usuariosActivos={stats.usuariosActivos}
                publicaciones={stats.publicaciones}
                conversaciones={stats.conversaciones}
                pendientes={stats.reportesPendientes}
                enProceso={stats.reportesEnProceso}
                resueltos={stats.reportesResueltos}
              />
              <DashboardCharts
                reportesTrend={reportesTrend}
                statusDistribution={statusDistribution}
                priorityDistribution={priorityDistribution}
                socialActivityTrend={socialActivityTrend}
                rolesDistribution={rolesDistribution}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No se pudieron cargar los datos del dashboard
            </div>
          )}
        </TabsContent>

        <TabsContent value="detallado" className="mt-4 sm:mt-6">
          <DetailedAnalysisTabs />
        </TabsContent>
      </Tabs>
    </main>
  );
});
