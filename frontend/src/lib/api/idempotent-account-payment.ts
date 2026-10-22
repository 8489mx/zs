import { http } from '@/lib/http';

/**
 * A financial payment attempt is durable before sending the HTTP request.
 * Retrying after a timeout, reload, or lost response must reuse the same key.
 * A successful server acknowledgement is the ONLY time the key is retired.
 */
export async function postIdempotentAccountPayment(path: '/api/customer-payments' | '/api/supplier-payments', payload: unknown): Promise<unknown> {
  const body = JSON.stringify(payload);
  const request = payload as { customerId?: number; supplierId?: number } | null;
  const partnerId = Number(request?.customerId || request?.supplierId || 0);
  if (!Number.isSafeInteger(partnerId) || partnerId <= 0) {
    throw new Error('Payment requires a valid partner');
  }

  const keyName = `zs:payment-attempt:${path}:${partnerId}`;
  let existing: { body: string; key: string } | null = null;
  try {
    const stored = sessionStorage.getItem(keyName);
    if (stored) existing = JSON.parse(stored) as { body: string; key: string };
  } catch {
    throw new Error('تعذر قراءة حالة سند الدفع السابق؛ لا تعاود الإرسال قبل مراجعة التخزين');
  }

  // Preserve the old uncertain attempt instead of silently replacing its
  // reference when the cashier changes the form after a network failure.
  if (existing && existing.body !== body) {
    throw new Error('يوجد سند سابق لم يتم تأكيد نتيجته. أعد إرسال نفس بيانات السند أو راجعه قبل إنشاء سند مختلف لنفس الشريك.');
  }

  let attempt = existing;
  if (!attempt) {
    const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : null;
    if (!uuid) throw new Error('تعذر إنشاء مفتاح آمن للسند المالي');
    attempt = { body, key: uuid };
    try {
      sessionStorage.setItem(keyName, JSON.stringify(attempt));
    } catch {
      throw new Error('تعذر حفظ مفتاح السند المالي قبل الإرسال؛ لم يتم إرسال العملية');
    }
  }

  const response = await http(path, {
    method: 'POST',
    body,
    headers: { 'x-idempotency-key': attempt.key },
  });
  // Clear only the same attempt: a concurrent UI action may have altered it.
  try {
    const stored = sessionStorage.getItem(keyName);
    if (stored) {
      const current = JSON.parse(stored) as { key?: string };
      if (current.key === attempt.key) sessionStorage.removeItem(keyName);
    }
  } catch {
    // An acknowledged payment is already committed. Leaving its key is safe;
    // a later retry will resolve to the same server operation.
  }
  return response;
}
