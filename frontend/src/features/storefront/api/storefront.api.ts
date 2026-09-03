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

  getCustomerOrders: (slug: string, phone?: string, orderNumbers?: string[]) => {
    const params = new URLSearchParams();
    if (phone) params.set('phone', phone);
    if (orderNumbers && orderNumbers.length > 0) params.set('orderNumbers', orderNumbers.join(','));
    return http<{ ok: boolean; orders: OnlineOrderRecord[] }>(
      `/api/storefront/${encodeURIComponent(slug)}/orders?${params.toString()}`
    );
  },

  cancelCustomerOrder: (slug: string, orderNumber: string) =>
    http<{ ok: boolean; message: string }>(
      `/api/storefront/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderNumber)}/cancel`,
      { method: 'POST' }
    ),

  updateCustomerOrder: (slug: string, orderNumber: string, payload: CreateOnlineOrderPayload) =>
    http<{ ok: boolean; orderNumber: string; totalAmount: number; message: string }>(
      `/api/storefront/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderNumber)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    ),

  // Merchant Admin APIs (Requires Session Auth)
  listOrders: (status?: string) =>
    http<{ orders: OnlineOrderRecord[] }>(`/api/storefront/admin/orders${status ? `?status=${status}` : ''}`),

  getOrder: (id: number) => http<OnlineOrderRecord>(`/api/storefront/admin/orders/${id}`),

  updateOrderStatus: (id: number, status: string, saleId?: number) =>
    http<{ ok: boolean; status: string; saleId?: number }>(`/api/storefront/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, saleId }),
    }),

  convertToSale: (id: number, deliveryRepId?: number) =>
    http<{ ok: boolean; saleId: number; sale: any; message?: string; customerName?: string; isNewCustomer?: boolean; deliveryRepName?: string }>(
      `/api/storefront/admin/orders/${id}/convert-to-sale`,
      {
        method: 'POST',
        body: JSON.stringify({ deliveryRepId }),
      }
    ),

  preparePos: (id: number) =>
    http<{
      ok: boolean;
      orderId: number;
      orderNumber: string;
      customerId: number | null;
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      deliveryFee: number;
      totalAmount: number;
      items: Array<{
        productId: number;
        name: string;
        price: number;
        costPrice: number;
        qty: number;
        stockQty: number;
        unitName: string;
      }>;
      customerNotes?: string;
      paymentMethod?: string;
      isNewCustomer: boolean;
    }>(`/api/storefront/admin/orders/${id}/prepare-pos`, {
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

  updateCategoryImage: (categoryId: number, imageUrl: string) =>
    http<{ success: boolean; categoryId: number; imageUrl: string }>(
      `/api/storefront/admin/categories/${categoryId}/image`,
      {
        method: 'PATCH',
        body: JSON.stringify({ imageUrl }),
      }
    ),
};
