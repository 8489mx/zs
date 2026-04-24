import { useCallback, useEffect, useState } from 'react';

export type PosSaleMode = 'scanner' | 'touch';

const POS_SALE_MODE_KEY = 'zsystems.pos.sale-mode';

export function normalizePosSaleMode(value: unknown): PosSaleMode {
  return value === 'touch' ? 'touch' : 'scanner';
}

function readStoredPosSaleMode(): PosSaleMode | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(POS_SALE_MODE_KEY);
  return stored === 'scanner' || stored === 'touch' ? stored : null;
}

function writeStoredPosSaleMode(mode: PosSaleMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(POS_SALE_MODE_KEY, mode);
}

export function usePosSaleMode(defaultMode: PosSaleMode) {
  const [mode, setModeState] = useState<PosSaleMode>(() => readStoredPosSaleMode() || defaultMode);

  useEffect(() => {
    if (readStoredPosSaleMode()) return;
    setModeState(defaultMode);
  }, [defaultMode]);

  const setMode = useCallback((nextMode: PosSaleMode) => {
    writeStoredPosSaleMode(nextMode);
    setModeState(nextMode);
  }, []);

  return [mode, setMode] as const;
}
