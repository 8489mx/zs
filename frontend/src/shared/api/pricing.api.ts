import { http } from '@/lib/http';

export type PricingTarget = 'retail' | 'wholesale';
export type PricingOperationType = 'percent_increase' | 'percent_decrease' | 'fixed_increase' | 'fixed_decrease' | 'set_price' | 'margin_from_cost';
export type PricingRoundingMode = 'none' | 'nearest' | 'ending';
export type PricingProfileMode = 'standard' | 'inherit' | 'manual';

export interface PricingPreviewPayload {
  paging?: {
    page?: number;
    pageSize?: number;
  };

  filters: {
    supplierId?: number;
    categoryId?: number;
    productIds?: number[];
    itemKind?: 'standard' | 'fashion';
    styleCode?: string;
    q?: string;
    activeOnly?: boolean;
    inStockOnly?: boolean;
  };
  operation: {
    type: PricingOperationType;
    value: number;
  };
  targets: PricingTarget[];
  rounding: {
    mode: PricingRoundingMode;
    nearestStep?: number;
    ending?: number;
  };
  options: {
    applyToWholeStyleCode: boolean;
    applyToPricingGroup: boolean;
    skipActiveOffers: boolean;
    skipCustomerPrices: boolean;
    skipManualExceptions: boolean;
  };
}

export interface PricingPreviewRow {
  productId: number;
  name: string;
  barcode: string;
  itemKind: 'standard' | 'fashion';
  styleCode: string;
  pricingMode: PricingProfileMode;
  pricingGroupKey: string;
  stockQty: number;
  costPrice: number;
  retailPriceBefore: number;
  retailPriceAfter: number;
  wholesalePriceBefore: number;
  wholesalePriceAfter: number;
  hasActiveOffer: boolean;
  hasCustomerPrice: boolean;
  skipped: boolean;
  skipReasons: string[];
  changed: boolean;
  belowCostAfter: boolean;
}

export interface PricingPreviewResponse {
  rows: PricingPreviewRow[];
  paging: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  summary: {
    matchedCount: number;
    affectedCount: number;
    skippedOfferCount: number;
    skippedCustomerPriceCount: number;
    skippedManualExceptionCount: number;
    inheritedProfileCount: number;
    belowCostCount: number;
    inventoryValueBefore: number;
    inventoryValueAfter: number;
    stockMarginBefore: number;
    stockMarginAfter: number;
  };
}

export interface PricingRun {
  id: number;
  createdAt: string;
  createdBy: string;
  status: string;
  affectedCount: number;
  filters: Record<string, unknown> | null;
  operation: Record<string, unknown> | null;
  options: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
  undoneAt?: string | null;
  canUndo: boolean;
}

export interface BulkSetPricingProfilePayload {
  productIds: number[];
  profile: {
    pricingMode: PricingProfileMode;
    pricingGroupKey?: string;
    preserveExistingGroupKey?: boolean;
  };
}

export interface PricingRule {
  id: number;
  name: string;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  filters: PricingPreviewPayload['filters'];
  operation: PricingPreviewPayload['operation'];
  targets: PricingTarget[];
  rounding: PricingPreviewPayload['rounding'];
  options: PricingPreviewPayload['options'];
  payload: PricingPreviewPayload;
}

export interface PricingRuleUpsertPayload {
  id?: number;
  name: string;
  filters?: PricingPreviewPayload['filters'];
  operation: PricingPreviewPayload['operation'];
  targets: PricingTarget[];
  rounding: PricingPreviewPayload['rounding'];
  options: PricingPreviewPayload['options'];
  notes?: string;
  isActive?: boolean;
}

export interface PricingRuleMatchPayload {
  supplierId?: number;
  categoryId?: number;
  itemKind?: 'standard' | 'fashion';
  styleCode?: string;
}

export const pricingCenterApi = {
  preview: (payload: PricingPreviewPayload) => http<PricingPreviewResponse>('/api/pricing/preview', { method: 'POST', body: JSON.stringify(payload) }),
  apply: (payload: PricingPreviewPayload) => http<{ ok: boolean; runId: number; preview: PricingPreviewResponse }>('/api/pricing/apply', { method: 'POST', body: JSON.stringify(payload) }),
  runs: () => http<{ runs: PricingRun[] }>('/api/pricing/runs'),
  undo: (runId: number) => http<{ ok: boolean; runId: number }>(`/api/pricing/runs/${runId}/undo`, { method: 'POST' }),
  bulkSetProfiles: (payload: BulkSetPricingProfilePayload) => http<{ ok: boolean; updatedCount: number; pricingMode: PricingProfileMode }>('/api/pricing/profiles/bulk-set', { method: 'POST', body: JSON.stringify(payload) }),
  rules: (params?: { supplierId?: number; categoryId?: number; itemKind?: 'standard' | 'fashion'; styleCode?: string; activeOnly?: boolean }) => {
    const search = new URLSearchParams();
    if (params?.supplierId) search.set('supplierId', String(params.supplierId));
    if (params?.categoryId) search.set('categoryId', String(params.categoryId));
    if (params?.itemKind) search.set('itemKind', params.itemKind);
    if (params?.styleCode) search.set('styleCode', params.styleCode);
    if (typeof params?.activeOnly === 'boolean') search.set('activeOnly', params.activeOnly ? '1' : '0');
    return http<{ rules: PricingRule[] }>(`/api/pricing/rules${search.toString() ? `?${search.toString()}` : ''}`);
  },
  saveRule: (payload: PricingRuleUpsertPayload) => http<{ ok: boolean; rule: PricingRule }>('/api/pricing/rules', { method: 'POST', body: JSON.stringify(payload) }),
  matchRule: (payload: PricingRuleMatchPayload) => http<{ rule: PricingRule | null }>('/api/pricing/rules/match', { method: 'POST', body: JSON.stringify(payload) }),
};
