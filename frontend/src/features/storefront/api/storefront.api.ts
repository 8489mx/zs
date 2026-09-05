import { http } from '@/lib/http';
import {
  StorefrontInfo,
  StorefrontCatalogResponse,
  CreateOnlineOrderPayload,
  CreateOnlineOrderResponse,
  OnlineOrderRecord,
  StorefrontSettingsPayload,
  StorefrontReview,
  StorefrontCoupon,
  CreateCouponPayload,
  UpdateCouponPayload,
  ValidateCouponResponse,
  StorefrontDeliveryZone,
  CreateDeliveryZonePayload,
  UpdateDeliveryZonePayload,
  StorefrontPaymentSessionResponse,
  StorefrontPaymentStatusResponse,
} from '../types/storefront.types';

export const storefrontApi = {
  // Public APIs (No auth needed)
  getInfo: (slug: string) => http<StorefrontInfo>(`/api/storefront/${encodeURIComponent(slug)}/info`),

  createPaymentSession: (slug: string, orderNumber: string) =>
    http<StorefrontPaymentSessionResponse>(
      `/api/storefront/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderNumber)}/payment-session`,
      { method: 'POST' }
    ),

  getPaymentStatus: (slug: string, orderNumber: string) =>
    http<StorefrontPaymentStatusResponse>(
      `/api/storefront/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderNumber)}/payment-status`
    ),

  mockPayOrder: (
    slug: string,
    orderNumber: string,
    payload?: { cardNumber?: string; cardHolder?: string }
  ) =>
    http<{ ok: boolean; orderNumber: string; paymentStatus: string; transactionId: string; message: string }>(
      `/api/storefront/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderNumber)}/mock-pay`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }
    ),

  getCatalog: async (slug: string) => {
    const res = await http<StorefrontCatalogResponse>(`/api/storefront/${encodeURIComponent(slug)}/catalog`);
    if (res?.categories) {
      res.categories = res.categories.map((c) => ({
        ...c,
        id: Number(c.id),
      }));
    }
    if (res?.products) {
      res.products = res.products.map((p) => ({
        ...p,
        id: Number(p.id),
        categoryId: p.categoryId ? Number(p.categoryId) : null,
      }));
    }
    return res;
  },

  createOrder: (slug: string, payload: CreateOnlineOrderPayload) =>
    http<CreateOnlineOrderResponse>(`/api/storefront/${encodeURIComponent(slug)}/orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  validateCoupon: (slug: string, code: string, subtotal: number) =>
    http<ValidateCouponResponse>(`/api/storefront/${encodeURIComponent(slug)}/coupons/validate`, {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
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

  submitReview: (
    slug: string,
    productId: number,
    payload: { rating: number; customerName?: string; customerPhone?: string; comment?: string }
  ) =>
    http<{ ok: boolean; avgRating: number; reviewCount: number; message: string }>(
      `/api/storefront/${encodeURIComponent(slug)}/products/${productId}/reviews`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getProductReviews: (slug: string, productId: number) =>
    http<{ ok: boolean; productId: number; reviews: StorefrontReview[] }>(
      `/api/storefront/${encodeURIComponent(slug)}/products/${productId}/reviews`
    ),

  // Merchant Admin APIs (Requires Session Auth)
  listOrders: (status?: string) =>
    http<{ orders: OnlineOrderRecord[]; counts?: Record<string, number> }>(`/api/storefront/admin/orders${status ? `?status=${status}` : ''}`),

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

  listCoupons: () => http<{ ok: boolean; coupons: StorefrontCoupon[] }>('/api/storefront/admin/coupons'),

  createCoupon: (payload: CreateCouponPayload) =>
    http<{ ok: boolean; coupon: StorefrontCoupon }>('/api/storefront/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCoupon: (id: number, payload: UpdateCouponPayload) =>
    http<{ ok: boolean; coupon: StorefrontCoupon }>(`/api/storefront/admin/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteCoupon: (id: number) =>
    http<{ ok: boolean; message: string }>(`/api/storefront/admin/coupons/${id}`, {
      method: 'DELETE',
    }),

  listDeliveryZones: () => http<{ ok: boolean; zones: StorefrontDeliveryZone[] }>('/api/storefront/admin/delivery-zones'),

  createDeliveryZone: (payload: CreateDeliveryZonePayload) =>
    http<{ ok: boolean; zone: StorefrontDeliveryZone }>('/api/storefront/admin/delivery-zones', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDeliveryZone: (id: number, payload: UpdateDeliveryZonePayload) =>
    http<{ ok: boolean; id: number }>(`/api/storefront/admin/delivery-zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteDeliveryZone: (id: number) =>
    http<{ ok: boolean; id: number }>(`/api/storefront/admin/delivery-zones/${id}`, {
      method: 'DELETE',
    }),
};
