/**
 * Van Sales Offline-First Storage & Synchronization Engine
 * Enables driver to sell and issue invoices in areas with zero cellular reception,
 * queuing records locally and synchronizing them seamlessly when online.
 */

export interface QueuedOfflineSale {
  localId: string;
  tripId: number;
  customerId: number;
  customerName: string;
  payload: any;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export class VanOfflineSyncUtil {
  private static readonly QUEUE_KEY = 'zs_van_offline_sales_queue';
  private static readonly STOCK_KEY = 'zs_van_cached_stock';
  private static readonly CUSTOMERS_KEY = 'zs_van_cached_customers';

  /**
   * Checks if browser is currently online
   */
  static isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Caches current van products and quantities for offline browsing
   */
  static cacheVanStock(items: any[]) {
    try {
      localStorage.setItem(this.STOCK_KEY, JSON.stringify({ items, cachedAt: new Date().toISOString() }));
    } catch (e) {
      console.warn('Failed to cache van stock locally', e);
    }
  }

  /**
   * Retrieves cached van products when offline
   */
  static getCachedVanStock(): any[] {
    try {
      const raw = localStorage.getItem(this.STOCK_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data.items) ? data.items : [];
    } catch {
      return [];
    }
  }

  /**
   * Caches customer route list for offline selection
   */
  static cacheCustomers(customers: any[]) {
    try {
      localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify({ customers, cachedAt: new Date().toISOString() }));
    } catch (e) {
      console.warn('Failed to cache van customers locally', e);
    }
  }

  /**
   * Retrieves cached customers when offline
   */
  static getCachedCustomers(): any[] {
    try {
      const raw = localStorage.getItem(this.CUSTOMERS_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data.customers) ? data.customers : [];
    } catch {
      return [];
    }
  }

  /**
   * Enqueues an offline sale created during cellular blackout
   */
  static enqueueOfflineSale(tripId: number, customerId: number, customerName: string, salePayload: any): QueuedOfflineSale {
    const queue = this.getOfflineQueue();
    const localItem: QueuedOfflineSale = {
      localId: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tripId,
      customerId,
      customerName,
      payload: salePayload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };

    queue.push(localItem);
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to write offline sale to storage', e);
    }
    return localItem;
  }

  /**
   * Returns all pending offline sales awaiting synchronization
   */
  static getOfflineQueue(): QueuedOfflineSale[] {
    try {
      const raw = localStorage.getItem(this.QUEUE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  }

  /**
   * Removes a successfully synced sale from the queue
   */
  static dequeueSale(localId: string) {
    const queue = this.getOfflineQueue().filter((q) => q.localId !== localId);
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to update offline queue', e);
    }
  }

  /**
   * Batch synchronizes all queued offline sales with server
   */
  static async syncAllPending(
    syncFunction: (item: QueuedOfflineSale) => Promise<{ ok: boolean; saleId?: number }>,
  ): Promise<{ syncedCount: number; failedCount: number }> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

    let syncedCount = 0;
    let failedCount = 0;

    for (const item of queue) {
      try {
        const res = await syncFunction(item);
        if (res.ok) {
          this.dequeueSale(item.localId);
          syncedCount++;
        } else {
          failedCount++;
        }
      } catch (err: any) {
        item.attempts++;
        item.lastError = err?.message || 'Network sync error';
        failedCount++;
      }
    }

    return { syncedCount, failedCount };
  }
}
