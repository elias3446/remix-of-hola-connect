/**
 * Hook para el visor de estados (Stories Viewer)
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { UserEstadoGroup, StatusViewerState, StatusViewerConfig } from './types';

const DEFAULT_CONFIG: StatusViewerConfig = {
  autoPlayDuration: 5000, // 5 segundos por estado
  showProgress: true,
  allowReactions: true,
  allowShare: true,
};

export function useStatusViewer(
  userGroups: UserEstadoGroup[],
  config: Partial<StatusViewerConfig> = {},
  onView?: (estadoId: string) => void
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<StatusViewerState>({
    isOpen: false,
    currentUserIndex: 0,
    currentStatusIndex: 0,
    isPaused: false,
    progress: 0,
  });

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);
  const userGroupsRef = useRef(userGroups);
  const onViewRef = useRef(onView);

  // Mantener refs actualizados
  useEffect(() => {
    userGroupsRef.current = userGroups;
  }, [userGroups]);

  useEffect(() => {
    onViewRef.current = onView;
  }, [onView]);

  // Grupo y estado actuales
  const currentGroup = userGroups[state.currentUserIndex];
  const currentStatus = currentGroup?.estados[state.currentStatusIndex];
  const totalStatusesInGroup = currentGroup?.total_count || 0;

  // Limpiar intervalo (sin resetear progreso)
  const stopProgressTimer = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Ir al siguiente estado (definido antes de startProgress para evitar dependencia circular)
  const goToNextStatus = useCallback(() => {
    stopProgressTimer();
    progressRef.current = 0;

    setState(prev => {
      const groups = userGroupsRef.current;
      const currentGroup = groups[prev.currentUserIndex];
      
      if (!currentGroup) {
        return { ...prev, isOpen: false, progress: 0 };
      }

      // Si hay más estados en este usuario
      if (prev.currentStatusIndex < currentGroup.estados.length - 1) {
        const nextIndex = prev.currentStatusIndex + 1;
        
        // Registrar vista del siguiente estado
        if (onViewRef.current && currentGroup.estados[nextIndex]) {
          onViewRef.current(currentGroup.estados[nextIndex].id);
        }
        
        return { ...prev, currentStatusIndex: nextIndex, progress: 0 };
      }

      // Si hay más usuarios
      if (prev.currentUserIndex < groups.length - 1) {
        const nextUserIndex = prev.currentUserIndex + 1;
        const nextGroup = groups[nextUserIndex];
        
        // Registrar vista del primer estado del siguiente usuario
        if (onViewRef.current && nextGroup?.estados[0]) {
          onViewRef.current(nextGroup.estados[0].id);
        }
        
        return {
          ...prev,
          currentUserIndex: nextUserIndex,
          currentStatusIndex: 0,
          progress: 0,
        };
      }

      // No hay más estados, cerrar visor
      return { ...prev, isOpen: false, progress: 0 };
    });
  }, [stopProgressTimer]);

  // Iniciar o reanudar progreso desde el punto actual
  const startProgress = useCallback((fromProgress?: number) => {
    stopProgressTimer();
    
    // Si se proporciona un progreso inicial, usarlo
    if (fromProgress !== undefined) {
      progressRef.current = fromProgress;
    }
    
    const updateInterval = 50; // Actualizar cada 50ms
    const incrementPerUpdate = (100 / fullConfig.autoPlayDuration) * updateInterval;
    
    progressIntervalRef.current = setInterval(() => {
      progressRef.current += incrementPerUpdate;
      
      if (progressRef.current >= 100) {
        // Ir al siguiente estado
        goToNextStatus();
      } else {
        setState(prev => ({ ...prev, progress: progressRef.current }));
      }
    }, updateInterval);
  }, [fullConfig.autoPlayDuration, stopProgressTimer, goToNextStatus]);

  // Limpiar intervalo y resetear progreso
  const clearProgress = useCallback(() => {
    stopProgressTimer();
    progressRef.current = 0;
    setState(prev => ({ ...prev, progress: 0 }));
  }, [stopProgressTimer]);

  // Pausar/Reanudar - mantiene el progreso actual
  const togglePause = useCallback(() => {
    setState(prev => {
      const newIsPaused = !prev.isPaused;
      
      if (newIsPaused) {
        // Pausar: solo detener el timer, NO resetear progreso
        stopProgressTimer();
      } else {
        // Reanudar: continuar desde el progreso actual
        startProgress(progressRef.current);
      }
      
      return { ...prev, isPaused: newIsPaused };
    });
  }, [stopProgressTimer, startProgress]);

  // Abrir visor en un usuario específico y opcionalmente en un estado específico
  const openViewer = useCallback((userIndex: number = 0, statusIndex: number = 0) => {
    progressRef.current = 0;
    setState({
      isOpen: true,
      currentUserIndex: userIndex,
      currentStatusIndex: statusIndex,
      isPaused: false,
      progress: 0,
    });

    // Registrar vista
    const group = userGroupsRef.current[userIndex];
    if (group?.estados[statusIndex] && onViewRef.current) {
      onViewRef.current(group.estados[statusIndex].id);
    }
  }, []);

  // Cerrar visor
  const closeViewer = useCallback(() => {
    stopProgressTimer();
    progressRef.current = 0;
    setState({
      isOpen: false,
      currentUserIndex: 0,
      currentStatusIndex: 0,
      isPaused: false,
      progress: 0,
    });
  }, [stopProgressTimer]);

  // Ir al estado anterior
  const goToPrevStatus = useCallback(() => {
    stopProgressTimer();
    progressRef.current = 0;

    setState(prev => {
      const groups = userGroupsRef.current;
      
      // Si hay estados anteriores en este usuario
      if (prev.currentStatusIndex > 0) {
        return { ...prev, currentStatusIndex: prev.currentStatusIndex - 1, progress: 0 };
      }

      // Si hay usuarios anteriores
      if (prev.currentUserIndex > 0) {
        const prevUserIndex = prev.currentUserIndex - 1;
        const prevGroup = groups[prevUserIndex];
        const lastStatusIndex = (prevGroup?.estados.length || 1) - 1;
        
        return {
          ...prev,
          currentUserIndex: prevUserIndex,
          currentStatusIndex: lastStatusIndex,
          progress: 0,
        };
      }

      // Ya estamos en el primer estado
      return { ...prev, progress: 0 };
    });
  }, [stopProgressTimer]);

  // Ir a un estado específico dentro del grupo actual
  const goToStatusInGroup = useCallback((statusIndex: number) => {
    stopProgressTimer();
    progressRef.current = 0;
    
    setState(prev => {
      const groups = userGroupsRef.current;
      const currentGroup = groups[prev.currentUserIndex];
      if (!currentGroup || statusIndex < 0 || statusIndex >= currentGroup.estados.length) {
        return prev;
      }

      // Registrar vista
      if (onViewRef.current && currentGroup.estados[statusIndex]) {
        onViewRef.current(currentGroup.estados[statusIndex].id);
      }

      return { ...prev, currentStatusIndex: statusIndex, progress: 0 };
    });
  }, [stopProgressTimer]);

  // Manejar clic en el área izquierda/derecha
  const handleAreaClick = useCallback((side: 'left' | 'right') => {
    if (side === 'left') {
      goToPrevStatus();
    } else {
      goToNextStatus();
    }
  }, [goToPrevStatus, goToNextStatus]);

  // Efecto para manejar el auto-play
  useEffect(() => {
    if (state.isOpen && !state.isPaused) {
      startProgress();
    } else {
      stopProgressTimer();
    }

    return () => {
      stopProgressTimer();
    };
  }, [state.isOpen, state.isPaused, state.currentStatusIndex, state.currentUserIndex]);

  // Manejar teclas
  useEffect(() => {
    if (!state.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevStatus();
          break;
        case 'ArrowRight':
          goToNextStatus();
          break;
        case ' ':
          e.preventDefault();
          togglePause();
          break;
        case 'Escape':
          closeViewer();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isOpen, goToPrevStatus, goToNextStatus, togglePause, closeViewer]);

  return {
    // Estado
    ...state,
    currentGroup,
    currentStatus,
    totalStatusesInGroup,
    config: fullConfig,

    // Acciones
    openViewer,
    closeViewer,
    togglePause,
    goToNextStatus,
    goToPrevStatus,
    goToStatusInGroup,
    handleAreaClick,
  };
}
