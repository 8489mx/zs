import { http, ApiError } from '@/lib/http';
import { unwrapArray, unwrapByKey, unwrapEntity } from '@/lib/api/contracts';
import type { AppSettings, Branch, Customer, Location, Product, Sale } from '@/types/domain';
import type { HeldPosDraft } from '@/features/pos/hooks/usePosWorkspace';

type SaleMutationEnvelope = { ok?: boolean; sale: Sale };
type PosLookupParams = {
  q?: string;
  barcode?: string;
  locationId?: string;
  limit?: number;
};

function shouldRetrySaleWithFallback(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  if (error.status !== 400) return false;
  const message = String(error.message || '').trim();
  return !message || message === 'البيانات المرسلة غير صحيحة.' || message === 'تعذر تنفيذ العملية المطلوبة.';
}

async function postSale(payload: unknown) {
  return unwrapEntity<Sale>(await http<Sale | SaleMutationEnvelope>('/api/sales', { method: 'POST', body: JSON.stringify(payload) }), 'sale');
}

function buildPosLookupPath(params: PosLookupParams = {}) {
  const searchParams = new URLSearchParams();
  const q = String(params.q || '').trim();
  const barcode = String(params.barcode || '').trim();
  const locationId = String(params.locationId || '').trim();
  const limit = Number(params.limit || 0);

  if (q) searchParams.set('q', q);
  if (barcode) searchParams.set('barcode', barcode);
  if (locationId) searchParams.set('locationId', locationId);
  if (limit > 0) searchParams.set('limit', String(limit));

  const query = searchParams.toString();
  return `/api/catalog/pos-products${query ? `?${query}` : ''}`;
}

export const posApi = {
  lookupProducts: async (params: PosLookupParams = {}) => unwrapArray<Product>(await http<Product[] | { products: Product[] }>(buildPosLookupPath(params)), 'products'),
  customers: async () => unwrapArray<Customer>(await http<Customer[] | { customers: Customer[] }>('/api/customers'), 'customers'),
  settings: async () => unwrapByKey<AppSettings>(await http<AppSettings | { settings: AppSettings }>('/api/settings'), 'settings', {} as AppSettings),
  branches: async () => unwrapArray<Branch>(await http<Branch[] | { branches: Branch[] }>('/api/branches'), 'branches'),
  locations: async () => unwrapArray<Location>(await http<Location[] | { locations: Location[] }>('/api/locations'), 'locations'),
  authorizeDiscountOverride: async (secret: string) => http('/api/sales/discount-authorization', { method: 'POST', body: JSON.stringify({ secret }) }),
  logSecurityEvent: async (payload: {
    eventType: 'cart_remove' | 'draft_cancel';
    productId?: number;
    productName?: string;
    qty?: number;
    total?: number;
    cartItemsCount?: number;
    note?: string;
  }) => http('/api/sales/pos-audit-event', { method: 'POST', body: JSON.stringify(payload) }),
  createSale: async (payload: unknown, legacyPayload?: unknown, minimalPayload?: unknown) => {
    try {
      return await postSale(payload);
    } catch (error) {
      if (!legacyPayload || !shouldRetrySaleWithFallback(error)) throw error;
      try {
        return await postSale(legacyPayload);
      } catch (legacyError) {
        if (!minimalPayload || !shouldRetrySaleWithFallback(legacyError)) throw legacyError;
        return await postSale(minimalPayload);
      }
    }
  },
  listHeldDrafts: async () => unwrapArray<HeldPosDraft>(await http<HeldPosDraft[] | { heldSales: HeldPosDraft[] }>('/api/held-sales'), 'heldSales'),
  saveHeldDraft: async (payload: unknown) => unwrapEntity<HeldPosDraft>(await http<HeldPosDraft | { draft: HeldPosDraft }>('/api/held-sales', { method: 'POST', body: JSON.stringify(payload) }), 'draft'),
  deleteHeldDraft: async (draftId: string) => http(`/api/held-sales/${draftId}`, { method: 'DELETE' }),
  clearHeldDrafts: async () => http('/api/held-sales', { method: 'DELETE' })
};
