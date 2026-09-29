import { vanOfflineDb, OfflineOutboxItem } from './van-sales-offline.db';
import { vanSalesApi } from '../api/van-sales.api';

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  totalPending: number;
  errors: string[];
}

let isSyncInProgress = false;

export const vanSyncEngine = {
  /**
   * Check if synchronization is currently running.
   */
  isSyncing: () => isSyncInProgress,

  /**
   * Run synchronization of all pending outbox items against the server.
   */
  syncAll: async (onProgress?: (synced: number, total: number) => void): Promise<SyncResult> => {
    if (isSyncInProgress) {
      return { syncedCount: 0, failedCount: 0, totalPending: 0, errors: ['Sync already in progress'] };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { syncedCount: 0, failedCount: 0, totalPending: 0, errors: ['Device is offline'] };
    }

    isSyncInProgress = true;
    const errors: string[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    try {
      const pendingItems = await vanOfflineDb.getPendingOutbox();
      const totalPending = pendingItems.length;

      if (totalPending === 0) {
        return { syncedCount: 0, failedCount: 0, totalPending: 0, errors: [] };
      }

      for (let i = 0; i < pendingItems.length; i++) {
        const item: OfflineOutboxItem = pendingItems[i];

        try {
          if (item.type === 'sale') {
            const res = await vanSalesApi.executeSale(item.payload);
            if (res?.ok || res?.saleId) {
              await vanOfflineDb.markSynced(item.clientTxId, res.docNo);
              syncedCount++;
            } else {
              throw new Error('Sale execution rejected by server');
            }
          } else if (item.type === 'collection') {
            const res = await vanSalesApi.recordCollection(item.payload);
            if (res?.ok || res?.receiptNo) {
              await vanOfflineDb.markSynced(item.clientTxId, res.receiptNo);
              syncedCount++;
            } else {
              throw new Error('Collection rejected by server');
            }
          } else if (item.type === 'return') {
            const res = await vanSalesApi.submitFieldReturn(item.payload);
            if (res?.ok || res?.returnDocNo) {
              await vanOfflineDb.markSynced(item.clientTxId, res.returnDocNo);
              syncedCount++;
            } else {
              throw new Error('Return rejected by server');
            }
          } else if (item.type === 'load_requisition') {
            const res = await vanSalesApi.submitLoadRequisition(item.payload);
            if (res?.ok || res?.requisitionId || res?.docNo) {
              await vanOfflineDb.markSynced(item.clientTxId, res.docNo);
              syncedCount++;
            } else {
              throw new Error('Load requisition rejected by server');
            }
          }

          if (onProgress) {
            onProgress(syncedCount, totalPending);
          }
        } catch (itemErr: any) {
          failedCount++;
          const msg = itemErr?.message || 'Sync failed for ' + item.docNo;
          errors.push(`${item.docNo}: ${msg}`);
          await vanOfflineDb.markSyncFailed(item.clientTxId, msg);
        }
      }

      // Notify window of sync completion to refresh queries
      if (typeof window !== 'undefined' && syncedCount > 0) {
        window.dispatchEvent(
          new CustomEvent('van-offline-sync-completed', {
            detail: { syncedCount, failedCount },
          }),
        );
      }

      return {
        syncedCount,
        failedCount,
        totalPending,
        errors,
      };
    } finally {
      isSyncInProgress = false;
    }
  },

  /**
   * Listen to browser online/offline events and trigger auto-sync on reconnect.
   */
  startAutoSyncListener: (onNetworkChange?: (isOnline: boolean) => void) => {
    if (typeof window === 'undefined') return () => {};

    const handleOnline = async () => {
      if (onNetworkChange) onNetworkChange(true);
      // Wait 1.5s for network to stabilize then sync
      setTimeout(async () => {
        try {
          const pendingCount = await vanOfflineDb.getPendingCount();
          if (pendingCount > 0) {
            await vanSyncEngine.syncAll();
          }
        } catch (err) {
          console.warn('[VanSyncEngine] Auto-sync attempt error:', err);
        }
      }, 1500);
    };

    const handleOffline = () => {
      if (onNetworkChange) onNetworkChange(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};
