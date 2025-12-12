/**
 * StickyAside - Sidebar sticky bidireccional estilo X/Twitter
 * - Scroll DOWN: se mueve con el feed hasta ver el último elemento, luego se pega abajo
 * - Scroll UP: se mueve con el feed hasta ver el primer elemento, luego se pega arriba
 * - Funciona con contenedores con overflow-y-auto
 */
import { useRef, useEffect, ReactNode } from 'react';

interface StickyAsideProps {
  children: ReactNode;
  className?: string;
}

// Estado global del sticky para persistir entre re-renders
const stickyState = {
  lastScrollY: 0,
  currentTop: 16,
  mode: 'top' as 'top' | 'bottom' | 'scrolling',
  lastAsideHeight: 0,
  scrollContainerId: '',
};

export function StickyAside({ children, className = '' }: StickyAsideProps) {
  const asideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;

    // Encontrar el contenedor con scroll (ancestor con overflow-y-auto)
    const findScrollContainer = (): HTMLElement | Window => {
      let parent = aside.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return parent;
        }
        parent = parent.parentElement;
      }
      return window;
    };

    const scrollContainer = findScrollContainer();
    const isWindow = scrollContainer === window;
    
    // Crear un ID único para el contenedor
    const containerId = isWindow ? 'window' : (scrollContainer as HTMLElement).className.slice(0, 50);
    
    // Si cambió el contenedor, reiniciar estado
    if (stickyState.scrollContainerId !== containerId) {
      stickyState.lastScrollY = 0;
      stickyState.currentTop = 16;
      stickyState.mode = 'top';
      stickyState.lastAsideHeight = 0;
      stickyState.scrollContainerId = containerId;
    }

    const getScrollY = (): number => {
      if (isWindow) {
        return window.scrollY;
      }
      return (scrollContainer as HTMLElement).scrollTop;
    };

    const getViewportHeight = (): number => {
      if (isWindow) {
        return window.innerHeight;
      }
      return (scrollContainer as HTMLElement).clientHeight;
    };

    const calculateLimits = () => {
      const asideHeight = aside.offsetHeight;
      const viewportHeight = getViewportHeight();
      const topPadding = 16;
      const bottomPadding = 16;
      
      const fits = asideHeight <= viewportHeight - topPadding - bottomPadding;
      const maxTop = topPadding;
      const minTop = fits ? topPadding : viewportHeight - asideHeight - bottomPadding;
      
      return { maxTop, minTop, fits, asideHeight };
    };

    const updateStyle = (top: number) => {
      aside.style.top = `${top}px`;
    };

    const handleScroll = () => {
      const scrollY = getScrollY();
      const scrollDelta = scrollY - stickyState.lastScrollY;
      
      // Ignorar cambios muy pequeños (layout shifts)
      if (Math.abs(scrollDelta) < 2) {
        stickyState.lastScrollY = scrollY;
        return;
      }
      
      const { maxTop, minTop, fits, asideHeight } = calculateLimits();
      
      // Si el sidebar cabe en el viewport, siempre sticky arriba
      if (fits) {
        if (stickyState.currentTop !== maxTop) {
          stickyState.currentTop = maxTop;
          stickyState.mode = 'top';
          updateStyle(maxTop);
        }
        stickyState.lastScrollY = scrollY;
        return;
      }
      
      // Detectar cambio de altura significativo
      if (stickyState.lastAsideHeight !== 0 && Math.abs(stickyState.lastAsideHeight - asideHeight) > 10) {
        if (stickyState.mode === 'bottom') {
          stickyState.currentTop = minTop;
          updateStyle(minTop);
        }
        stickyState.lastAsideHeight = asideHeight;
        stickyState.lastScrollY = scrollY;
        return;
      }
      stickyState.lastAsideHeight = asideHeight;
      
      const isScrollingDown = scrollDelta > 0;
      
      if (isScrollingDown) {
        if (stickyState.mode === 'bottom') {
          // Mantener pegado abajo
          if (stickyState.currentTop !== minTop) {
            stickyState.currentTop = minTop;
            updateStyle(minTop);
          }
        } else {
          // Mover con el scroll
          stickyState.currentTop -= scrollDelta;
          stickyState.mode = 'scrolling';
          
          if (stickyState.currentTop <= minTop) {
            stickyState.currentTop = minTop;
            stickyState.mode = 'bottom';
          }
          updateStyle(stickyState.currentTop);
        }
      } else {
        // Scrolling UP
        if (stickyState.mode === 'top') {
          // Mantener pegado arriba
          if (stickyState.currentTop !== maxTop) {
            stickyState.currentTop = maxTop;
            updateStyle(maxTop);
          }
        } else {
          // Mover con el scroll
          stickyState.currentTop -= scrollDelta;
          stickyState.mode = 'scrolling';
          
          if (stickyState.currentTop >= maxTop) {
            stickyState.currentTop = maxTop;
            stickyState.mode = 'top';
          }
          updateStyle(stickyState.currentTop);
        }
      }
      
      stickyState.lastScrollY = scrollY;
    };

    // Inicializar lastScrollY con el valor actual
    stickyState.lastScrollY = getScrollY();
    
    // Aplicar el estado actual al DOM
    updateStyle(stickyState.currentTop);
    
    const { asideHeight } = calculateLimits();
    if (stickyState.lastAsideHeight === 0) {
      stickyState.lastAsideHeight = asideHeight;
    }
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <aside
      ref={asideRef}
      className={`hidden lg:block w-80 shrink-0 ${className}`}
      style={{
        position: 'sticky',
        top: '16px',
      }}
    >
      {children}
    </aside>
  );
}
