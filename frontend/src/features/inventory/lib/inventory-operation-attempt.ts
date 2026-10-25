export interface InventoryOperationAttempt<T> { key: string; operationType: string; fingerprint: string; payload: T; }
export function acquireInventoryAttempt<T>(previous: InventoryOperationAttempt<T> | null, payload: T, operationType: string, makeKey: () => string): InventoryOperationAttempt<T> {
  const fingerprint = JSON.stringify(payload);
  if (previous) {
    if (previous.fingerprint !== fingerprint || previous.operationType !== operationType) {
      throw new Error('نتيجة عملية المخزون السابقة غير مؤكدة. أعد نفس الطلب أولاً قبل تعديل البيانات');
    }
    return previous;
  }
  return { key: makeKey(), operationType, fingerprint, payload };
}
export function mayReleaseInventoryAttempt(httpStatus: number, status?: string): boolean {
  return status === 'failed' || (status === 'not_found' && httpStatus >= 400 && httpStatus < 500);
}

/** Unique per business document and action, while the batch remains unresolved. */
export function inventoryTransferActionAttemptKey(action: 'receive' | 'cancel', transferId: string): string {
  return `${action}:${transferId}`;
}
