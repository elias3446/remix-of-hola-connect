/**
 * Página de Publicaciones en Tendencia
 * Vista completa con stats, tabs y detalle de publicación
 */
import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Heart, MessageCircle, Eye, Share2, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedProfile } from '@/hooks/entidades/useOptimizedProfile';
import { useTrendingAnalytics, type TrendingPeriod, type TrendingPostAnalytics } from '@/hooks/entidades/useTrendingAnalytics';
import { EntityPageHeader } from '@/components/ui/entity-page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { MetricCard } from '@/components/ui/metric-card';
import { AnalyticsContainer } from '@/components/ui/analytics-container';
import { DistributionChart } from '@/components/ui/distribution-chart';
import { BarChart } from '@/components/ui/bar-chart';
import { LineChart } from '@/components/ui/line-chart';
import { cn } from '@/lib/utils';
import { animationClasses, transitionClasses } from '@/hooks/optimizacion';

// Configuración de períodos
const PERIODS: { value: TrendingPeriod; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'Todos' },
];

// Componente de item de publicación en la lista
interface PostListItemProps {
  post: TrendingPostAnalytics;
  isSelected: boolean;
  onClick: () => void;
}

const PostListItem = memo(function PostListItem({ post, isSelected, onClick }: PostListItemProps) {
  const authorInitials = post.author?.name
    ? post.author.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex gap-3 p-3 rounded-lg text-left transition-all",
        isSelected 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-secondary/50"
      )}
    >
      <span className={cn(
        "text-sm font-bold shrink-0",
        isSelected ? "text-primary-foreground" : "text-primary"
      )}>
        #{post.rank}
      </span>
      
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={post.author?.avatar || undefined} alt={post.author?.name || 'Usuario'} />
        <AvatarFallback className={cn(
          "text-xs font-medium",
          isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
        )}>
          {authorInitials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm truncate",
          isSelected ? "text-primary-foreground" : "text-foreground"
        )}>
          {post.author?.name || 'Usuario'}
        </p>
        <p className={cn(
          "text-xs line-clamp-1",
          isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {post.contenido || 'Sin contenido'}
        </p>
        <div className={cn(
          "flex items-center gap-3 mt-1 text-xs",
          isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {post.score}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {post.likes_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {post.comments_count}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {post.views_count}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="h-3 w-3" />
            {post.shares_count}
          </span>
        </div>
      </div>
    </button>
  );
});

// Componente de detalle de publicación
interface PostDetailProps {
  post: TrendingPostAnalytics | null;
  onViewPost?: (postId: string) => void;
}

const PostDetail = memo(function PostDetail({ post, onViewPost }: PostDetailProps) {
  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Selecciona una publicación</p>
      </div>
    );
  }

  const authorInitials = post.author?.name
    ? post.author.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: es,
  });

  // Calcular porcentajes para métricas
  const total = post.likes_count + post.comments_count + post.views_count + post.shares_count;
  const likesPercent = total > 0 ? (post.likes_count / total) * 100 : 0;
  const commentsPercent = total > 0 ? (post.comments_count / total) * 100 : 0;
  const viewsPercent = total > 0 ? (post.views_count / total) * 100 : 0;
  const sharesPercent = total > 0 ? (post.shares_count / total) * 100 : 0;

  return (
    <div className={cn("space-y-4", animationClasses.fadeIn)}>
      {/* Header con autor */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11">
            <AvatarImage src={post.author?.avatar || undefined} alt={post.author?.name || 'Usuario'} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{post.author?.name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">
              @{post.author?.username || 'usuario'} · {timeAgo}
            </p>
          </div>
        </div>
        <Badge className="bg-primary text-primary-foreground gap-1">
          <Flame className="h-3 w-3" />
          Tendencia
        </Badge>
      </div>

      {/* Contenido */}
      <p className="text-foreground">{post.contenido || 'Sin contenido'}</p>

      {/* Puntuación de Tendencia */}
      <Card className="bg-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-primary-foreground font-medium">Puntuación de Tendencia</span>
            <span className="text-2xl font-bold text-primary-foreground">{post.score}</span>
          </div>
          <Progress 
            value={Math.min((post.score / 10) * 100, 100)} 
            className="mt-2 h-2 bg-primary-foreground/20"
          />
        </CardContent>
      </Card>

      {/* Métricas de Engagement */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Métricas de Engagement</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Me gusta */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Heart className="h-4 w-4 text-destructive" />
                Me gusta
              </span>
              <span className="font-medium">{post.likes_count} ({likesPercent.toFixed(1)}%)</span>
            </div>
            <Progress value={likesPercent} className="h-1.5 bg-muted" />
          </div>

          {/* Comentarios */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-4 w-4 text-primary" />
                Comentarios
              </span>
              <span className="font-medium">{post.comments_count} ({commentsPercent.toFixed(1)}%)</span>
            </div>
            <Progress value={commentsPercent} className="h-1.5 bg-muted" />
          </div>

          {/* Vistas */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Eye className="h-4 w-4 text-blue-500" />
                Vistas
              </span>
              <span className="font-medium">{post.views_count} ({viewsPercent.toFixed(1)}%)</span>
            </div>
            <Progress value={viewsPercent} className="h-1.5 bg-muted" />
          </div>

          {/* Compartidos */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Share2 className="h-4 w-4 text-emerald-500" />
                Compartidos
              </span>
              <span className="font-medium">{post.shares_count} ({sharesPercent.toFixed(1)}%)</span>
            </div>
            <Progress value={sharesPercent} className="h-1.5 bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* Engagement Total */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Engagement Total</span>
            <span className="text-2xl font-bold text-foreground">{total}</span>
          </div>
        </CardContent>
      </Card>

      {/* Botón para ver publicación */}
      {onViewPost && (
        <Button 
          onClick={() => onViewPost(post.id)} 
          className="w-full"
          variant="outline"
        >
          Ver publicación completa
        </Button>
      )}
    </div>
  );
});

// Componente de item de lista completa
interface FullListItemProps {
  post: TrendingPostAnalytics;
  onClick: () => void;
}

const FullListItem = memo(function FullListItem({ post, onClick }: FullListItemProps) {
  const authorInitials = post.author?.name
    ? post.author.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: es,
  });

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        animationClasses.fadeIn
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Ranking */}
          <span className="text-lg font-bold text-primary shrink-0">#{post.rank}</span>
          
          {/* Avatar */}
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={post.author?.avatar || undefined} alt={post.author?.name || 'Usuario'} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
              {authorInitials}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground">{post.author?.name || 'Usuario'}</span>
              <span className="text-xs text-muted-foreground">@{post.author?.username || 'usuario'} · {timeAgo}</span>
            </div>
            <p className="text-sm text-foreground line-clamp-2 mb-3">{post.contenido || 'Sin contenido'}</p>
            
            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Score</span>
                <span className="font-semibold text-foreground">{post.score}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">Me gusta</span>
                <span className="font-semibold text-foreground">{post.likes_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Comentarios</span>
                <span className="font-semibold text-foreground">{post.comments_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Vistas</span>
                <span className="font-semibold text-foreground">{post.views_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <Share2 className="h-4 w-4 text-emerald-500" />
                <span className="text-muted-foreground">Compartidos</span>
                <span className="font-semibold text-foreground">{post.shares_count}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function TrendingPosts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useOptimizedProfile(user?.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'list'>('overview');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const {
    period,
    setPeriod,
    myTrendingPosts,
    allTrendingPosts,
    metrics,
    engagementDistribution,
    postMetrics,
    trendScores,
    isLoading,
  } = useTrendingAnalytics({ userId: profile?.id, enabled: true });

  const selectedPost = selectedPostId 
    ? myTrendingPosts.find(p => p.id === selectedPostId) || allTrendingPosts.find(p => p.id === selectedPostId)
    : null;

  const handlePostClick = useCallback((postId: string) => {
    setSelectedPostId(postId);
  }, []);

  const handleViewPost = useCallback((postId: string) => {
    navigate(`/red-social/post/${postId}`);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="h-full bg-background overflow-y-auto">
        <div className="flex flex-col gap-4 p-4 md:p-6 w-full">
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <Skeleton key={p.value} className="h-9 w-16 rounded-md" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-96 rounded-lg" />
            <Skeleton className="h-96 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full">
        {/* Header */}
        <EntityPageHeader
          title="Publicaciones en Tendencia"
          icon={Flame}
          entityKey="trending"
          showCreate={false}
          showBulkUpload={false}
          rightContent={
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <Button
                  key={p.value}
                  variant={period === p.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(p.value)}
                  className={cn('h-8 px-3 text-xs', transitionClasses.colors)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            title="Mis Me Gusta"
            value={metrics.totalLikes}
            averageText="En tus publicaciones"
            icon={Heart}
            iconColor="text-destructive"
            iconBgClass="bg-destructive/10"
            size="sm"
            delay={0}
          />
          <MetricCard
            title="Mis Comentarios"
            value={metrics.totalComments}
            averageText="En tus publicaciones"
            icon={MessageCircle}
            iconColor="text-muted-foreground"
            iconBgClass="bg-muted"
            size="sm"
            delay={50}
          />
          <MetricCard
            title="Mis Vistas"
            value={metrics.totalViews}
            averageText="En tus publicaciones"
            icon={Eye}
            iconColor="text-blue-500"
            iconBgClass="bg-blue-500/10"
            size="sm"
            delay={100}
          />
          <MetricCard
            title="Mis Compartidos"
            value={metrics.totalShares}
            averageText="En tus publicaciones"
            icon={Share2}
            iconColor="text-emerald-500"
            iconBgClass="bg-emerald-500/10"
            size="sm"
            delay={150}
          />
        </div>

        {/* Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="overview" className="text-sm">
              Vista General
            </TabsTrigger>
            <TabsTrigger value="charts" className="text-sm">
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="list" className="text-sm">
              Lista
            </TabsTrigger>
          </TabsList>

          {/* Vista General Tab */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Lista de mis publicaciones */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Mis Publicaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2 max-h-[500px] overflow-y-auto">
                  {myTrendingPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Sin publicaciones en tendencia</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {myTrendingPosts.map((post) => (
                        <PostListItem
                          key={post.id}
                          post={post}
                          isSelected={selectedPostId === post.id}
                          onClick={() => handlePostClick(post.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Detalle de publicación */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium">Detalle de Publicación</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <PostDetail post={selectedPost} onViewPost={handleViewPost} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Gráficos Tab */}
          <TabsContent value="charts" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bar chart - Métricas de Engagement */}
              <BarChart
                title="Métricas de Engagement"
                data={postMetrics}
                barColor="hsl(0, 84%, 60%)"
                barColor2="hsl(217, 91%, 60%)"
                showLegend
                legendLabels={['Me gusta', 'Comentarios']}
                height={220}
                delay={0}
              />

              {/* Pie chart - Distribución de Engagement */}
              <DistributionChart
                title="Distribución de Engagement"
                data={engagementDistribution}
                emptyMessage="Sin datos de engagement"
                height={220}
                delay={50}
              />
            </div>

            {/* Line chart - Puntuación de Tendencia */}
            <LineChart
              title="Puntuación de Tendencia"
              data={trendScores}
              lineColor="hsl(0, 84%, 60%)"
              dotColor="hsl(0, 84%, 60%)"
              height={200}
              xAxisLabel="Puntuación"
              delay={100}
            />
          </TabsContent>

          {/* Lista Completa Tab */}
          <TabsContent value="list" className="mt-4">
            <AnalyticsContainer
              title="Lista Completa"
              description="Todas las publicaciones más populares"
              variant="plain"
            >
              {allTrendingPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Flame className="h-12 w-12 text-muted-foreground/30 mb-4" />
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
                    <FullListItem
                      key={post.id}
                      post={post}
                      onClick={() => handleViewPost(post.id)}
                    />
                  ))}
                </div>
              )}
            </AnalyticsContainer>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
