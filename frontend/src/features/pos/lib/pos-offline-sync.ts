import { CreatePosSaleInput } from '@/features/pos/contracts';

const OFFLINE_QUEUE_KEY = 'zsystems_pos_offline_sales_queue';

export interface OfflinePosSale {
  id: string;
  payload: CreatePosSaleInput;
  savedAt: string;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

export function getOfflineSalesQueue(): OfflinePosSale[] {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!data) return [];
    return JSON.parse(data) as OfflinePosSale[];
  } catch {
    return [];
  }
}

export function enqueueOfflineSale(payload: CreatePosSaleInput): OfflinePosSale {
  const queue = getOfflineSalesQueue();
  const draftId = (payload as any).docNo ? String((payload as any).docNo) : `offline_${Date.now()}`;
  
  const offlineSale: OfflinePosSale = {
    id: draftId,
    payload: {
      ...payload,
      docNo: (payload as any).docNo || draftId,
    } as any,
    savedAt: new Date().toISOString(),
    status: 'pending',
  };

  queue.push(offlineSale);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline queue — storage may be full:', e);
  }
  
  // Dispatch custom event to notify UI
  window.dispatchEvent(new Event('pos-offline-queue-updated'));
  
  return offlineSale;
}

export function removeOfflineSale(id: string) {
  const queue = getOfflineSalesQueue();
  const nextQueue = queue.filter(item => item.id !== id);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
  } catch (e) {
    console.error('Failed to save offline queue — storage may be full:', e);
  }
  window.dispatchEvent(new Event('pos-offline-queue-updated'));
}

export function updateOfflineSaleStatus(id: string, status: OfflinePosSale['status'], error?: string) {
  const queue = getOfflineSalesQueue();
  const nextQueue = queue.map(item => item.id === id ? { ...item, status, error } : item);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
  } catch (e) {
    console.error('Failed to save offline queue — storage may be full:', e);
  }
  window.dispatchEvent(new Event('pos-offline-queue-updated'));
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
  window.dispatchEvent(new Event('pos-offline-queue-updated'));
}
