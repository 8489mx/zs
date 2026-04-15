import type { PricingPreviewPayload, PricingProfileMode, PricingRule, PricingRuleUpsertPayload, PricingRun } from '@/shared/api/pricing.api';

export const defaultPayload: PricingPreviewPayload = {
  paging: { page: 1, pageSize: 50 },
  filters: { supplierId: undefined, categoryId: undefined, productIds: undefined, itemKind: undefined, styleCode: '', q: '', activeOnly: true, inStockOnly: false },
  operation: { type: 'percent_increase', value: 5 },
  targets: ['retail'],
  rounding: { mode: 'none', nearestStep: 0.5, ending: 95 },
  options: { applyToWholeStyleCode: true, applyToPricingGroup: true, skipActiveOffers: true, skipCustomerPrices: true, skipManualExceptions: true },
};

export const defaultRuleDraft: PricingRuleUpsertPayload = {
  name: '',
  filters: { supplierId: undefined, categoryId: undefined, itemKind: undefined, styleCode: '', activeOnly: true, inStockOnly: false },
  operation: { type: 'percent_increase', value: 5 },
  targets: ['retail'],
  rounding: { mode: 'none', nearestStep: 0.5, ending: 95 },
  options: { ...defaultPayload.options },
  notes: '',
  isActive: true,
};

export function summarizeRun(run: PricingRun) {
  const operation = (run.operation || {}) as { operation?: { type?: string; value?: number }; targets?: string[] };
  const op = operation.operation;
  const targets = Array.isArray(operation.targets) ? operation.targets.join(' + ') : '—';
  return `${op?.type || '—'} / ${op?.value ?? '—'} / ${targets}`;
}
export function summarizeRule(rule: PricingRule) {
  const scope = [rule.filters.supplierId ? `مورد #${rule.filters.supplierId}` : '', rule.filters.categoryId ? `قسم #${rule.filters.categoryId}` : '', rule.filters.itemKind === 'fashion' ? 'ملابس' : rule.filters.itemKind === 'standard' ? 'عادي' : '', rule.filters.styleCode ? `موديل ${rule.filters.styleCode}` : ''].filter(Boolean).join(' / ');
  return `${scope || 'نطاق عام'} — ${rule.operation.type} (${rule.operation.value})`;
}
export function formatPricingMode(value: PricingProfileMode) { if (value === 'inherit') return 'توريث'; if (value === 'manual') return 'استثناء يدوي'; return 'عادي'; }
export function formatSkipReason(reason: string) { if (reason === 'offer') return 'عرض'; if (reason === 'customer_price') return 'سعر خاص'; if (reason === 'manual_exception') return 'استثناء يدوي'; return reason; }
export function parseNumberListParam(value: string | null): number[] | undefined { if (!value) return undefined; const ids = Array.from(new Set(value.split(',').map((entry) => Number(entry.trim())).filter((entry) => entry > 0))); return ids.length ? ids : undefined; }
export function parseBooleanParam(value: string | null, fallback: boolean): boolean { if (value == null || value === '') return fallback; return value === '1' || value.toLowerCase() === 'true'; }
export function buildPayloadFromSearchParams(searchParams: URLSearchParams): PricingPreviewPayload {
  const queryTargets = (searchParams.get('targets') || '').split(',').filter((entry): entry is 'retail' | 'wholesale' => entry === 'retail' || entry === 'wholesale');
  return {
    ...defaultPayload,
    paging: { ...defaultPayload.paging, page: searchParams.get('page') ? Number(searchParams.get('page')) : defaultPayload.paging?.page, pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : defaultPayload.paging?.pageSize },
    filters: {
      ...defaultPayload.filters,
      supplierId: searchParams.get('supplierId') ? Number(searchParams.get('supplierId')) : defaultPayload.filters.supplierId,
      categoryId: searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : defaultPayload.filters.categoryId,
      productIds: parseNumberListParam(searchParams.get('productIds')),
      itemKind: searchParams.get('itemKind') === 'fashion' || searchParams.get('itemKind') === 'standard' ? searchParams.get('itemKind') as 'standard' | 'fashion' : defaultPayload.filters.itemKind,
      styleCode: searchParams.get('styleCode') ?? defaultPayload.filters.styleCode,
      q: searchParams.get('q') ?? defaultPayload.filters.q,
      activeOnly: parseBooleanParam(searchParams.get('activeOnly'), Boolean(defaultPayload.filters.activeOnly)),
      inStockOnly: parseBooleanParam(searchParams.get('inStockOnly'), Boolean(defaultPayload.filters.inStockOnly)),
    },
    operation: { ...defaultPayload.operation, type: (searchParams.get('operationType') as PricingPreviewPayload['operation']['type'] | null) || defaultPayload.operation.type, value: searchParams.get('operationValue') ? Number(searchParams.get('operationValue')) : defaultPayload.operation.value },
    targets: queryTargets.length ? queryTargets : defaultPayload.targets,
    rounding: { ...defaultPayload.rounding, mode: (searchParams.get('roundingMode') as PricingPreviewPayload['rounding']['mode'] | null) || defaultPayload.rounding.mode, nearestStep: searchParams.get('nearestStep') ? Number(searchParams.get('nearestStep')) : defaultPayload.rounding.nearestStep, ending: searchParams.get('ending') ? Number(searchParams.get('ending')) : defaultPayload.rounding.ending },
    options: { ...defaultPayload.options, applyToWholeStyleCode: parseBooleanParam(searchParams.get('applyToWholeStyleCode'), defaultPayload.options.applyToWholeStyleCode), applyToPricingGroup: parseBooleanParam(searchParams.get('applyToPricingGroup'), defaultPayload.options.applyToPricingGroup), skipActiveOffers: parseBooleanParam(searchParams.get('skipActiveOffers'), defaultPayload.options.skipActiveOffers), skipCustomerPrices: parseBooleanParam(searchParams.get('skipCustomerPrices'), defaultPayload.options.skipCustomerPrices), skipManualExceptions: parseBooleanParam(searchParams.get('skipManualExceptions'), defaultPayload.options.skipManualExceptions) },
  };
}
export function buildRuleDraftFromPayload(payload: PricingPreviewPayload, current?: Partial<PricingRuleUpsertPayload>): PricingRuleUpsertPayload { return { id: current?.id, name: current?.name || '', filters: { supplierId: payload.filters.supplierId, categoryId: payload.filters.categoryId, itemKind: payload.filters.itemKind, styleCode: payload.filters.styleCode || '', activeOnly: payload.filters.activeOnly, inStockOnly: payload.filters.inStockOnly }, operation: { ...payload.operation }, targets: [...payload.targets], rounding: { ...payload.rounding }, options: { ...payload.options }, notes: current?.notes || '', isActive: current?.isActive ?? true }; }
export function mergeRulePayloadIntoCurrent(rule: PricingRule, current: PricingPreviewPayload): PricingPreviewPayload { return { ...rule.payload, paging: { ...current.paging }, filters: { ...rule.payload.filters, productIds: current.filters.productIds, supplierId: rule.payload.filters.supplierId || current.filters.supplierId, activeOnly: current.filters.activeOnly, inStockOnly: current.filters.inStockOnly } }; }
