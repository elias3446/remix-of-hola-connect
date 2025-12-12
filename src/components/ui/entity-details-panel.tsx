import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useAnimations, 
  transitionClasses, 
  animationClasses 
} from "@/hooks/optimizacion";
import { LucideIcon } from "lucide-react";

// ============= TIPOS =============

export interface EntityInfoItem {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  variant?: "default" | "muted" | "primary" | "destructive" | "warning" | "success";
}

export interface EntityBadgeItem {
  label: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

export interface EntityActionButton {
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface EntitySwitchAction {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  indicatorColor?: "green" | "red" | "yellow" | "blue";
  disabled?: boolean;
}

export interface EntityTab {
  value: string;
  label: string;
  icon?: LucideIcon;
  content: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

export interface EntityDetailsPanelProps {
  // Header
  title: string;
  subtitle?: string;
  avatar?: {
    src?: string;
    fallback: string;
    icon?: LucideIcon;
  };
  headerBadges?: EntityBadgeItem[];
  
  // Info sections
  infoItems?: EntityInfoItem[];
  
  // Status badges
  statusBadges?: Array<{
    label: string;
    value: string;
    color?: string;
    className?: string;
  }>;
  
  // Switch actions
  switchActions?: EntitySwitchAction[];
  
  // Action buttons
  actionButtons?: EntityActionButton[];
  
  // Secondary info section
  secondaryInfo?: EntityInfoItem[];
  
  // Tabs
  tabs?: EntityTab[];
  defaultTab?: string;
  
  // Layout
  className?: string;
  sidebarClassName?: string;
  contentClassName?: string;
  
  // Loading state
  isLoading?: boolean;
  
