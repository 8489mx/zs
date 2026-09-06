export interface DemoProductItem {
  name: string;
  category: string;
  barcode: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  stockQty: number;
  minStockQty: number;
  itemKind?: 'standard' | 'fashion';
  color?: string;
  size?: string;
}

export interface DemoSupplierItem {
  name: string;
  phone: string;
  address: string;
  balance: number;
}

export interface DemoCustomerItem {
  name: string;
  phone: string;
  address: string;
  balance: number;
  customerType: 'cash' | 'vip';
}

export interface DemoActivityDataset {
  key: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  categories: string[];
  products: DemoProductItem[];
  suppliers: DemoSupplierItem[];
  customers: DemoCustomerItem[];
  sampleSales: Array<{
    daysAgo: number;
    customerIndex?: number;
    itemIndices: Array<{ index: number; qty: number }>;
    paymentChannel: 'cash' | 'card' | 'instapay';
  }>;
  sampleOnlineOrders: Array<{
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    city: string;
    itemIndices: Array<{ index: number; qty: number }>;
    paymentMethod: string;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  }>;
}
