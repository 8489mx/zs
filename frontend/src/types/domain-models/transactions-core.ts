export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  qty: number;
  price: number;
  total: number;
  unitName: string;
  unitMultiplier: number;
  cost: number;
  priceType: string;
  notes?: string;
  modifiers?: Array<{ productId?: string | number; name: string; qty: number; price?: number }>;
}

export interface SalePayment {
  id?: string;
  paymentChannel: string;
  amount: number;
}

export interface Sale {
  id: string;
  docNo: string;
  customerId: string;
  customerName: string;
  paymentType: string;
  paymentChannel: string;
  subTotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  pricesIncludeTax: boolean;
  total: number;
  paidAmount: number;
  tenderedAmount: number;
  changeAmount: number;
  payments?: SalePayment[];
  status: string;
  note: string;
  createdBy: string;
  branchId: string;
  branchName: string;
  locationId: string;
  locationName: string;
  date: string;
  items: SaleItem[];
}

export interface PurchaseItem {
  id: string;
  productId: string;
  name: string;
  qty: number;
  cost: number;
  total: number;
  unitName: string;
  unitMultiplier: number;
}

export interface Purchase {
  id: string;
  docNo: string;
  supplierId: string;
  supplierName: string;
  paymentType: string;
  subTotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  pricesIncludeTax: boolean;
  total: number;
  note: string;
  status: string;
  createdBy: string;
  branchId: string;
  branchName: string;
  locationId: string;
  locationName: string;
  date: string;
  items: PurchaseItem[];
  attachments?: any[];
}

export interface ReturnRecord {
  id: string;
  docNo: string;
  returnType?: string;
  type?: string;
  invoiceId?: string;
  productId?: string;
  productName: string;
  qty: number;
  total: number;
  note: string;
  createdAt?: string;
  date?: string;
  settlementMode?: string;
  refundMethod?: string;
  createdBy?: string;
  createdByName?: string;
}
