import { http, ApiError } from './http';

export interface IdempotencyStatusResponse {
  status: 'processing' | 'committed' | 'failed' | 'recovery_required' | 'not_found';
  operationType?: string;
  documentId?: string;
  response?: any;
  retryAfterMs?: number;
}

export async function checkIdempotencyStatus(operationType: string, idempotencyKey: string): Promise<IdempotencyStatusResponse> {
  const opType = encodeURIComponent(operationType);
  return http<IdempotencyStatusResponse>(`/api/operations/${opType}/${idempotencyKey}/status`);
}

export async function withIdempotency<T>(
  apiFn: (headers: Record<string, string>) => Promise<T>,
  operationType: string,
  idempotencyKey: string,
  onPollingStateChange?: (isPolling: boolean) => void
): Promise<T> {
  const headers = { 'x-idempotency-key': idempotencyKey };

  try {
    return await apiFn(headers);
  } catch (error: any) {
    // If we have a definitive 4xx error or a validation error, we just throw
    // But if it's a 502/503/504, timeout, or network error, the outcome is unknown.
    const isUnknownOutcome =
      error instanceof TypeError || // Network error
      error.name === 'AbortError' || // Timeout
      (error instanceof ApiError && [502, 503, 504].includes(error.status));

    if (!isUnknownOutcome) {
      throw error; // Known error, just throw
    }

    if (onPollingStateChange) {
      onPollingStateChange(true);
    }

    // Start polling loop
    let attempts = 0;
    while (attempts < 10) {
      attempts++;
      try {
        const statusResponse = await checkIdempotencyStatus(operationType, idempotencyKey);

        if (statusResponse.status === 'committed') {
          if (onPollingStateChange) onPollingStateChange(false);
          return statusResponse.response as T;
        }

        if (statusResponse.status === 'failed') {
          if (onPollingStateChange) onPollingStateChange(false);
          throw new Error(statusResponse.response?.message || 'Operation failed on server');
        }

        if (statusResponse.status === 'recovery_required') {
          if (onPollingStateChange) onPollingStateChange(false);
          throw new Error('تعذر تأكيد نتيجة العملية، يرجى مراجعة سجل العمليات قبل الإعادة.');
        }

        // status === 'processing' or 'not_found'
        await new Promise(r => setTimeout(r, statusResponse.retryAfterMs || 2000));
      } catch (pollError) {
        // If polling fails, just wait and retry polling
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (onPollingStateChange) onPollingStateChange(false);
    throw new Error('تعذر تأكيد نتيجة العملية بعد المحاولات، يرجى مراجعة العمليات السابقة.');
  }
}
