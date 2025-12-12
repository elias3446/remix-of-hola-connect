// Hook factory universal
export { usePublicaciones, useInfiniteScroll } from './usePublicaciones';
export type { Publicacion, PublicacionAuthor } from './usePublicaciones';

// Detalle de publicación
export { usePublicacionDetail } from './usePublicacionDetail';

// Comentarios
export { useComentarios, useComentarioReplies } from './useComentarios';
export type { Comentario, ComentarioAuthor } from './useComentarios';

export {
  createOptimizedEntityHook,
  setCachedUserId,
  getCachedUserId,
  useSeedQueryCache,
  type OptimizedEntityConfig,
  type OptimizedEntityResult,
} from './useOptimizedEntity';

// Hook factory para listas de entidades
export {
  createOptimizedEntityListHook,
  type OptimizedEntityListConfig,
  type OptimizedEntityListResult,
} from './useOptimizedEntityList';

// Hook de inicialización de datos de usuario
export { useInitializeUserData } from './useInitializeUserData';

// Hook para verificar si los datos del usuario están listos
export { useUserDataReady } from './useUserDataReady';

// Hooks de entidades específicas (usuario actual)
export {
  useOptimizedProfile,
  initializeProfileCache,
  type Profile,
  type ProfileUpdate,
} from './useOptimizedProfile';

export {
  useOptimizedSettings,
  type Settings,
  type SettingsUpdate,
} from './useOptimizedSettings';

export {
  useOptimizedUserRoles,
  hasRole,
  hasPermission,
  type UserRoles,
  type UserRolesUpdate,
} from './useOptimizedUserRoles';

// Hooks de listas de entidades
export {
  useOptimizedCategories,
  type Category,
  type CategoryInsert,
  type CategoryUpdate,
} from './useOptimizedCategories';

export {
  useOptimizedTipoReportes,
  type TipoReporte,
  type TipoReporteInsert,
  type TipoReporteUpdate,
} from './useOptimizedTipoReportes';

export {
  useOptimizedReportes,
  type Reporte,
  type ReporteInsert,
  type ReporteUpdate,
  type ReporteWithDistance,
} from './useOptimizedReportes';

export {
  useOptimizedUsers,
  type User,
  type UserInsert,
  type UserUpdate,
} from './useOptimizedUsers';

export {
  useOptimizedUserAudit,
  type UserAudit,
} from './useOptimizedUserAudit';

export {
  useOptimizedUserRolesList,
  type UserRoleList,
} from './useOptimizedUserRolesList';

// Hooks de búsqueda y sugerencias (legacy - useUserSearch)
export {
  useUserSearch,
  type UserSearchResult,
} from './useUserSearch';

// Hooks de búsqueda avanzada de hashtags y menciones
export {
  useHashtagSearch,
  useMentionSearch,
  useFilteredPosts,
  useAdvancedSearch,
  useInlineDetector,
  extractHashtags,
  extractMentions,
  type HashtagResult,
  type MentionResult,
  type SearchFilters,
  type FilteredPost,
} from './useAdvancedSearch';

export {
  useUserStats,
  type UserStats,
} from './useUserStats';

export {
  useTrendingHashtags,
  type TrendingHashtag,
  type TrendingPeriod,
} from './useTrendingHashtags';

export {
  useTrendingPosts,
  type TrendingPost,
} from './useTrendingPosts';

export {
  useSuggestedUsers,
  type SuggestedUser,
} from './useSuggestedUsers';

// Historial de reportes
export { useReporteHistorial } from './useReporteHistorial';

// Relaciones de usuarios (solicitudes de amistad, seguir, etc.)
export {
  useUserRelations,
  type FollowStatus,
  type FriendStatus,
  type UserRelation,
  type RelationInfo,
} from './useUserRelations';

// Bloqueos entre usuarios
export {
  useUserBlocks,
  type BlockInfo,
} from './useUserBlocks';

// Perfil de usuario para red social
export {
  useUserProfile,
  useUserFollowers,
  useUserFollowing,
  type UserProfileData,
} from './useUserProfile';

// Publicaciones de un usuario específico
export { useUserPublicaciones, useUserSavedPosts, useUserFeaturedPosts } from './useUserPublicaciones';

// Trending Analytics
export {
  useTrendingAnalytics,
  type TrendingPeriod as TrendingAnalyticsPeriod,
  type TrendingPostAnalytics,
  type TrendingMetrics,
  type EngagementDistribution,
  type UseTrendingAnalyticsReturn,
} from './useTrendingAnalytics';

// Suscripciones a hashtags
export {
  useHashtagSubscription,
  type HashtagSubscription,
} from './useHashtagSubscription';

// Realtime relations
export { useRealtimeRelations } from './useRealtimeRelations';
