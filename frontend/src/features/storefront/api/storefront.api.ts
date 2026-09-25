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
  AbandonedCartRecord,
  StorefrontAnalytics,
} from '../types/storefront.types';
import type { CustomerOrderRef } from '../lib/customer-order-refs';
import { resolveStorefrontMediaList, resolveStorefrontMediaUrl, withResolvedProductMedia } from '../lib/storefront-media-url';

/** Banner / logo fields of /info and /admin/settings → loadable URLs (SF-9). */
function withResolvedInfoMedia<T extends StorefrontInfo>(info: T): T {
  if (!info) return info;
  return {
    ...info,
    bannerUrl: resolveStorefrontMediaUrl(info.bannerUrl),
    bannerUrls: info.bannerUrls ? resolveStorefrontMediaList(info.bannerUrls) : info.bannerUrls,
    logoUrl: resolveStorefrontMediaUrl(info.logoUrl),
    logo_url: resolveStorefrontMediaUrl(info.logo_url),
  };
}

function orderTokenHeaders(token: string): Record<string, string> {
  return { 'x-order-token': token };
}

export const storefrontApi = {
  // Public APIs (No auth needed)
  getInfo: async (slug: string) =>
    withResolvedInfoMedia(await http<StorefrontInfo>(`/api/storefront/${encodeURIComponent(slug)}/info`)),

  // Order-scoped public routes carry the order's access token (invariant SF-1).
  createPaymentSession: (slug: string, orderNumber: string, token: string) =>
    http<StorefrontPaymentSessionResponse>(
      `/api/storefront/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderNumber)}/payment-session`,
      { method: 'POST', headers: orderTokenHeaders(token) }
    ),

  getPaymentStatus: (slug: string, orderNumber: string, token: string) =>
    http<StorefrontPaymentStatusResponse>(
      `/api/storefront/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderNumber)}/payment-status`,
      { headers: orderTokenHeaders(token) }
    ),

  mockPayOrder: (
    slug: string,
    orderNumber: string,
    token: string,
    payload?: { cardNumber?: string; cardHolder?: string }
  ) =>
    http<{ ok: boolean; orderNumber: string; paymentStatus: string; transactionId: string; message: string }>(
      `/api/storefront/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderNumber)}/mock-pay`,
      {
        method: 'POST',
        headers: orderTokenHeaders(token),
        body: JSON.stringify(payload || {}),
      }
    ),

  getCatalog: async (slug: string) => {
    const res = await http<StorefrontCatalogResponse>(`/api/storefront/${encodeURIComponent(slug)}/catalog`);
    if (res?.categories) {
      res.categories = res.categories.map((c) => ({
        ...c,
        id: Number(c.id),
        imageUrl: resolveStorefrontMediaUrl(c.imageUrl),
      }));
    }
    if (res?.products) {
      res.products = res.products.map((p) => withResolvedProductMedia({
        ...p,
        id: Number(p.id),
        categoryId: p.categoryId ? Number(p.categoryId) : null,
      }));
    }
    return res;
  },

  getSearchSuggestions: async (slug: string, q: string) => {
    const res = await http<{
      categories: Array<{ id: number; name: string; imageUrl?: string }>;
      products: Array<{ id: number; name: string; price: number; imageUrl?: string; categoryName?: string; inStock: boolean }>;
    }>(`/api/storefront/${encodeURIComponent(slug)}/search/suggest?q=${encodeURIComponent(q)}`);
    return {
      categories: (res?.categories || []).map((c) => ({ ...c, imageUrl: resolveStorefrontMediaUrl(c.imageUrl) })),
      products: (res?.products || []).map((p) => withResolvedProductMedia(p)),
    };
  },

  getProductDetails: async (slug: string, productId: number) => {
    const res = await http<{
      product: any;
      related: any[];
      crossSell: any[];
    }>(`/api/storefront/${encodeURIComponent(slug)}/products/${productId}`);
    return {
      product: withResolvedProductMedia(res?.product),
      related: (res?.related || []).map((p) => withResolvedProductMedia(p)),
      crossSell: (res?.crossSell || []).map((p) => withResolvedProductMedia(p)),
    };
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

  lookupCustomerOrders: (slug: string, orders: CustomerOrderRef[]) =>
    http<{ ok: boolean; orders: OnlineOrderRecord[] }>(`/api/storefront/${encodeURIComponent(slug)}/orders/lookup`, {
      method: 'POST',
      body: JSON.stringify({ orders }),
    }),

  cancelCustomerOrder: (slug: string, orderNumber: string, token: string) =>
    http<{ ok: boolean; message: string }>(
      `/api/storefront/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderNumber)}/cancel`,
      { method: 'POST', headers: orderTokenHeaders(token) }
    ),

  updateCustomerOrder: (slug: string, orderNumber: string, token: string, payload: CreateOnlineOrderPayload) =>
    http<{ ok: boolean; orderNumber: string; totalAmount: number; message: string }>(
      `/api/storefront/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderNumber)}`,
      {
        method: 'PUT',
        headers: orderTokenHeaders(token),
        body: JSON.stringify(payload),
      }
    ),

  recordAbandonedCart: (
    slug: string,
    payload: { customerPhone: string; customerName?: string; countryCode?: string; items: any[]; subtotal: number }
  ) =>
    http<{ ok: boolean; cartId?: number }>(`/api/storefront/${encodeURIComponent(slug)}/abandoned-cart`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

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
  listOrders: (status?: string, limit?: number, page?: number) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (limit) params.append('limit', String(limit));
    if (page) params.append('page', String(page));
    const qs = params.toString();
    return http<{ orders: OnlineOrderRecord[]; counts?: Record<string, number> }>(`/api/storefront/admin/orders${qs ? `?${qs}` : ''}`);
  },

  getOrderCounts: () =>
    http<{ counts: Record<string, number> }>('/api/storefront/admin/orders/counts'),

  bulkCancelOrders: (adminPassword: string, status = 'pending') =>
    http<{ ok: boolean; cancelledCount: number; message: string }>('/api/storefront/admin/orders/bulk-cancel', {
      method: 'POST',
      body: JSON.stringify({ adminPassword, status }),
    }),

  getOrder: (id: number) => http<OnlineOrderRecord>(`/api/storefront/admin/orders/${id}`),

  updateOrderStatus: (id: number, status: string, saleId?: number) =>
    http<{ ok: boolean; status: string; saleId?: number }>(`/api/storefront/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, saleId }),
    }),

  /** Merchant confirms an InstaPay / wallet transfer actually arrived (SF-3). */
  confirmOrderPayment: (id: number, reference?: string) =>
    http<{ ok: boolean; paymentStatus: string }>(`/api/storefront/admin/orders/${id}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify({ reference }),
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
      discountAmount?: number;
      couponCode?: string | null;
      orderType?: 'dine_in' | 'delivery';
      tableNumber?: string;
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

  getSettings: async () => withResolvedInfoMedia(await http<StorefrontInfo>(`/api/storefront/admin/settings`)),

  updateSettings: async (payload: StorefrontSettingsPayload) =>
    withResolvedInfoMedia(await http<StorefrontInfo>(`/api/storefront/admin/settings`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })),

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

  listAbandonedCarts: () =>
    http<{ ok: boolean; carts: AbandonedCartRecord[] }>('/api/storefront/admin/abandoned-carts'),

  deleteAbandonedCart: (id: number) =>
    http<{ ok: boolean }>(`/api/storefront/admin/abandoned-carts/${id}`, {
      method: 'DELETE',
    }),

  getAnalytics: () =>
    http<{ ok: boolean } & StorefrontAnalytics>('/api/storefront/admin/analytics'),
};
