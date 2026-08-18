export type PrototypeLine = {
  id: number;
  productId: string | null;
  itemName: string;
  qty: number;
  unitPrice: number;
  warehouse: string;
  warehouseId?: string;
  category?: string;
  categoryId?: string;
  isService?: boolean;
  trackSerials?: boolean;
  serials?: string[];
};

export type SupplierOption = {
  id: string;
  name: string;
  code: string;
  phone: string;
  taxNumber: string;
  contactName?: string;
  shippingAddress?: string;
  company?: string;
  balance?: number;
};

export type ContactOption = {
  id: string;
  name: string;
  phone: string;
  supplierName?: string;
};

export type AddressOption = {
  id: string;
  label: string;
  city: string;
  supplierName?: string;
};

export type ProductOption = {
  id: string;
  name: string;
  englishName?: string;
  code: string;
  sku?: string;
  barcode?: string;
  price: number;
  warehouse: string;
  warehouseId?: string;
  category?: string;
  categoryId?: string;
  type: 'stock' | 'service';
  defaultLocationId?: string;
  defaultLocationName?: string;
  activeLocationIds?: string[];
  costPrice?: number;
  trackSerials?: boolean;
};

export type CategoryOption = {
  id: string;
  name: string;
  code?: string;
};

export type WarehouseOption = {
  id: string;
  name: string;
  code: string;
};

export type CostCenterOption = {
  id: string;
  name: string;
  code: string;
};

export type ProjectOption = {
  id: string;
  name: string;
  code: string;
};

export type QuickCreateState =
  | { kind: 'supplier'; query: string }
  | { kind: 'product'; query: string; lineId: number | null; barcode?: string }
  | { kind: 'contact'; query: string }
  | { kind: 'address'; query: string }
  | { kind: 'warehouse'; query: string; lineId: number | null }
  | { kind: 'category'; query: string; lineId: number | null }
  | { kind: 'costCenter'; query: string }
  | { kind: 'project'; query: string }
  | null;

export type DocumentStatus = 'draft' | 'confirmed';

export type PurchasePrototypeDraft = {
  supplier: string;
  date: string;
  requiredDate: string;
  currency: string;
  company: string;
  contact: string;
  shippingAddress: string;
  taxRate: number;
  discount: number;
  discountMode: 'percent' | 'value';
  customTaxRate: string;
  costCenter: string;
  project: string;
  termsTemplate: string;
  notes: string;
  lines: PrototypeLine[];
  suppliers: SupplierOption[];
  contactsList: ContactOption[];
  addressesList: AddressOption[];
  products: ProductOption[];
  warehouses: WarehouseOption[];
  costCenters: CostCenterOption[];
  projects: ProjectOption[];
  status: DocumentStatus;
};

export type ValidationRowErrors = Partial<Record<'product' | 'qty' | 'price' | 'warehouse' | 'category', string>>;

export type ValidationErrors = {
  supplier?: string;
  date?: string;
  requiredDate?: string;
  currency?: string;
  rows: Record<number, ValidationRowErrors>;
};

export type InlineMessageTone = 'success' | 'error' | 'info';

export const PURCHASE_DRAFT_STORAGE_KEY = 'purchase-new-prototype-draft';

export type QuickCreateResult =
  | { kind: 'supplier'; name: string; contactName?: string; phone?: string; taxNumber?: string; notes?: string }
  | { kind: 'product'; name: string; productType: 'stock' | 'service'; price?: number; unit?: string; warehouse?: string; barcode?: string }
  | { kind: 'contact'; name: string; phone?: string }
  | { kind: 'address'; label: string; city?: string; supplier?: string }
  | { kind: 'warehouse'; name: string; code?: string }
  | { kind: 'category'; name: string; code?: string }
  | { kind: 'costCenter'; name: string; code?: string }
  | { kind: 'project'; name: string; code?: string };
