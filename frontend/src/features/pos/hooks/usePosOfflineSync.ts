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

type StaleSaleResolution = 'committed' | 'safe_to_retry' | 'needs_manual_review';

/**
 * A stale idempotency reservation means the first attempt may or may not have posted the invoice.
 * Asking the server which of the two happened is the only way to retry without risking a duplicate.
 */
async function resolveStaleOfflineSale(idempotencyKey: string): Promise<StaleSaleResolution> {
  try {
    const result = await posApi.getSaleOperationStatus(idempotencyKey);
    const status = String(result?.status || '');
    // Already posted server-side, or a document was produced: the queue entry is done.
    if (status === 'committed' || result?.documentId) return 'committed';
    // The server never recorded the attempt, or recorded it as failed: resending is safe.
    if (status === 'not_found' || status === 'failed') return 'safe_to_retry';
    return 'needs_manual_review';
  } catch {
    // If we cannot confirm, we must not guess: a duplicate invoice is worse than a delayed one.
    return 'needs_manual_review';
  }
}

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
          const offlineDocNo = (input as any).docNo || (input as any).offlineDocNo || sale.id;
          const payload = { ...buildPosSalePayload(input), offlineDocNo };
          const legacyPayload = { ...buildLegacyPosSalePayload(input), offlineDocNo };
          const minimalPayload = { ...buildMinimalPosSalePayload(input), offlineDocNo };
          
          try {
            await posApi.createSale(payload, legacyPayload, minimalPayload, { 'x-idempotency-key': sale.id });
            removeOfflineSale(sale.id);
          } catch (initialError: any) {
            // NEVER mint a fresh idempotency key for the same offline sale. sale.id IS the stable
            // idempotency key; replacing it makes the server treat the retry as a brand-new sale and
            // the invoice is posted twice (stock deducted twice, revenue and cash doubled).
            const isProcessing =
              initialError?.status === 409 || String(initialError?.message || '').includes('processing');
            const needsRecovery =
              initialError?.status === 422 || String(initialError?.message || '').includes('manual recovery');

            if (isProcessing) {
              // The original request for this key is still executing server-side. Leave it queued and
              // let the backoff timer retry later with the SAME key, which the server will answer from
              // its committed result once the first attempt finishes.
              updateOfflineSaleStatus(sale.id, 'pending', 'جارٍ ترحيل الفاتورة على الخادم — ستتم إعادة المحاولة تلقائياً');
            } else if (needsRecovery) {
              // A stale reservation means the first attempt may or may not have committed. Resubmitting
              // blindly risks a duplicate invoice, so ask the server what actually happened.
              const resolved = await resolveStaleOfflineSale(sale.id);
              if (resolved === 'committed') {
                removeOfflineSale(sale.id);
              } else if (resolved === 'safe_to_retry') {
                await posApi.createSale(payload, legacyPayload, minimalPayload, { 'x-idempotency-key': sale.id });
                removeOfflineSale(sale.id);
              } else {
                updateOfflineSaleStatus(
                  sale.id,
                  'failed',
                  'تعذر تأكيد ترحيل الفاتورة على الخادم. يلزم مراجعة يدوية قبل إعادة الإرسال لتفادي التكرار',
                );
              }
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
