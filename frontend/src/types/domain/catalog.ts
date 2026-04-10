export interface ProductUnit {
  id: string;
  name: string;
  multiplier: number;
  barcode: string;
  isBaseUnit: boolean;
  isSaleUnit: boolean;
  isPurchaseUnit: boolean;
}

export interface ProductOffer {
  id?: string;
  type: 'percent' | 'fixed';
  value: number;
  from?: string | null;
  to?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ProductCustomerPrice {
  customerId: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  supplierId: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  stock: number;
  minStock: number;
  notes: string;
  units: ProductUnit[];
  offers?: ProductOffer[];
  customerPrices?: ProductCustomerPrice[];
  status?: string;
  statusLabel?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance: number;
  notes: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance: number;
  type: string;
  creditLimit: number;
  storeCreditBalance: number;
}
