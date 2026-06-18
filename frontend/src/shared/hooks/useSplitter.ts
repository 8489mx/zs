import { useState, useEffect, useRef, useCallback } from 'react';

export function useSplitter(storageKey: string, defaultLeftRatio: number = 50) {
  const [leftRatio, setLeftRatio] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val > 10 && val < 90) return val;
      }
    } catch (err) {}
    return defaultLeftRatio;
  });

  const isDragging = useRef(false);
  const latestRatio = useRef(leftRatio);
  latestRatio.current = leftRatio;

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      // Find the grid container to calculate ratio relative to it, not window
      const grid = document.querySelector('.pos-grid-premium') as HTMLElement | null;
      if (!grid) return;

      const rect = grid.getBoundingClientRect();
      // clientX relative to the grid's left edge, as a percentage of the grid width
      let pct = ((e.clientX - rect.left) / rect.width) * 100;

      // Clamp
      if (pct < 20) pct = 20;
      if (pct > 80) pct = 80;

      setLeftRatio(pct);
    };

    const handlePointerUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          localStorage.setItem(storageKey, latestRatio.current.toString());
        } catch (err) {}
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [storageKey]);

  return {
    leftRatio,
    rightRatio: 100 - leftRatio,
    startDrag,
  };
}