  // Custom render functions
  renderSidebarHeader?: () => React.ReactNode;
  renderSidebarFooter?: () => React.ReactNode;
  renderContentHeader?: () => React.ReactNode;
}

// ============= COMPONENTES AUXILIARES =============

const InfoRow = React.memo<{
  item: EntityInfoItem;
  index: number;
}>(({ item, index }) => {
  const Icon = item.icon;
  
  const valueColorClass = React.useMemo(() => {
    switch (item.variant) {
      case "muted": return "text-muted-foreground";
      case "primary": return "text-primary";
      case "destructive": return "text-destructive";
      case "warning": return "text-amber-600";
      case "success": return "text-emerald-600";
      default: return "text-foreground";
    }
  }, [item.variant]);

  return (
    <div 
      className={cn(
        "flex items-start gap-3 py-2",
        animationClasses.fadeIn
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{item.label}</p>
        <div className={cn("text-sm font-medium break-words", valueColorClass)}>
          {item.value}
        </div>
      </div>
    </div>
  );
});
InfoRow.displayName = "InfoRow";

const StatusBadgeRow = React.memo<{
  label: string;
  value: string;
  color?: string;
  className?: string;
}>(({ label, value, color, className }) => (
  <div className="space-y-1.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <Badge 
      className={cn(
        "w-full justify-center py-1.5 rounded-md font-medium",
        className
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {value}
    </Badge>
  </div>
));
StatusBadgeRow.displayName = "StatusBadgeRow";

const SwitchActionRow = React.memo<{
  action: EntitySwitchAction;
}>(({ action }) => {
  const indicatorColor = React.useMemo(() => {
    switch (action.indicatorColor) {
      case "green": return "bg-emerald-500";
      case "red": return "bg-destructive";
      case "yellow": return "bg-amber-500";
      case "blue": return "bg-primary";
      default: return action.checked ? "bg-emerald-500" : "bg-muted";
    }
  }, [action.indicatorColor, action.checked]);

  return (
    <div className="space-y-1.5">
      {action.description && (
        <p className="text-xs text-muted-foreground">{action.description}</p>
      )}
      <div className="flex items-center justify-between gap-3 py-1">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", indicatorColor)} />
          <span className="text-sm font-medium">{action.label}</span>
        </div>
        <Switch 
          checked={action.checked} 
          onCheckedChange={action.onCheckedChange}
          disabled={action.disabled}
        />
      </div>
    </div>
  );
});
SwitchActionRow.displayName = "SwitchActionRow";

// ============= COMPONENTE PRINCIPAL =============

export const EntityDetailsPanel = React.forwardRef<
  HTMLDivElement,
  EntityDetailsPanelProps
>(({
  // Header
  title,
  subtitle,
  avatar,
  headerBadges,
  
  // Info
  infoItems,
  statusBadges,
  switchActions,
  actionButtons,
  secondaryInfo,
  
  // Tabs
  tabs,
  defaultTab,
  
  // Layout
  className,
  sidebarClassName,
  contentClassName,
  
  // Loading
  isLoading,
  
  // Custom renders
  renderSidebarHeader,
  renderSidebarFooter,
  renderContentHeader,
}, ref) => {
  const { getStaggerClass } = useAnimations();
  
  const AvatarIcon = avatar?.icon;

  if (isLoading) {
    return (
      <div 
        ref={ref}
        className={cn(
          "flex flex-col lg:flex-row gap-6 animate-pulse",
          className
        )}
      >
        {/* Skeleton Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-muted" />
            <div className="h-6 w-40 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
        
        {/* Skeleton Content */}
        <div className="flex-1 space-y-4">
          <div className="h-10 bg-muted rounded w-full max-w-md" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      className={cn(
        "flex flex-col lg:flex-row gap-6",
        animationClasses.fadeIn,
        className
      )}
    >
      {/* ============= SIDEBAR ============= */}
      <Card className={cn(
        "w-full lg:w-80 xl:w-96 flex-shrink-0 lg:max-w-[40%]",
        transitionClasses.card,
        sidebarClassName
      )}>
        <CardContent className="p-4 sm:p-6">
          <ScrollArea className="h-full max-h-none">
            <div className="space-y-6">
              {/* Header personalizado */}
              {renderSidebarHeader?.()}
              
              {/* Avatar y título */}
              <div className="flex flex-col items-center text-center gap-3">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  {avatar?.src ? (
                    <AvatarImage src={avatar.src} alt={title} />
                  ) : null}
                  <AvatarFallback className="text-xl font-semibold bg-muted">
                    {AvatarIcon ? (
                      <AvatarIcon className="h-10 w-10 text-muted-foreground" />
                    ) : (
                      avatar?.fallback || title.substring(0, 2).toUpperCase()
                    )}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1 w-full max-w-full px-2">
                  <h2 className="text-xl font-semibold text-foreground break-words line-clamp-3">{title}</h2>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground break-words line-clamp-2">{subtitle}</p>
                  )}
                </div>
                
                {/* Header badges */}
                {headerBadges && headerBadges.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {headerBadges.map((badge, idx) => (
                      <Badge 
                        key={idx} 
                        variant={badge.variant || "secondary"}
                        className={badge.className}
                      >
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Info items principales */}
              {infoItems && infoItems.length > 0 && (
                <div className="space-y-1">
                  {infoItems.map((item, idx) => (
                    <InfoRow key={idx} item={item} index={idx} />
                  ))}
                </div>
              )}
              
              {/* Status badges */}
              {statusBadges && statusBadges.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    {statusBadges.map((badge, idx) => (
                      <StatusBadgeRow 
                        key={idx} 
                        label={badge.label}
                        value={badge.value}
                        color={badge.color}
                        className={badge.className}
                      />
                    ))}
                  </div>
                </>
              )}
              
              {/* Switch actions */}
              {switchActions && switchActions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    {switchActions.map((action, idx) => (
                      <SwitchActionRow key={idx} action={action} />
                    ))}
                  </div>
                </>
              )}
              
              {/* Action buttons */}
              {actionButtons && actionButtons.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    {actionButtons.map((action, idx) => {
                      const ActionIcon = action.icon;
                      return (
                        <Button
                          key={idx}
                          variant={action.variant || "outline"}
                          className={cn("w-full", action.className)}
                          onClick={action.onClick}
                          disabled={action.disabled}
                        >
                          {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                </>
              )}
              
              {/* Secondary info */}
              {secondaryInfo && secondaryInfo.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    {secondaryInfo.map((item, idx) => (
                      <InfoRow key={idx} item={item} index={idx} />
                    ))}
                  </div>
                </>
              )}
              
              {/* Footer personalizado */}
              {renderSidebarFooter?.()}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* ============= CONTENIDO CON TABS ============= */}
      {tabs && tabs.length > 0 && (
        <Card className={cn(
          "flex-1 min-w-0",
          transitionClasses.card,
          contentClassName
        )}>
          <CardContent className="p-6">
            {/* Header personalizado del contenido */}
            {renderContentHeader?.()}
            
            <Tabs defaultValue={defaultTab || tabs[0]?.value} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {tabs.map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      disabled={tab.disabled}
                      className={cn(
                        "flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                        transitionClasses.fast
                      )}
                    >
                      {TabIcon && <TabIcon className="h-4 w-4" />}
                      <span>{tab.label}</span>
                      {tab.badge !== undefined && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                          {tab.badge}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              
              {tabs.map((tab) => (
                <TabsContent 
                  key={tab.value} 
                  value={tab.value}
                  className={cn("mt-6", animationClasses.fadeIn)}
                >
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

EntityDetailsPanel.displayName = "EntityDetailsPanel";

// ============= COMPONENTES DE CONTENIDO AUXILIARES =============

export interface EmptyTabContentProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyTabContent: React.FC<EmptyTabContentProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => (
  <div className={cn(
    "flex flex-col items-center justify-center py-16 text-center",
    animationClasses.fadeIn
  )}>
    {Icon && (
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    )}
    <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    )}
    {action && (
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    )}
  </div>
);

export interface TabSectionProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export const TabSection: React.FC<TabSectionProps> = ({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}) => (
  <div className={cn("space-y-4", className)}>
    <div className="flex items-center gap-3">
      {Icon && <Icon className="h-5 w-5 text-primary" />}
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
    <div>{children}</div>
  </div>
);
