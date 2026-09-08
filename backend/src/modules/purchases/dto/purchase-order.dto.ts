export interface PurchaseOrderItemDto {
  productId: number;
  productName: string;
  unitName?: string;
  quantity: number;
  receivedQuantity?: number;
  unitCost: number;
  taxRate?: number;
  discount?: number;
  total: number;
  notes?: string;
}

export interface CreatePurchaseOrderDto {
  supplierId?: number | null;
  supplierName: string;
  supplierPhone?: string;
  warehouseId?: number | null;
  warehouseName?: string;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  expectedDeliveryDate?: string | null;
  notes?: string;
  termsConditions?: string;
  items: PurchaseOrderItemDto[];
}

export interface UpdatePurchaseOrderDto extends Partial<CreatePurchaseOrderDto> {
  status?: 'draft' | 'confirmed' | 'partially_received' | 'received' | 'converted_to_bill' | 'cancelled';
}

export interface ReceivePurchaseOrderDto {
  warehouseId?: number;
  items: {
    itemId: number;
    productId: number;
    quantityToReceive: number;
  }[];
}
