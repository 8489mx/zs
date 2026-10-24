import i18n from '@/lib/i18n';
import { http, ApiError } from '@/lib/http';
import { useAuthStore } from '@/stores/auth-store';

/** Persist before sending: renderer restarts and lost replies reuse the same request. */
export async function postIdempotentSubcontractorPayment<T>(payload: { subcontractorId: number }): Promise<T> {
  const auth = useAuthStore.getState();
  const tenant = auth.tenant?.id || auth.user?.tenantId;
  if (!tenant) throw new Error(i18n.t('accounting.arch02.paymentTenantRequired', 'تعذر تحديد المنشأة للدفعة.'));
  const account = auth.tenant?.accountId || auth.user?.accountId || tenant;
  const storageKey = `zs:subcontractor-payment:${tenant}:${account}:${payload.subcontractorId}`;
  const body = JSON.stringify(payload);
  const saved = localStorage.getItem(storageKey);
  let attempt: { body: string; key: string } | null = saved ? JSON.parse(saved) : null;
  if (attempt && attempt.body !== body) throw new Error(i18n.t('accounting.arch02.retryOriginalPayment', 'أعد إرسال الدفعة غير المحسومة بنفس بياناتها قبل إنشاء دفعة أخرى.'));
  if (!attempt) {
    // getRandomValues also works on offline LAN origins without randomUUID.
    const key = Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => byte.toString(16).padStart(2, '0')).join('');
    attempt = { body, key };
    localStorage.setItem(storageKey, JSON.stringify(attempt));
  }
  try {
    const result = await http<T>('/api/contracting/subcontractors/payments', {
      method: 'POST', body: JSON.stringify({ ...JSON.parse(attempt.body), requestKey: attempt.key }),
    });
    if (localStorage.getItem(storageKey) === JSON.stringify(attempt)) localStorage.removeItem(storageKey);
    return result;
  } catch (error) {
    // An explicit pre-commit validation failure is safe to correct. Timeouts and
    // server errors keep the key because the commit outcome may be unknown.
    if (error instanceof ApiError && [400, 422].includes(error.status) && localStorage.getItem(storageKey) === JSON.stringify(attempt)) localStorage.removeItem(storageKey);
    throw error;
  }
}
