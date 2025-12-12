import { useState, useMemo, useCallback } from 'react';
import { useOptimizedUserAudit, UserAudit } from '@/hooks/entidades/useOptimizedUserAudit';

export interface AuditFilterOptions {
  userId?: string;
  registroId?: string;
  performedBy?: string;
}

export function useAuditFilter(initialFilters?: AuditFilterOptions) {
  const { data, isLoading, error, refetch } = useOptimizedUserAudit();
  const [filters, setFilters] = useState<AuditFilterOptions>(initialFilters || {});

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.filter((record) => {
      // Filtrar por user_id
      if (filters.userId && record.user_id !== filters.userId) {
        return false;
      }

      // Filtrar por registro_id
      if (filters.registroId && record.registro_id !== filters.registroId) {
        return false;
      }

      // Filtrar por performed_by
      if (filters.performedBy && record.performed_by !== filters.performedBy) {
        return false;
      }

      return true;
    });
  }, [data, filters]);

  const setFilter = useCallback((key: keyof AuditFilterOptions, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = useMemo(() => {
    return !!(filters.userId || filters.registroId || filters.performedBy);
  }, [filters]);

  return {
    data: filteredData,
    allData: data,
    isLoading,
    error,
    refetch,
    filters,
    setFilters,
    setFilter,
    clearFilters,
    hasActiveFilters,
  };
}

export type { UserAudit };
