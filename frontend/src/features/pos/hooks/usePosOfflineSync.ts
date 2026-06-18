import { useEffect, useState, useCallback } from 'react';
import { posApi } from '@/features/pos/api/pos.api';
import { buildPosSalePayload, buildLegacyPosSalePayload, buildMinimalPosSalePayload } from '@/features/pos/contracts';
import { getOfflineSalesQueue, updateOfflineSaleStatus, removeOfflineSale, OfflinePosSale } from '@/features/pos/lib/pos-offline-sync';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateSalesDomain } from '@/app/query-invalidation';

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
    const queue = getOfflineSalesQueue();
    const pendingSales = queue.filter(item => item.status !== 'syncing');
    
    if (pendingSales.length === 0) return;
    if (!navigator.onLine) return;
    
    setIsSyncing(true);
    
    for (const sale of pendingSales) {
      try {
        updateOfflineSaleStatus(sale.id, 'syncing');
        const input = sale.payload;
        const payload = buildPosSalePayload(input);
        const legacyPayload = buildLegacyPosSalePayload(input);
        const minimalPayload = buildMinimalPosSalePayload(input);
        
        await posApi.createSale(payload, legacyPayload, minimalPayload);
        removeOfflineSale(sale.id);
      } catch (error: any) {
        // If it's a validation error, mark as failed permanently, otherwise keep pending
        if (error?.status === 400 || error?.status === 403) {
          updateOfflineSaleStatus(sale.id, 'failed', error.message || 'Validation failed');
        } else {
          updateOfflineSaleStatus(sale.id, 'pending', 'Network failure during sync');
        }
      }
    }
    
    setIsSyncing(false);
    await invalidateSalesDomain(queryClient, { includeDashboard: true });
  }, [queryClient]);

  useEffect(() => {
    const handleOnline = () => {
      void syncOfflineSales();
    };
    
    window.addEventListener('online', handleOnline);
    
    // Attempt initial sync on load if queue exists
    if (navigator.onLine && getOfflineSalesQueue().length > 0) {
      void syncOfflineSales();
    }
    
    return () => window.removeEventListener('online', handleOnline);
  }, [syncOfflineSales]);

  return {
    offlineQueue,
    isSyncing,
    syncOfflineSales,
    hasPendingSales: offlineQueue.length > 0,
    hasFailedSales: offlineQueue.some(item => item.status === 'failed'),
  };
}
