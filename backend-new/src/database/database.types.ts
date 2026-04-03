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

export interface BranchTable {
  id: Generated<number>;
  name: string;
  code: string;
  is_active: boolean;
}

export interface StockLocationTable {
  id: Generated<number>;
  name: string;
  code: string;
  branch_id: number | null;
  is_active: boolean;
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
  movement_type: string;
  qty: number;
  before_qty: number;
  after_qty: number;
  reason: string;
  note: string;
  reference_type: string | null;
  reference_id: number | null;
  created_by: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface StockTransferTable {
  id: Generated<number>;
  doc_no: string | null;
  from_location_id: number;
  to_location_id: number;
  from_branch_id: number | null;
  to_branch_id: number | null;
  status: 'sent' | 'received' | 'cancelled';
  note: string;
  created_by: number | null;
  received_by: number | null;
  cancelled_by: number | null;
  received_at: Date | null;
  cancelled_at: Date | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface StockTransferItemTable {
  id: Generated<number>;
  transfer_id: number;
  product_id: number;
  product_name: string;
  qty: number;
}

export interface StockCountSessionTable {
  id: Generated<number>;
  doc_no: string;
  branch_id: number | null;
  location_id: number | null;
  status: 'draft' | 'posted';
  note: string;
  counted_by: number | null;
  approved_by: number | null;
  posted_at: Date | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface StockCountItemTable {
  id: Generated<number>;
  session_id: number;
  product_id: number;
  product_name: string;
  expected_qty: number;
  counted_qty: number;
  variance_qty: number;
  reason: string;
  note: string;
}

export interface DamagedStockRecordTable {
  id: Generated<number>;
  product_id: number;
  branch_id: number | null;
  location_id: number | null;
  qty: number;
  reason: string;
  note: string;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface SalesTable {
  id: Generated<number>;
  doc_no: string | null;
  customer_id: number | null;
  customer_name: string | null;
  payment_type: 'cash' | 'credit';
  payment_channel: 'cash' | 'card' | 'mixed' | 'credit';
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  prices_include_tax: boolean;
  total: number;
  paid_amount: number;
  store_credit_used: number;
  status: string;
  note: string;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  cancelled_at: Date | null;
  cancelled_by: number | null;
  cancel_reason: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface SaleItemTable {
  id: Generated<number>;
  sale_id: number;
  product_id: number | null;
  product_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
  unit_name: string;
  unit_multiplier: number;
  cost_price: number;
  price_type: 'retail' | 'wholesale';
}

export interface SalePaymentTable {
  id: Generated<number>;
  sale_id: number;
  payment_channel: 'cash' | 'card';
  amount: number;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface HeldSaleTable {
  id: Generated<number>;
  customer_id: number | null;
  payment_type: 'cash' | 'credit';
  payment_channel: 'cash' | 'card' | 'mixed' | 'credit';
  paid_amount: number;
  cash_amount: number;
  card_amount: number;
  discount: number;
  note: string;
  search: string;
  price_type: 'retail' | 'wholesale';
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HeldSaleItemTable {
  id: Generated<number>;
  held_sale_id: number;
  product_id: number | null;
  product_name: string;
  qty: number;
  unit_price: number;
  unit_name: string;
  unit_multiplier: number;
  price_type: 'retail' | 'wholesale';
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface TreasuryTransactionTable {
  id: Generated<number>;
  txn_type: string;
  amount: number;
  note: string;
  reference_type: string | null;
  reference_id: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface CashierShiftTable {
  id: Generated<number>;
  opened_by: number;
  status: string;
}

export interface CustomerPaymentTable {
  id: Generated<number>;
  customer_id: number;
  amount: number;
  note: string;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface CustomerLedgerTable {
  id: Generated<number>;
  customer_id: number;
  entry_type: string;
  amount: number;
  balance_after: number;
  note: string;
  reference_type: string | null;
  reference_id: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface PurchaseTable {
  id: Generated<number>;
  doc_no: string | null;
  supplier_id: number | null;
  payment_type: 'cash' | 'credit';
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  prices_include_tax: boolean;
  total: number;
  note: string;
  status: string;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  cancelled_at: Date | null;
  cancelled_by: number | null;
  cancel_reason: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface PurchaseItemTable {
  id: Generated<number>;
  purchase_id: number;
  product_id: number | null;
  product_name: string;
  qty: number;
  unit_cost: number;
  line_total: number;
  unit_name: string;
  unit_multiplier: number;
}

export interface SupplierPaymentTable {
  id: Generated<number>;
  doc_no: string | null;
  supplier_id: number;
  amount: number;
  note: string;
  branch_id: number | null;
  location_id: number | null;
  payment_date: ColumnType<Date, string | undefined, string | undefined>;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface SupplierLedgerTable {
  id: Generated<number>;
  supplier_id: number;
  entry_type: string;
  amount: number;
  balance_after: number;
  note: string;
  reference_type: string | null;
  reference_id: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface Database {
  _phase1_bootstrap: Phase1BootstrapTable;
  sessions: SessionTable;
  users: UserTable;
  settings: SettingTable;
  audit_logs: AuditLogTable;
  branches: BranchTable;
  stock_locations: StockLocationTable;
  product_categories: ProductCategoryTable;
  suppliers: SupplierTable;
  customers: CustomerTable;
  products: ProductTable;
  product_units: ProductUnitTable;
  product_offers: ProductOfferTable;
  product_customer_prices: ProductCustomerPriceTable;
  stock_movements: StockMovementTable;
  stock_transfers: StockTransferTable;
  stock_transfer_items: StockTransferItemTable;
  stock_count_sessions: StockCountSessionTable;
  stock_count_items: StockCountItemTable;
  damaged_stock_records: DamagedStockRecordTable;
  sales: SalesTable;
  sale_items: SaleItemTable;
  sale_payments: SalePaymentTable;
  held_sales: HeldSaleTable;
  held_sale_items: HeldSaleItemTable;
  customer_payments: CustomerPaymentTable;
  customer_ledger: CustomerLedgerTable;
  treasury_transactions: TreasuryTransactionTable;
  cashier_shifts: CashierShiftTable;
  purchases: PurchaseTable;
  purchase_items: PurchaseItemTable;
  supplier_payments: SupplierPaymentTable;
  supplier_ledger: SupplierLedgerTable;
}
