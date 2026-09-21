import { useRef, useCallback, useEffect } from 'react';

interface UseDragScrollOptions {
  sensitivity?: number;
}

/**
 * Hook providing smooth mouse-drag-to-scroll for horizontal containers.
 * - Strictly ignores touch events to allow 100% native, hardware-accelerated touch/mobile scrolling.
 * - Direction-locking: aborts if vertical scroll (dy > dx) is detected so the page scrolls freely.
 * - Listens to mouseup/touchend/pointerup/blur to strictly prevent drag-lock / mouse-freeze glitches.
 * - Suppresses child click events ONLY if the user actually dragged horizontally (> 6px).
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>(options: UseDragScrollOptions = {}) {
  const ref = useRef<T | null>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const scrollLeftPos = useRef(0);
  const hasDragged = useRef(false);

  const cleanupListenersRef = useRef<(() => void) | null>(null);

  // Clean up any dangling listeners on unmount
  useEffect(() => {
    return () => {
      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
        cleanupListenersRef.current = null;
      }
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left click initiates drag
    if (e.button !== 0) return;

    // Strict Touch Guard: Never hijack touch or pen inputs; let native mobile scrolling handle it
    const nativeEvent = e.nativeEvent as any;
    if (nativeEvent?.pointerType === 'touch' || nativeEvent?.pointerType === 'pen') {
      return;
    }
    // Also guard coarse pointer devices (pure touchscreens / mobile browsers)
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
      return;
    }

    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;

    isDown.current = true;
    hasDragged.current = false;
    startX.current = e.pageX;
    startY.current = e.pageY;
    scrollLeftPos.current = el.scrollLeft;

    // Remove any previous listeners if still lingering
    if (cleanupListenersRef.current) {
      cleanupListenersRef.current();
      cleanupListenersRef.current = null;
    }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDown.current || !ref.current) return;
      const targetEl = ref.current;
      const dx = ev.pageX - startX.current;
      const dy = ev.pageY - startY.current;

      // Direction lock: If vertical movement is greater than horizontal, user is scrolling the page vertically!
      if (!hasDragged.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
        handleRelease();
        return;
      }

      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        hasDragged.current = true;
        targetEl.scrollLeft = scrollLeftPos.current - dx * (options.sensitivity ?? 1.15);
      }
    };

    const handleRelease = () => {
      isDown.current = false;
      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
        cleanupListenersRef.current = null;
      }
      setTimeout(() => {
        hasDragged.current = false;
      }, 50);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleRelease);
    window.addEventListener('mouseleave', handleRelease);
    window.addEventListener('blur', handleRelease);
    window.addEventListener('pointerup', handleRelease);
    window.addEventListener('pointercancel', handleRelease);

    cleanupListenersRef.current = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleRelease);
      window.removeEventListener('mouseleave', handleRelease);
      window.removeEventListener('blur', handleRelease);
      window.removeEventListener('pointerup', handleRelease);
      window.removeEventListener('pointercancel', handleRelease);
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
