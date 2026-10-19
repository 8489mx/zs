import { useState, useEffect, useRef, useCallback } from 'react';

export function useSplitter(storageKey: string, defaultLeftRatio: number = 50, isRtl: boolean = true) {
  const [leftRatio, setLeftRatio] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val >= 25 && val <= 75) return val;
      }
    } catch (err) {}
    return defaultLeftRatio;
  });

  const isDragging = useRef(false);
  const latestRatio = useRef(leftRatio);
  latestRatio.current = leftRatio;

  const isRtlRef = useRef(isRtl);
  isRtlRef.current = isRtl;

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

      // Clamp: ensure both cart and products keep at least 25% and at least 340px width
      const minPctByPx = rect.width > 0 ? (340 / rect.width) * 100 : 25;
      const minPct = Math.max(25, Math.min(minPctByPx, 38));
      const maxPct = 100 - minPct;

      if (pct < minPct) pct = minPct;
      if (pct > maxPct) pct = maxPct;

      // In RTL, left panel is Cart, so leftRatio (Cart width) = pct.
      // In LTR, left panel is Products, so products width = pct, meaning leftRatio (Cart width) = 100 - pct.
      const newLeftRatio = isRtlRef.current ? pct : (100 - pct);
      setLeftRatio(newLeftRatio);
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

  // Handle position relative to the left edge of the grid container:
  // In RTL, left panel is Cart (width = leftRatio), so divider is at leftRatio%.
  // In LTR, left panel is Products (width = rightRatio = 100 - leftRatio), so divider is at (100 - leftRatio)%.
  const handlePositionPct = isRtl ? leftRatio : (100 - leftRatio);

  return {
    leftRatio,
    rightRatio: 100 - leftRatio,
    handlePositionPct,
    startDrag,
  };
}
