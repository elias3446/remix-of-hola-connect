/**
 * TrendingDashboard - Dashboard completo de análisis de trending
 * Incluye métricas, gráficos y lista de publicaciones
 */
import { memo, useState, useCallback } from 'react';
import { TrendingUp, Heart, MessageCircle, Eye, Share2, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses, useOptimizedComponent } from '@/hooks/optimizacion';
import { useTrendingAnalytics, type TrendingPeriod } from '@/hooks/entidades/useTrendingAnalytics';

// Componentes UI reutilizables
import { MetricCard } from '@/components/ui/metric-card';
import { AnalyticsContainer } from '@/components/ui/analytics-container';
import { DistributionChart } from '@/components/ui/distribution-chart';
import { BarChart } from '@/components/ui/bar-chart';
import { LineChart } from '@/components/ui/line-chart';
import { RadarChart } from '@/components/ui/radar-chart';
import { TrendingPostCard } from '@/components/ui/trending-post-card';

interface TrendingDashboardProps {
  userId?: string;
  className?: string;
}

// Configuración de períodos
const PERIODS: { value: TrendingPeriod; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'all', label: 'Todos' },
];

export const TrendingDashboard = memo(function TrendingDashboard({
  userId,
  className,
}: TrendingDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'charts' | 'my' | 'all'>('charts');

  const {
    period,
    setPeriod,
    myTrendingPosts,
    allTrendingPosts,
    metrics,
    engagementDistribution,
    postMetrics,
    trendScores,
    radarData,
    isLoading,
    refetch,
  } = useTrendingAnalytics({ userId, enabled: true });

  // Optimización del componente
  useOptimizedComponent(
    { userId, period, activeTab },
    { componentName: 'TrendingDashboard' }
  );

  const handlePostClick = useCallback((postId: string) => {
    navigate(`/red-social/post/${postId}`);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <Skeleton key={p.value} className="h-9 w-16 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', animationClasses.fadeIn, className)}>
      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            variant={period === p.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p.value)}
            className={cn(
              'h-8 px-3 text-xs sm:text-sm',
              transitionClasses.colors
            )}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="charts" className="text-xs sm:text-sm">
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="my" className="text-xs sm:text-sm">
            Mis Trending
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            Todos
          </TabsTrigger>
        </TabsList>

        {/* Métricas siempre visibles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-4">
          <MetricCard
            title="Score Total"
            value={metrics.totalScore}
            averageText={`Promedio: ${metrics.averageScore}`}
            icon={TrendingUp}
            iconColor="text-primary"
            iconBgClass="bg-primary/10"
            size="sm"
            delay={0}
          />
          <MetricCard
            title="Posts"
            value={metrics.totalPosts}
            averageText="En tendencia"
            icon={Flame}
            iconColor="text-orange-500"
            iconBgClass="bg-orange-500/10"
            size="sm"
            delay={50}
          />
          <MetricCard
            title="Me Gusta"
            value={metrics.totalLikes}
            averageText={`${metrics.averageLikes} promedio`}
            icon={Heart}
            iconColor="text-destructive"
            iconBgClass="bg-destructive/10"
            size="sm"
            delay={100}
          />
          <MetricCard
            title="Comentarios"
            value={metrics.totalComments}
            averageText={`${metrics.averageComments} promedio`}
            icon={MessageCircle}
            iconColor="text-muted-foreground"
            iconBgClass="bg-muted"
            size="sm"
            delay={150}
          />
          <MetricCard
            title="Vistas"
            value={metrics.totalViews}
            averageText={`${metrics.averageViews} promedio`}
            icon={Eye}
            iconColor="text-blue-500"
            iconBgClass="bg-blue-500/10"
            size="sm"
            delay={200}
          />
          <MetricCard
            title="Compartidos"
            value={metrics.totalShares}
            averageText={`${metrics.averageShares} promedio`}
            icon={Share2}
            iconColor="text-emerald-500"
            iconBgClass="bg-emerald-500/10"
            size="sm"
            delay={250}
          />
        </div>

        {/* Charts Tab */}
        <TabsContent value="charts" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar chart - Métricas por publicación */}
            <BarChart
              title="Métricas por Publicación"
              data={postMetrics}
              barColor="hsl(0, 84%, 60%)"
              barColor2="hsl(217, 91%, 60%)"
              showLegend
              legendLabels={['Me gusta', 'Comentarios']}
              height={200}
              delay={300}
            />

            {/* Pie chart - Distribución de engagement */}
            <DistributionChart
              title="Distribución de Engagement"
              data={engagementDistribution}
              emptyMessage="Sin datos de engagement"
              height={200}
              delay={350}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Line chart - Puntuación de tendencia */}
            <LineChart
              title="Puntuación de Tendencia"
              data={trendScores}
              lineColor="hsl(0, 84%, 60%)"
              dotColor="hsl(0, 84%, 60%)"
              height={180}
              xAxisLabel="Puntuación"
              delay={400}
            />

            {/* Radar chart - Perfil de engagement */}
            <RadarChart
              title="Perfil de Engagement Promedio"
              data={radarData}
              fillColor="hsl(217, 91%, 60%)"
              strokeColor="hsl(217, 91%, 50%)"
              height={180}
              delay={450}
            />
          </div>
        </TabsContent>

        {/* My Trending Posts Tab */}
        <TabsContent value="my" className="mt-4">
          <AnalyticsContainer
            title={`Tus Publicaciones en Tendencia (${myTrendingPosts.length})`}
            variant="plain"
          >
            {myTrendingPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Sin publicaciones en tendencia
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Tus publicaciones aparecerán aquí cuando generen engagement.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTrendingPosts.map((post, index) => (
                  <TrendingPostCard
                    key={post.id}
                    post={post}
                    delay={index * 50}
                    onClick={handlePostClick}
                  />
                ))}
              </div>
            )}
          </AnalyticsContainer>
        </TabsContent>

        {/* All Trending Posts Tab */}
        <TabsContent value="all" className="mt-4">
          <AnalyticsContainer
            title={`Todas las Publicaciones en Tendencia (${allTrendingPosts.length})`}
            description="Las publicaciones más populares de la plataforma"
            variant="plain"
          >
            {allTrendingPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Sin publicaciones en tendencia
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  No hay publicaciones activas en el período seleccionado.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allTrendingPosts.map((post, index) => (
                  <TrendingPostCard
                    key={post.id}
                    post={post}
                    delay={index * 30}
                    onClick={handlePostClick}
                  />
                ))}
              </div>
            )}
          </AnalyticsContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
});

export default TrendingDashboard;
