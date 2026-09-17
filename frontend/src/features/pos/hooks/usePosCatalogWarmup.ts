import { useEffect, useRef, useState, useCallback } from 'react';
import { posApi } from '@/features/pos/api/pos.api';
import {
  saveCatalogToStorage,
  getCatalogVersionFromStorage,
  getCatalogCountFromStorage,
  getLastSyncedAtFromStorage,
} from '@/features/pos/lib/pos-catalog-storage';

interface PosCatalogWarmupOptions {
  branchId?: string;
  locationId?: string;
  enabled?: boolean;
}

const WARMUP_INITIAL_DELAY_MS = 3500;
const HEARTBEAT_INTERVAL_MS = 300_000; // 5 minutes

export function usePosCatalogWarmup({ branchId, locationId, enabled = true }: PosCatalogWarmupOptions = {}) {
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState<string | null>(null);
  const [totalCached, setTotalCached] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const syncCatalog = useCallback(async () => {
    if (inFlightRef.current || !enabled) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    inFlightRef.current = true;
    try {
      const remote = await posApi.getCatalogVersion();
      if (!remote?.version) return;

      const [storedVersion, storedCount, storedLastSync] = await Promise.all([
        getCatalogVersionFromStorage(),
        getCatalogCountFromStorage(),
        getLastSyncedAtFromStorage(),
      ]);

      setCatalogVersion(storedVersion);
      setTotalCached(storedCount);
      setLastSyncedAt(storedLastSync);

      if (storedVersion === remote.version && storedCount > 0) {
        return;
      }

      setIsWarmingUp(true);

      const products = await posApi.lookupProducts({
        fullCatalog: true,
        limit: 25000,
        branchId,
        locationId,
      });

      if (Array.isArray(products) && products.length > 0) {
        await saveCatalogToStorage(products, remote.version);
        setCatalogVersion(remote.version);
        setTotalCached(products.length);
        setLastSyncedAt(new Date().toISOString());
      }
    } catch {
      // Silent background failure: POS operations must never be interrupted
    } finally {
      inFlightRef.current = false;
      setIsWarmingUp(false);
    }
  }, [branchId, locationId, enabled]);

  useEffect(() => {
    let active = true;

    // Load initial stored metadata
    Promise.all([
      getCatalogVersionFromStorage(),
      getCatalogCountFromStorage(),
      getLastSyncedAtFromStorage(),
    ]).then(([version, count, lastSync]) => {
      if (active) {
        setCatalogVersion(version);
        setTotalCached(count);
        setLastSyncedAt(lastSync);
      }
    });

    // Schedule initial warmup after UI has rendered and settled
    const initialTimer = setTimeout(() => {
      if (active) {
        syncCatalog();
      }
    }, WARMUP_INITIAL_DELAY_MS);

    // Periodic heartbeat to detect catalog/price edits from other cashiers
    const intervalTimer = setInterval(() => {
      if (active && typeof document !== 'undefined' && !document.hidden) {
        syncCatalog();
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      active = false;
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [syncCatalog]);

  return {
    isWarmingUp,
    catalogVersion,
    totalCached,
    lastSyncedAt,
    refreshCatalog: syncCatalog,
  };
}
