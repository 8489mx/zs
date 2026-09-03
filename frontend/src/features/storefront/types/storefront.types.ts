export interface StorefrontInfo {
  tenantId: string;
  slug: string;
  businessName: string;
  enabled: boolean;
  title: string;
  bio: string;
  announcement: string;
  bannerUrl: string;
  bannerFit?: 'contain' | 'cover';
  bannerPosition?: 'top' | 'center' | 'bottom';
  deliveryFee: number;
  minOrder: number;
  whatsappPhone: string;
  currency: string;
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
    productId: number;
    quantity: number;
    notes?: string;
  }>;
  paymentMethod?: string;
}

export interface CreateOnlineOrderResponse {
  ok: boolean;
  orderId: number;
  orderNumber: string;
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
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
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: string;
  saleId: number | null;
  createdAt: string;
  items: Array<{
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    notes?: string;
  }>;
}

export interface StorefrontSettingsPayload {
  enabled?: boolean;
  title?: string;
  bio?: string;
  announcement?: string;
  bannerUrl?: string;
  bannerFit?: 'contain' | 'cover';
  bannerPosition?: 'top' | 'center' | 'bottom';
  deliveryFee?: number;
  minOrder?: number;
  whatsappPhone?: string;
}
