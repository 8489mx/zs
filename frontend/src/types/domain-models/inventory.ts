export interface InventoryReportItem {
  id: string;
  name: string;
  categoryName?: string;
  supplierName?: string;
  stockQty: number;
  minStock: number;
  retailPrice: number;
  costPrice: number;
  status?: string;
}

export interface InventoryReport {
  items: InventoryReportItem[];
}

export interface StockMovementRecord {
  id: string;
  productId: string;
  productName: string;
  type: string;
  qty: number;
  beforeQty: number;
  afterQty: number;
  reason?: string;
  note?: string;
  referenceType?: string;
  referenceId?: string;
  createdBy?: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
  date: string;
}

export interface StockTransferItem {
  id: string;
  productId: string;
  productName: string;
  qty: number;
}

export interface StockTransfer {
  id: string;
  docNo: string;
  fromLocationId: string;
  toLocationId: string;
  fromBranchId?: string;
  toBranchId?: string;
  fromLocationName?: string;
  toLocationName?: string;
  fromBranchName?: string;
  toBranchName?: string;
  status: string;
  note?: string;
  receivedAt?: string;
  cancelledAt?: string;
  createdBy?: string;
  receivedBy?: string;
  cancelledBy?: string;
  date: string;
  items: StockTransferItem[];
}

export interface StockCountItem {
  id: string;
  productId: string;
  productName: string;
  expectedQty: number;
  countedQty: number;
  varianceQty: number;
  reason?: string;
  note?: string;
}

export interface StockCountSession {
  id: string;
  docNo: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
  status: string;
  note?: string;
  countedBy?: string;
  approvedBy?: string;
  postedAt?: string;
  createdAt: string;
  items: StockCountItem[];
}

export interface DamagedStockRecord {
  id: string;
  productId: string;
  productName: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
  qty: number;
  reason?: string;
  note?: string;
  createdBy?: string;
  createdAt?: string;
  date: string;
}
