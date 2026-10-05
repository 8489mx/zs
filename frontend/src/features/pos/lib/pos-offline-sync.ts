import { CreatePosSaleInput } from '@/features/pos/contracts';
import { useAuthStore } from '@/stores/auth-store';

const OFFLINE_QUEUE_KEY = 'zsystems_pos_offline_sales_queue';
export const APP_NETWORK_STATE_EVENT = 'zsystems:network-state';

export interface OfflinePosSale {
  id: string;
  payload: CreatePosSaleInput;
  savedAt: string;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
  tenantId?: string;
  accountId?: string;
}

function currentQueueScope() {
  const auth = useAuthStore.getState();
  return {
    tenantId: String(auth.tenant?.id || auth.user?.tenantId || ''),
    accountId: String(auth.tenant?.accountId || auth.user?.accountId || ''),
  };
}

function isCurrentTenantSale(item: OfflinePosSale): boolean {
  const scope = currentQueueScope();
  // Legacy entries without tenant ownership cannot be safely replayed into a SaaS tenant.
  if (!scope.tenantId || !scope.accountId) return false;
  return item.tenantId === scope.tenantId && item.accountId === scope.accountId;
}

function readStoredOfflineQueue(): OfflinePosSale[] {
  const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!data) return [];
  const rows: unknown = JSON.parse(data);
  if (!Array.isArray(rows)) throw new Error('Invalid offline sales queue');
  return rows as OfflinePosSale[];
}

export function getOfflineSalesQueue(): OfflinePosSale[] {
  try {
    return readStoredOfflineQueue().filter(isCurrentTenantSale);
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
  let queue: OfflinePosSale[];
  try {
    queue = readStoredOfflineQueue();
  } catch (error) {
    console.error('Failed to read offline sales queue:', error);
    throw new Error('تعذر قراءة الفواتير المحفوظة على هذا الجهاز. تحقق من الفواتير قبل إعادة المحاولة.');
  }
  const docNo = (payload as any).docNo || (payload as any).offlineDocNo || generateOfflineDocNo();
  const draftId = existingIdempotencyKey || docNo;
  const scope = currentQueueScope();
  if (!scope.tenantId || !scope.accountId) {
    throw new Error('تعذر تحديد المنشأة والحساب لهذه الفاتورة الأوفلاين. سجل الدخول ثم أعد المحاولة.');
  }
  const existing = queue.find((item) => item.id === draftId && item.tenantId === scope.tenantId && item.accountId === scope.accountId);
  if (existing) return existing;

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
    ...scope,
  };

  queue.push(offlineSale);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline queue — storage may be full:', e);
    // The cashier must never see a successful offline sale unless its payload is durable.
    // Keep the cart intact so the sale can be retried after storage is available.
    throw new Error('تعذر حفظ الفاتورة على هذا الجهاز. تحقق من مساحة التخزين وحالة الفاتورة قبل إعادة المحاولة.');
  }

  // Dispatch custom event to notify UI
  window.dispatchEvent(new Event('pos-offline-queue-updated'));

  return offlineSale;
}

export function removeOfflineSale(id: string) {
  try {
    const nextQueue = readStoredOfflineQueue().filter(item => item.id !== id || !isCurrentTenantSale(item));
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
  } catch (e) {
    console.error('Failed to save offline queue — storage may be full:', e);
  }
  window.dispatchEvent(new Event('pos-offline-queue-updated'));
}

export function updateOfflineSaleStatus(id: string, status: OfflinePosSale['status'], error?: string) {
  try {
    const nextQueue = readStoredOfflineQueue().map(item => item.id === id && isCurrentTenantSale(item) ? { ...item, status, error } : item);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
  } catch (e) {
    console.error('Failed to save offline queue — storage may be full:', e);
  }
  window.dispatchEvent(new Event('pos-offline-queue-updated'));
}

export function clearOfflineQueue() {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(readStoredOfflineQueue().filter((item) => !isCurrentTenantSale(item))));
  } catch (error) {
    console.error('Failed to clear offline queue:', error);
    throw new Error('تعذر حذف الفواتير المحفوظة على هذا الجهاز. راجع التخزين قبل إعادة المحاولة.');
  }
  window.dispatchEvent(new Event('pos-offline-queue-updated'));
}
