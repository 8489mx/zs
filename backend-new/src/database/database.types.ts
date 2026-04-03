import { ColumnType, Generated } from 'kysely';

export interface Phase1BootstrapTable {
  id: Generated<number>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface SessionTable {
  id: string;
  user_id: number;
  expires_at: Date;
  created_at: ColumnType<Date, string | undefined, never>;
  last_seen_at: Date | null;
  ip_address: string;
  user_agent: string;
}

export interface UserTable {
  id: Generated<number>;
  username: string;
  password_hash: string;
  password_salt: string;
  role: 'super_admin' | 'admin' | 'cashier';
  is_active: boolean;
  permissions_json: string;
  branch_ids_json: string;
  default_branch_id: number | null;
  display_name: string;
  must_change_password: boolean;
  failed_login_count: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface SettingTable {
  key: string;
  value: string;
}

export interface AuditLogTable {
  id: Generated<number>;
  action: string;
  details: string;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface ProductCategoryTable {
  id: Generated<number>;
  name: string;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface SupplierTable {
  id: Generated<number>;
  name: string;
  phone: string;
  address: string;
  balance: number;
  notes: string;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface CustomerTable {
  id: Generated<number>;
  name: string;
  phone: string;
  address: string;
  balance: number;
  customer_type: 'cash' | 'vip';
  credit_limit: number;
  store_credit_balance: number;
  company_name: string;
  tax_number: string;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface ProductTable {
  id: Generated<number>;
  name: string;
  barcode: string | null;
  category_id: number | null;
  supplier_id: number | null;
  price: number;
  cost: number;
  stock: number;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  stock_qty: number;
  min_stock_qty: number;
  notes: string;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface ProductUnitTable {
  id: Generated<number>;
  product_id: number;
  name: string;
  multiplier: number;
  barcode: string | null;
  is_base_unit: boolean;
  is_sale_unit_default: boolean;
  is_purchase_unit_default: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface ProductOfferTable {
  id: Generated<number>;
  product_id: number;
  offer_type: 'percent' | 'fixed';
  value: number;
  start_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  end_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface ProductCustomerPriceTable {
  id: Generated<number>;
  product_id: number;
  customer_id: number;
  price: number;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface StockMovementTable {
  id: Generated<number>;
  product_id: number | null;
}

export interface SalesTable {
  id: Generated<number>;
  customer_id: number | null;
}

export interface CustomerPaymentTable {
  id: Generated<number>;
  customer_id: number;
}

export interface CustomerLedgerTable {
  id: Generated<number>;
  customer_id: number;
}

export interface PurchaseTable {
  id: Generated<number>;
  supplier_id: number;
}

export interface SupplierPaymentTable {
  id: Generated<number>;
  supplier_id: number;
}

export interface SupplierLedgerTable {
  id: Generated<number>;
  supplier_id: number;
}

export interface Database {
  _phase1_bootstrap: Phase1BootstrapTable;
  sessions: SessionTable;
  users: UserTable;
  settings: SettingTable;
  audit_logs: AuditLogTable;
  product_categories: ProductCategoryTable;
  suppliers: SupplierTable;
  customers: CustomerTable;
  products: ProductTable;
  product_units: ProductUnitTable;
  product_offers: ProductOfferTable;
  product_customer_prices: ProductCustomerPriceTable;
  stock_movements: StockMovementTable;
  sales: SalesTable;
  customer_payments: CustomerPaymentTable;
  customer_ledger: CustomerLedgerTable;
  purchases: PurchaseTable;
  supplier_payments: SupplierPaymentTable;
  supplier_ledger: SupplierLedgerTable;
}
