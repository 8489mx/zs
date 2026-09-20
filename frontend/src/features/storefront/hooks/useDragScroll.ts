import { useRef, useCallback, useEffect } from 'react';

interface UseDragScrollOptions {
  sensitivity?: number;
}

/**
 * Hook providing smooth mouse-drag-to-scroll for horizontal containers.
 * - Listens to window mouseup/mouseleave to strictly prevent mouse-lock glitches.
 * - Suppresses child click events if the user actually dragged (> 5px).
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>(options: UseDragScrollOptions = {}) {
  const ref = useRef<T | null>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftPos = useRef(0);
  const hasDragged = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left click initiates drag
    if (e.button !== 0) return;
    const el = ref.current;
    if (!el) return;

    isDown.current = true;
    hasDragged.current = false;
    startX.current = e.pageX;
    scrollLeftPos.current = el.scrollLeft;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown.current || !ref.current) return;
      const el = ref.current;
      const dx = e.pageX - startX.current;

      if (Math.abs(dx) > 5) {
        hasDragged.current = true;
        // Subtracting dx provides natural 1:1 drag-to-scroll
        el.scrollLeft = scrollLeftPos.current - dx * (options.sensitivity ?? 1.15);
      }
    };

    const handleMouseUp = () => {
      if (!isDown.current) return;
      isDown.current = false;
      // Slight delay so child click handlers can detect that a drag just ended
      setTimeout(() => {
        hasDragged.current = false;
      }, 50);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
      window.removeEventListener('blur', handleMouseUp);
    };
  }, [options.sensitivity]);

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  return {
    ref,
    onMouseDown: handleMouseDown,
    onClickCapture: handleClickCapture,
  };
}
