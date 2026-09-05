import { useEffect, useState, useCallback } from 'react';
import { posApi } from '@/features/pos/api/pos.api';
import { buildPosSalePayload, buildLegacyPosSalePayload, buildMinimalPosSalePayload } from '@/features/pos/contracts';
import { getOfflineSalesQueue, updateOfflineSaleStatus, removeOfflineSale, OfflinePosSale, APP_NETWORK_STATE_EVENT } from '@/features/pos/lib/pos-offline-sync';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateSalesDomain } from '@/app/query-invalidation';

let isSyncInProgress = false;
let retryCount = 0;
const RETRY_INTERVALS = [30000, 60000, 120000, 120000, 120000];
let retryTimeout: ReturnType<typeof setTimeout> | null = null;

export function usePosOfflineSync() {
  const [offlineQueue, setOfflineQueue] = useState<OfflinePosSale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const refreshQueue = useCallback(() => {
    setOfflineQueue(getOfflineSalesQueue());
  }, []);

  useEffect(() => {
    refreshQueue();
    window.addEventListener('pos-offline-queue-updated', refreshQueue);
    return () => window.removeEventListener('pos-offline-queue-updated', refreshQueue);
  }, [refreshQueue]);

  const syncOfflineSales = useCallback(async () => {
    if (isSyncInProgress) return;
    isSyncInProgress = true;

    try {
      const queue = getOfflineSalesQueue();
      const pendingSales = queue.filter(item => item.status !== 'syncing');
      
      if (pendingSales.length === 0) return;
      
      setIsSyncing(true);
      
      for (const sale of pendingSales) {
        try {
          updateOfflineSaleStatus(sale.id, 'syncing');
          const input = sale.payload;
          const payload = buildPosSalePayload(input);
          const legacyPayload = buildLegacyPosSalePayload(input);
          const minimalPayload = buildMinimalPosSalePayload(input);
          
          try {
            await posApi.createSale(payload, legacyPayload, minimalPayload, { 'x-idempotency-key': sale.id });
            removeOfflineSale(sale.id);
          } catch (initialError: any) {
            const isStaleOrConflict =
              initialError?.status === 422 ||
              initialError?.status === 409 ||
              String(initialError?.message || '').includes('manual recovery') ||
              String(initialError?.message || '').includes('processing');

            if (isStaleOrConflict) {
              // Stale idempotency reservation in backend: retry immediately with fresh recovery key
              const recoveryKey = crypto.randomUUID();
              await posApi.createSale(payload, legacyPayload, minimalPayload, { 'x-idempotency-key': recoveryKey });
              removeOfflineSale(sale.id);
            } else {
              throw initialError;
            }
          }
        } catch (error: any) {
          const errMsg = error?.message || 'تعذر ترحيل الفاتورة إلى الخادم';
          if (error?.status === 400 || error?.status === 403 || error?.status === 422) {
            updateOfflineSaleStatus(sale.id, 'failed', errMsg);
          } else {
            updateOfflineSaleStatus(sale.id, 'pending', errMsg);
          }
        }
      }
      
      setIsSyncing(false);
      await invalidateSalesDomain(queryClient, { includeDashboard: true });

      const remainingPending = getOfflineSalesQueue().filter(item => item.status === 'pending');
      if (remainingPending.length > 0) {
        if (retryCount < 5) {
          const delay = RETRY_INTERVALS[Math.min(retryCount, RETRY_INTERVALS.length - 1)] || 120000;
          retryCount++;
          if (retryTimeout) clearTimeout(retryTimeout);
          retryTimeout = setTimeout(() => {
            syncOfflineSales();
          }, delay);
        }
      } else {
        retryCount = 0;
        if (retryTimeout) {
          clearTimeout(retryTimeout);
          retryTimeout = null;
        }
      }
    } finally {
      isSyncInProgress = false;
    }
  }, [queryClient]);

  useEffect(() => {
    const handleOnline = () => {
      void syncOfflineSales();
    };
    const handleNetworkState = (e: Event) => {
      const customEvent = e as CustomEvent<{ online?: boolean }>;
      if (customEvent.detail?.online === true) {
        void syncOfflineSales();
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener(APP_NETWORK_STATE_EVENT, handleNetworkState);
    
    // Attempt initial sync on load if queue exists
    if (getOfflineSalesQueue().length > 0) {
      void syncOfflineSales();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(APP_NETWORK_STATE_EVENT, handleNetworkState);
    };
  }, [syncOfflineSales]);

  return {
    offlineQueue,
    isSyncing,
    syncOfflineSales,
    hasPendingSales: offlineQueue.length > 0,
    hasFailedSales: offlineQueue.some(item => item.status === 'failed'),
  };
}
