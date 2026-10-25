/**
 * An ambiguous exchange response MUST retain the exact original payload/key.
 * The server owns the authoritative committed/processing/failed state.
 */
export type ExchangeOperationStatus = 'committed' | 'failed' | 'not_found' | 'processing' | 'recovery_required' | 'unknown';

export function classifyExchangeRecovery(operation: { status?: string; documentId?: string | null }): ExchangeOperationStatus {
  if (operation.status === 'committed' || operation.documentId) return 'committed';
  if (operation.status === 'failed') return 'failed';
  if (operation.status === 'not_found') return 'not_found';
  if (operation.status === 'processing') return 'processing';
  if (operation.status === 'recovery_required') return 'recovery_required';
  return 'unknown';
}

export function canResetExchangeRequest(httpStatus: number, status: ExchangeOperationStatus): boolean {
  // Do not clear a key after timeout/connection failure even if the status query
  // momentarily returns not_found; the original HTTP request may still arrive.
  return Number.isInteger(httpStatus) && httpStatus >= 400 && httpStatus < 500 &&
    (status === 'failed' || status === 'not_found');
}
