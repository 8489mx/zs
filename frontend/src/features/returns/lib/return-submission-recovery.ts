/** A response loss is not proof a return/refund was rolled back. */
export function wasReturnCommitted(status: string, documentId?: string | null): boolean {
  return status === 'committed' || Boolean(documentId);
}
export function mayReleaseReturnIdempotencyKey(httpStatus: number, status: string): boolean {
  if (status === 'failed') return true;
  return Number.isInteger(httpStatus) && httpStatus >= 400 && httpStatus < 500 && status === 'not_found';
}
