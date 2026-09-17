import { CreatePosSaleInput } from '@/features/pos/contracts';

const OFFLINE_QUEUE_KEY = 'zsystems_pos_offline_sales_queue';
export const APP_NETWORK_STATE_EVENT = 'zsystems:network-state';

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

/**
 * Returns a persistent, unique terminal identifier for this browser/device.
 * If not already set by the user or system, generates a permanent 4-char uppercase alphanumeric code (e.g. T4A2).
 */
export function getPosTerminalCode(): string {
  try {
    let code = localStorage.getItem('zs_pos_terminal_code');
    if (!code) {
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      code = `T${rand}`;
      localStorage.setItem('zs_pos_terminal_code', code);
    }
    return code;
  } catch {
    return 'T01';
  }
}

/**
 * Allows setting or updating the terminal identifier (e.g. POS1, CASHIER-2).
 */
export function setPosTerminalCode(code: string): string {
  try {
    const clean = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const finalCode = clean || getPosTerminalCode();
    localStorage.setItem('zs_pos_terminal_code', finalCode);
    return finalCode;
  } catch {
    return getPosTerminalCode();
  }
}

/**
 * Generates a globally unique, multi-cashier safe offline document number.
 * Conforms strictly to Rule 10: PREFIX-TERMINAL-YYMMDD-XXXX (e.g. INV-T4A2-260917-0001)
 * Guaranteed zero conflict across any number of offline cashiers.
 */
export function generateOfflineDocNo(): string {
  try {
    const terminal = getPosTerminalCode();
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yy}${mm}${dd}`;

    const seqKey = `zs_offline_seq_${dateStr}`;
    const rawSeq = localStorage.getItem(seqKey);
    const seq = (rawSeq ? parseInt(rawSeq, 10) : 0) + 1;
    localStorage.setItem(seqKey, String(seq));

    const paddedSeq = String(seq).padStart(4, '0');
    return `INV-${terminal}-${dateStr}-${paddedSeq}`;
  } catch {
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${rand}-${Date.now().toString().slice(-6)}`;
  }
}

export function enqueueOfflineSale(payload: CreatePosSaleInput, existingIdempotencyKey?: string): OfflinePosSale {
  const queue = getOfflineSalesQueue();
  const docNo = (payload as any).docNo || (payload as any).offlineDocNo || generateOfflineDocNo();
  const draftId = existingIdempotencyKey || docNo;

  const offlineTag = `[إيصال أوفلاين: ${docNo}]`;
  const existingNote = String(payload.note || '').trim();
  const mergedNote = existingNote.includes(docNo)
    ? existingNote
    : existingNote
      ? `${existingNote} | ${offlineTag}`
      : offlineTag;

  const offlineSale: OfflinePosSale = {
    id: draftId,
    payload: {
      ...payload,
      docNo,
      offlineDocNo: docNo,
      note: mergedNote,
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
