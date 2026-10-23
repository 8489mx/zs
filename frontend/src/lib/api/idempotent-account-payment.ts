import { http } from '@/lib/http';
import { useAuthStore } from '@/stores/auth-store';

/**
 * A financial payment attempt is persisted across renderer and Electron restarts before sending.
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

  const auth = useAuthStore.getState();
  const tenantId = String(auth.tenant?.id || auth.user?.tenantId || '');
  const accountId = String(auth.tenant?.accountId || auth.user?.accountId || '');
  if (!tenantId || !accountId) throw new Error('تعذر تحديد المنشأة الحالية لسند الدفع');
  const keyName = `zs:payment-attempt:${tenantId}:${accountId}:${path}:${partnerId}`;
  let existing: { body: string; key: string } | null = null;
  try {
    const stored = localStorage.getItem(keyName);
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
      localStorage.setItem(keyName, JSON.stringify(attempt));
    } catch {
      throw new Error('تعذر حفظ مفتاح السند المالي قبل الإرسال؛ لم يتم إرسال العملية');
    }
  }

  const operationType = path === '/api/customer-payments' ? 'customer_payment_create' : 'supplier_payment_create';
  const statusPath = `/api/operations/${encodeURIComponent(operationType)}/${encodeURIComponent(attempt.key)}/status`;
  // After an interrupted send, first ask the server about THIS precise
  // voucher before attempting a retry. A lost 200 response is not a new payment.
  if (existing) {
    const outcome = await http<{ status: string; response?: Record<string, unknown> }>(statusPath);
    if (outcome.status === 'committed') {
      if (!outcome.response?.id) throw new Error('تم تسجيل السند لكن بيانات تأكيده ناقصة؛ راجع الحسابات');
      localStorage.removeItem(keyName);
      return { ok: true, ...outcome.response };
    }
    if (outcome.status === 'processing' || outcome.status === 'recovery_required') {
      throw new Error('حالة السند على الخادم غير محسومة؛ لا يمكن إعادة سداد نفس المبلغ قبل التأكيد');
    }
    if (outcome.status === 'failed') {
      localStorage.removeItem(keyName);
      throw new Error('فشل السند السابق على الخادم ولم يتم ترحيله؛ يمكن إصلاح البيانات وإعادة المحاولة');
    }
    if (outcome.status !== 'not_found') throw new Error('حالة سند الدفع غير معروفة؛ لا يمكن إعادة إرساله بأمان');
  }

  let response: unknown;
  try {
    response = await http(path, {
      method: 'POST',
      body,
      headers: { 'x-idempotency-key': attempt.key },
    });
  } catch (error) {
    // Release an unequivocally rejected voucher only after the server says
    // it failed, never merely because the network or browser reported an error.
    try {
      const outcome = await http<{ status: string }>(statusPath);
      if (outcome.status === 'failed') {
        const stored = localStorage.getItem(keyName);
        if (stored && (JSON.parse(stored) as { key?: string }).key === attempt.key) localStorage.removeItem(keyName);
      }
    } catch { /* Unknown commit outcome: retain stable key for recovery. */ }
    throw error;
  }
  // Clear only the same attempt: a concurrent UI action may have altered it.
  try {
    const stored = localStorage.getItem(keyName);
    if (stored) {
      const current = JSON.parse(stored) as { key?: string };
      if (current.key === attempt.key) localStorage.removeItem(keyName);
    }
  } catch {
    // An acknowledged payment is already committed. Leaving its key is safe;
    // a later retry will resolve to the same server operation.
  }
  return response;
}

/**
 * Supplier installment retry uses a stable per-installment key. The server
 * commits supplier ledger, treasury, journal and key atomically.
 */
export async function postIdempotentSupplierInstallment(
  scheduleId: string,
  supplierId: string,
  payload: unknown,
): Promise<unknown> {
  const auth = useAuthStore.getState();
  const tenantId = String(auth.tenant?.id || auth.user?.tenantId || '');
  const accountId = String(auth.tenant?.accountId || auth.user?.accountId || '');
  if (!tenantId || !accountId || !/^\d+$/.test(scheduleId) || !/^\d+$/.test(supplierId)) {
    throw new Error('بيانات المنشأة أو القسط غير صحيحة');
  }
  const path = `/api/supplier-payment-schedules/${scheduleId}/settle`;
  const keyName = `zs:payment-attempt:${tenantId}:${accountId}:${path}`;
  const body = JSON.stringify(payload);
  let recorded: { body: string; key: string } | null = null;
  try {
    const stored = localStorage.getItem(keyName);
    if (stored) recorded = JSON.parse(stored);
  } catch { throw new Error('تعذر قراءة بيانات محاولة سداد القسط السابقة'); }
  if (recorded && recorded.body !== body) {
    throw new Error('توجد محاولة سداد قسط غير محسومة؛ استخدم نفس المبلغ ووسيلة الدفع حتى تتأكد من نتيجتها');
  }
  if (!recorded) {
    if (typeof crypto?.randomUUID !== 'function') throw new Error('تعذر إصدار مفتاح آمن لسداد القسط');
    recorded = { body, key: crypto.randomUUID() };
    localStorage.setItem(keyName, JSON.stringify(recorded));
  }
  const statusPath = `/api/operations/supplier_schedule_settlement/${encodeURIComponent(recorded.key)}/status`;
  if (localStorage.getItem(keyName) && recorded) {
    const status = await http<{ status: string; documentId?: string | null }>(statusPath);
    // A document identifier alone cannot override a non-committed operation state.
    // Only the authoritative committed status proves settlement succeeded.
    if (status.status === 'committed') {
      localStorage.removeItem(keyName);
      return http(`/api/suppliers/${supplierId}/payment-schedule`);
    }
    if (!['not_found', 'failed'].includes(status.status)) {
      throw new Error('سداد القسط قيد التنفيذ أو يحتاج مصالحة؛ لا تعاود سداد المبلغ الآن');
    }
    if (status.status === 'failed') {
      localStorage.removeItem(keyName);
      throw new Error('فشل السداد السابق ولم يتم ترحيله؛ أصلح البيانات قبل محاولة جديدة');
    }
  }
  const result = await http(path, {
    method: 'POST', body, headers: { 'x-idempotency-key': recorded.key },
  });
  localStorage.removeItem(keyName);
  return result;
}
