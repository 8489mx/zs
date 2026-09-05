export interface StorefrontInfo {
  tenantId: string;
  slug: string;
  businessName: string;
  enabled: boolean;
  title: string;
  address?: string;
  bio: string;
  announcement: string;
  bannerUrl: string;
  bannerUrls?: string[];
  bannerFit?: 'contain' | 'cover';
  bannerPosition?: string;
  bannerPositions?: string[];
  bannerIntervalSeconds?: number;
  smartDealsEnabled?: boolean;
  freeShippingEnabled?: boolean;
  freeShippingMinOrder?: number;
  deliveryFee: number;
  deliveryZones?: StorefrontDeliveryZone[];
  minOrder: number;
  whatsappPhone: string;
  currency: string;
  onlinePaymentEnabled?: boolean;
  onlinePaymentTestMode?: boolean;
  onlinePaymentProvider?: string;
  paymobApiKey?: string;
  paymobIntegrationId?: string;
  paymobIframeId?: string;
  paymobHmacSecret?: string;
  paymobTestMode?: boolean;
  xpayApiKey?: string;
  xpayCommunityId?: string;
  xpayTestMode?: boolean;
  tapSecretKey?: string;
  tapPublishableKey?: string;
  tapTestMode?: boolean;
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  stripeWebhookSecret?: string;
  stripeTestMode?: boolean;
  logo_url?: string;
  logoUrl?: string;
}

export interface StorefrontCategory {
  id: number;
  name: string;
  imageUrl?: string;
}

export interface StorefrontProduct {
  id: number;
  name: string;
  barcode: string;
  price: number;
  categoryId: number | null;
  categoryName: string;
  stockQty: number;
  inStock: boolean;
  icon: string;
  imageUrl: string;
  description: string;
  rating?: number;
  reviewCount?: number;
}

export interface StorefrontReview {
  id: number;
  rating: number;
  customerName: string;
  comment?: string;
  createdAt: string;
}

export interface StorefrontCatalogResponse {
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
}

export interface CartItem {
  product: StorefrontProduct;
  quantity: number;
}

export interface CreateOnlineOrderPayload {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerNotes?: string;
  items: Array<{
    productId: number | string;
    quantity: number;
    notes?: string;
  }>;
  paymentMethod?: string;
  couponCode?: string;
  deliveryZoneId?: number;
  deliveryZoneName?: string;
}

export interface CreateOnlineOrderResponse {
  ok: boolean;
  orderId: number;
  orderNumber: string;
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  deliveryZoneId?: number | null;
  deliveryZoneName?: string | null;
  discountAmount?: number;
  couponCode?: string | null;
  items: Array<{
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  whatsappUrl: string | null;
}

export interface OnlineOrderRecord {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  customerNotes: string | null;
  deliveryZoneId?: number | null;
  deliveryZoneName?: string | null;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  discountAmount?: number;
  couponCode?: string | null;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  gatewayProvider?: string | null;
  gatewayTransactionId?: string | null;
  paidAt?: string | null;
  saleId: number | null;
  deliveryRepName?: string | null;
  deliveryRepPhone?: string | null;
  shippingCarrier?: 'internal' | 'bosta' | string | null;
  bostaDeliveryId?: string | null;
  bostaTrackingNumber?: string | null;
  bostaStatus?: string | null;
  bostaAwbUrl?: string | null;
  bostaCreatedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  items: Array<{
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    notes?: string;
  }>;
}

export interface BostaSettings {
  enabled: boolean;
  environment: 'sandbox' | 'production';
  apiKey: string;
  pickupBusinessName?: string;
  pickupPhone?: string;
  pickupCity?: string;
  pickupAddress?: string;
}

export interface BostaShipmentPayload {
  specs?: {
    packageType?: 'Parcel' | 'Document';
    size?: 'SMALL' | 'MEDIUM' | 'LARGE';
    itemsCount: number;
    description: string;
    weight?: number;
  };
  cod?: number;
  notes?: string;
  receiverAddress?: string;
  receiverCity?: string;
}

export interface StorefrontSettingsPayload {
  enabled?: boolean;
  title?: string;
  address?: string;
  bio?: string;
  announcement?: string;
  bannerUrl?: string;
  bannerUrls?: string[];
  bannerFit?: 'contain' | 'cover';
  bannerPosition?: string;
  bannerPositions?: string[];
  bannerIntervalSeconds?: number;
  smartDealsEnabled?: boolean;
  freeShippingEnabled?: boolean;
  freeShippingMinOrder?: number;
  deliveryFee?: number;
  minOrder?: number;
  whatsappPhone?: string;
  customDomain?: string;
  onlinePaymentEnabled?: boolean;
  onlinePaymentProvider?: string;
  paymobApiKey?: string;
  paymobIntegrationId?: string;
  paymobIframeId?: string;
  paymobHmacSecret?: string;
  paymobTestMode?: boolean;
  xpayApiKey?: string;
  xpayCommunityId?: string;
  xpayTestMode?: boolean;
  tapSecretKey?: string;
  tapPublishableKey?: string;
  tapTestMode?: boolean;
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  stripeWebhookSecret?: string;
  stripeTestMode?: boolean;
}

export interface StorefrontPaymentSessionResponse {
  ok: boolean;
  mode: 'paymob' | 'xpay' | 'tap' | 'stripe' | 'mock';
  provider: string;
  orderNumber: string;
  amount: number;
  currency?: string;
  testMode?: boolean;
  paymentToken?: string;
  iframeId?: string;
  iframeUrl?: string;
  checkoutUrl?: string;
  transactionId?: string;
  orderId?: string;
  isPaid?: boolean;
  message?: string;
}

export interface StorefrontPaymentStatusResponse {
  ok: boolean;
  orderNumber: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: string;
  totalAmount: number;
  gatewayProvider?: string | null;
  gatewayTransactionId?: string | null;
  paidAt?: string | null;
}

export interface StorefrontCoupon {
  id: number;
  code: string;
  discountType: 'percentage' | 'fixed' | 'free_shipping';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  timesUsed: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCouponPayload {
  code: string;
  discountType: 'percentage' | 'fixed' | 'free_shipping';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateCouponPayload extends Partial<CreateCouponPayload> {}

export interface ValidateCouponResponse {
  ok: boolean;
  code?: string;
  discountType?: 'percentage' | 'fixed' | 'free_shipping';
  discountValue?: number;
  discountAmount?: number;
  isFreeShipping?: boolean;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  message?: string;
}

export interface StorefrontDeliveryZone {
  id: number;
  name: string;
  deliveryFee: number;
  estimatedTime?: string;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDeliveryZonePayload {
  name: string;
  deliveryFee: number;
  estimatedTime?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateDeliveryZonePayload extends Partial<CreateDeliveryZonePayload> {}

