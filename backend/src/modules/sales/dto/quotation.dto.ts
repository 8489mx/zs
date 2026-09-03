export interface QuotationItemDto {
  productId: number;
  productName: string;
  unitName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
  notes?: string;
}

export interface CreateQuotationDto {
  customerId?: number | null;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  branchId?: number | null;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  validUntil?: string;
  notes?: string;
  termsConditions?: string;
  items: QuotationItemDto[];
}

export interface UpdateQuotationDto extends Partial<CreateQuotationDto> {
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
}
