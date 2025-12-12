import { memo, useState } from 'react';
import { Construction } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { animationClasses } from '@/hooks/optimizacion';
import { ReportesStatistics } from './ReportesStatistics';
import { UsuariosStatistics } from './UsuariosStatistics';
import { RolesStatistics } from './RolesStatistics';
import { CategoriasStatistics } from './CategoriasStatistics';
import { TiposStatistics } from './TiposStatistics';
import { ReportesComparativeAnalysis } from './ReportesComparativeAnalysis';
import { UsuariosComparativeAnalysis } from './UsuariosComparativeAnalysis';
import { RolesComparativeAnalysis } from './RolesComparativeAnalysis';
import { CategoriasComparativeAnalysis } from './CategoriasComparativeAnalysis';
import { TiposComparativeAnalysis } from './TiposComparativeAnalysis';

interface EntityTabContentProps {
  entityName: string;
  statisticsComponent?: React.ReactNode;
}

const DevelopmentPlaceholder = memo(function DevelopmentPlaceholder({ 
  message 
}: { message: string }) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 sm:py-16 text-center',
      animationClasses.fadeIn
    )}>
      <div className="p-3 rounded-full bg-muted mb-3">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        En Desarrollo
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {message}
      </p>
    </div>
  );
});

interface EntityTabContentProps {
  entityName: string;
  statisticsComponent?: React.ReactNode;
  comparativeComponent?: React.ReactNode;
}

const EntityTabContent = memo(function EntityTabContent({ 
  entityName, 
  statisticsComponent,
  comparativeComponent
}: EntityTabContentProps) {
  const [innerTab, setInnerTab] = useState('estadisticas');

  return (
    <Tabs value={innerTab} onValueChange={setInnerTab} className="w-full">
      <TabsList className="grid w-full max-w-xs grid-cols-2 h-9">
        <TabsTrigger value="estadisticas" className="text-sm">
          Estadísticas
        </TabsTrigger>
        <TabsTrigger value="comparativo" className="text-sm">
          Análisis Comparativo
        </TabsTrigger>
      </TabsList>

      <TabsContent value="estadisticas" className="mt-4">
        {statisticsComponent ? (
          statisticsComponent
        ) : (
          <DevelopmentPlaceholder 
            message={`Las estadísticas de ${entityName.toLowerCase()} estarán disponibles próximamente.`} 
          />
        )}
      </TabsContent>

      <TabsContent value="comparativo" className="mt-4">
        {comparativeComponent ? (
          comparativeComponent
        ) : (
          <DevelopmentPlaceholder 
            message={`El análisis comparativo de ${entityName.toLowerCase()} estará disponible próximamente.`} 
          />
        )}
      </TabsContent>
    </Tabs>
  );
});

export const DetailedAnalysisTabs = memo(function DetailedAnalysisTabs() {
  const [activeEntity, setActiveEntity] = useState('reportes');

  return (
    <div className={cn('space-y-4', animationClasses.fadeIn)}>
      {/* Tabs de entidades */}
      <Tabs value={activeEntity} onValueChange={setActiveEntity}>
        <TabsList className="grid w-full max-w-lg grid-cols-5 h-10">
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="tipos">Tipos</TabsTrigger>
        </TabsList>

        <TabsContent value="reportes" className="mt-4">
          <EntityTabContent 
            entityName="Reportes" 
            statisticsComponent={<ReportesStatistics />}
            comparativeComponent={<ReportesComparativeAnalysis />}
          />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <EntityTabContent 
            entityName="Usuarios" 
            statisticsComponent={<UsuariosStatistics />}
            comparativeComponent={<UsuariosComparativeAnalysis />}
          />
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <EntityTabContent 
            entityName="Roles" 
            statisticsComponent={<RolesStatistics />}
            comparativeComponent={<RolesComparativeAnalysis />}
          />
        </TabsContent>

        <TabsContent value="categorias" className="mt-4">
          <EntityTabContent 
            entityName="Categorías" 
            statisticsComponent={<CategoriasStatistics />}
            comparativeComponent={<CategoriasComparativeAnalysis />}
          />
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <EntityTabContent 
            entityName="Tipos de Reporte" 
            statisticsComponent={<TiposStatistics />}
            comparativeComponent={<TiposComparativeAnalysis />}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
});
