export interface TradeInTransaction {
  id: string;
  docNo: string;
  sellerName: string;
  sellerPhone: string;
  sellerNationalId: string;
  deviceBrand?: string | null;
  deviceModel: string;
  serialNumber: string;
  imei2?: string | null;
  deviceConditionNotes?: string | null;
  agreedPurchasePrice: number;
  transactionType: 'cash_purchase' | 'exchange_trade_in';
  createdProductId?: string | null;
  saleId?: string | null;
  paymentMethod: string;
  signatureData?: string | null;
  branchId?: string | null;
  locationId?: string | null;
  notes?: string | null;
  createdAt: string;
}
