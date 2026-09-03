import { http } from '@/lib/http';
import {
  StorefrontInfo,
  StorefrontCatalogResponse,
  CreateOnlineOrderPayload,
  CreateOnlineOrderResponse,
  OnlineOrderRecord,
  StorefrontSettingsPayload,
} from '../types/storefront.types';

export const storefrontApi = {
  // Public APIs (No auth needed)
  getInfo: (slug: string) => http<StorefrontInfo>(`/api/storefront/${encodeURIComponent(slug)}/info`),

  getCatalog: (slug: string) => http<StorefrontCatalogResponse>(`/api/storefront/${encodeURIComponent(slug)}/catalog`),

  createOrder: (slug: string, payload: CreateOnlineOrderPayload) =>
    http<CreateOnlineOrderResponse>(`/api/storefront/${encodeURIComponent(slug)}/orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Merchant Admin APIs (Requires Session Auth)
  listOrders: (status?: string) =>
    http<{ orders: OnlineOrderRecord[] }>(`/api/storefront/admin/orders${status ? `?status=${status}` : ''}`),

  getOrder: (id: number) => http<OnlineOrderRecord>(`/api/storefront/admin/orders/${id}`),

  updateOrderStatus: (id: number, status: string) =>
    http<{ ok: boolean; status: string }>(`/api/storefront/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  convertToSale: (id: number) =>
    http<{ ok: boolean; saleId: number; message?: string }>(`/api/storefront/admin/orders/${id}/convert-to-sale`, {
      method: 'POST',
    }),

  getSettings: () => http<StorefrontInfo>(`/api/storefront/admin/settings`),

  updateSettings: (payload: StorefrontSettingsPayload) =>
    http<StorefrontInfo>(`/api/storefront/admin/settings`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProductImage: (productId: number, imageUrl: string) =>
    http<{ success: boolean; productId: number; imageUrl: string }>(
      `/api/storefront/admin/products/${productId}/image`,
      {
        method: 'PATCH',
        body: JSON.stringify({ imageUrl }),
      }
    ),
};
