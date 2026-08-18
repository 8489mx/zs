import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/query-string';
import type { TradeInTransaction } from '@/types/domain-models/tradein';

export interface TradeInListParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface TradeInListPageResponse {
  transactions: TradeInTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface UpsertTradeInPayload {
  sellerName: string;
  sellerPhone: string;
  sellerNationalId: string;
  deviceBrand?: string;
  deviceModel: string;
  serialNumber: string;
  imei2?: string;
  deviceConditionState?: 'new_sealed' | 'like_new' | 'used' | 'for_parts';
  deviceConditionNotes?: string;
  agreedPurchasePrice: number;
  transactionType?: 'cash_purchase' | 'exchange_trade_in';
  createdProductId?: number;
  autoAddToInventory?: boolean;
  resalePrice?: number;
  saleId?: number;
  paymentMethod?: string;
  signatureData?: string;
  branchId?: number;
  locationId?: number;
  notes?: string;
}

export const tradeInApi = {
  list: (params: TradeInListParams = {}) =>
    http<TradeInListPageResponse>(`/api/tradein/transactions${buildQueryString(params)}`),

  get: (id: string | number) =>
    http<{ transaction: TradeInTransaction }>(`/api/tradein/transactions/${id}`),

  create: (payload: UpsertTradeInPayload) =>
    http<{ ok: boolean; id: string; docNo: string }>('/api/tradein/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  delete: (id: string | number) =>
    http<{ ok: boolean }>(`/api/tradein/transactions/${id}`, {
      method: 'DELETE',
    }),
};
