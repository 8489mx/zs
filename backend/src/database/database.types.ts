import { ColumnType, Generated } from 'kysely';

export interface Phase1BootstrapTable {
  id: Generated<number>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface OperationExecutionTable {
  id: Generated<number>;
  tenant_id: string;
  account_id: string;
  idempotency_key: string;
  operation_type: string;
  status: string; // processing, committed, failed, recovery_required
  request_hash: string;
  document_id: string | null;
  response_payload: string | null;
  error_code: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
  completed_at: Date | null;
}

export interface SessionTable {
  id: string;
  user_id: number;
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
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
  default_branch_id: number | null;
  display_name: string;
  must_change_password: boolean;
  failed_login_count: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface TenantTable {
  id: string;
  slug: string;
  business_name: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string | null;
  activity_type: string | null;
  status: 'trial' | 'active' | 'expired' | 'suspended';
  trial_starts_at: Date;
  trial_ends_at: Date;
  activated_at: Date | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface TrialSignupTable {
  id: string;
  tenant_id: string;
  source: string | null;
  campaign: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  notes: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface SettingTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  key: string;
  value: string;
}

export interface AccountingAccountTable {
  id: Generated<number>;
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  code: ColumnType<string, string | undefined, string | undefined>;
  name_ar: string;
  name_en: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'contra_asset' | 'contra_revenue';
  parent_id: number | null;
  account_group: string;
  normal_balance: 'debit' | 'credit';
  is_active: boolean;
  is_system: boolean;
  allow_manual_entries: boolean;
  is_control_account: boolean;
  is_cash_bank: boolean;
  is_receivable: boolean;
  is_payable: boolean;
  is_inventory: boolean;
  is_tax: boolean;
  description_ar: string;
  sort_order: number;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface JournalEntryTable {
  id: Generated<number>;
  tenant_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  account_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  entry_no: string;
  entry_date: ColumnType<Date, string | undefined, string | undefined>;
  description: string;
  source_type: string;
  source_id: number | null;
  status: 'draft' | 'posted' | 'cancelled';
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  posted_by: number | null;
  posted_at: Date | null;
  cancelled_by: number | null;
  cancelled_at: Date | null;
  cancel_reason: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface JournalEntryLineTable {
  id: Generated<number>;
  tenant_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  journal_entry_id: number;
  account_id: number;
  description: string;
  debit: number;
  credit: number;
  partner_type: 'none' | 'customer' | 'supplier';
  partner_id: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface AccountingSettingsTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: number;
  cash_account_id: number | null;
  bank_account_id: number | null;
  customer_receivable_account_id: number | null;
  supplier_payable_account_id: number | null;
  inventory_account_id: number | null;
  sales_revenue_account_id: number | null;
  sales_discount_account_id: number | null;
  cogs_account_id: number | null;
  purchase_account_id: number | null;
  expenses_account_id: number | null;
  sales_tax_account_id: number | null;
  purchase_tax_account_id: number | null;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface AuditLogTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  action: string;
  details: string;
  target_tenant_id: string | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface BranchTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  name: string;
  code: ColumnType<string, string | undefined, string | undefined>;
  default_stock_location_id: number | null;
  sales_stock_mode: 'single_location' | 'all_operational_locations';
  allow_external_sales_stock: boolean;
  is_active: boolean;
}

export interface SaleLineStockAllocationTable {
  id: Generated<number>;
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  sale_id: number;
  sale_line_id: number;
  product_id: number;
  location_id: number;
  quantity: number;
  allocation_order: number;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface StockLocationTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  name: string;
  code: ColumnType<string, string | undefined, string | undefined>;
  branch_id: number | null;
  location_type: 'branch_stock' | 'internal_warehouse' | 'external_warehouse' | 'damaged' | 'in_transit';
  is_active: boolean;
}

export interface UserBranchTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  user_id: number;
  branch_id: number;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface ProductCategoryTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  name: string;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface SupplierTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  name: string;
  phone: string;
  address: string;
  balance: number;
  notes: ColumnType<string, string | undefined, string | undefined>;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface CustomerTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
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
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface ProductTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  name: string;
  barcode: string | null;
  category_id: number | null;
  supplier_id: number | null;
  item_type: ColumnType<'product' | 'raw_material', 'product' | 'raw_material' | undefined, 'product' | 'raw_material' | undefined>;
  item_kind: ColumnType<'standard' | 'fashion', 'standard' | 'fashion' | undefined, 'standard' | 'fashion' | undefined>;
  style_code: string | null;
  color: string | null;
  size: string | null;
  bin_location: string | null;
  default_location_id: number | null;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  stock_qty: number;
  min_stock_qty: number;
  notes: ColumnType<string, string | undefined, string | undefined>;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface StyleCodeCounterTable {
  tenant_id: string;
  scope: string;
  next_value: number;
}

export interface ProductUnitTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  product_id: number;
  name: string;
  multiplier: number;
  barcode: string | null;
  is_base_unit: boolean;
  is_sale_unit_default: boolean;
  is_purchase_unit_default: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface ProductOfferTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  product_id: number;
  offer_type: 'percent' | 'fixed' | 'price';
  value: number;
  min_qty: ColumnType<number, number | undefined, number>;
  start_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  end_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface ProductCustomerPriceTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  product_id: number;
  customer_id: number;
  price: number;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}



export interface ProductPricingProfileTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  product_id: number;
  pricing_group_key: string | null;
  pricing_mode: 'standard' | 'inherit' | 'manual';
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface PricingRuleTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  name: string;
  supplier_id: number | null;
  category_id: number | null;
  item_kind: 'standard' | 'fashion' | null;
  style_code: string | null;
  operation_type: 'percent_increase' | 'percent_decrease' | 'fixed_increase' | 'fixed_decrease' | 'set_price' | 'margin_from_cost';
  operation_value: number;
  targets_json: string;
  rounding_mode: 'none' | 'nearest' | 'ending';
  rounding_nearest_step: number | null;
  rounding_ending: number | null;
  options_json: string;
  notes: ColumnType<string, string | undefined, string | undefined>;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface ProductLocationStockTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  product_id: number;
  branch_id: number | null;
  location_id: number | null;
  qty: number;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface StockMovementTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
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
  unit_cost: number | null;
  total_cost: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface StockTransferTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  doc_no: string | null;
  from_location_id: number;
  to_location_id: number | null;
  from_branch_id: number | null;
  to_branch_id: number | null;
  status: 'sent' | 'received' | 'cancelled';
  note: string;
  recipient_name: string | null;
  created_by: number | null;
  received_by: number | null;
  cancelled_by: number | null;
  received_at: Date | null;
  cancelled_at: Date | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface StockTransferItemTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  transfer_id: number;
  product_id: number;
  product_name: string;
  qty: number;
}

export interface StockCountSessionTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
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
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface StockCountItemTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
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
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  product_id: number;
  branch_id: number | null;
  location_id: number | null;
  qty: number;
  reason: string;
  note: string;
  created_by: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface SalesTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  doc_no: string | null;
  customer_id: number | null;
  customer_name: string | null;
  payment_type: 'cash' | 'credit';
  payment_channel: 'cash' | 'card' | 'wallet' | 'instapay' | 'mixed' | 'credit';
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  prices_include_tax: boolean;
  total: number;
  paid_amount: number;
  tendered_amount: number;
  change_amount: number;
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
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface SaleItemTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
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
  notes: ColumnType<string, string | undefined, string | undefined>;
  modifiers: ColumnType<unknown, unknown | undefined, unknown | undefined>;
}

export interface SalePaymentTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  sale_id: number;
  payment_channel: 'cash' | 'card' | 'wallet' | 'instapay';
  amount: number;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface HeldSaleTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  customer_id: number | null;
  payment_type: 'cash' | 'credit';
  payment_channel: 'cash' | 'card' | 'wallet' | 'instapay' | 'mixed' | 'credit';
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
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HeldSaleItemTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
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


export interface ExpenseTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  title: string;
  amount: number;
  expense_date: ColumnType<Date, string | undefined, string | undefined>;
  note: string;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface ReturnDocumentTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  doc_no: string | null;
  return_type: 'sale' | 'purchase';
  invoice_id: number | null;
  settlement_mode: string;
  refund_method: string;
  exchange_sale_id: number | null;
  total: number;
  note: string;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface ReturnItemTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  return_document_id: number;
  product_id: number | null;
  product_name: string;
  qty: number;
  unit_total: number;
  line_total: number;
  sale_item_id: number | null;
  purchase_item_id: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface TreasuryTransactionTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  txn_type: string;
  amount: number;
  note: string;
  reference_type: string | null;
  reference_id: number | null;
  return_document_id: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface CashierShiftTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  opened_by: number;
  status: string;
  expected_cash: number | null;
  counted_cash: number | null;
  branch_id: number | null;
  location_id: number | null;
  closed_at: Date | null;
  closed_by: number | null;
}

export interface ServicesTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  name: string;
  amount: number;
  notes: string;
  service_date: ColumnType<Date, string | undefined, string | undefined>;
  payment_channel: string;
  branch_id: number | null;
  location_id: number | null;
  revision: number;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface CustomerPaymentTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
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
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  customer_id: number;
  entry_type: string;
  amount: number;
  balance_after: number;
  note: string;
  reference_type: string | null;
  reference_id: number | null;
  return_document_id: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}


export interface PriceChangeRunTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  filters_json: string;
  operation_json: string;
  options_json: string;
  summary_json: string;
  affected_count: number;
  status: string;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  undone_at: ColumnType<Date | null, string | undefined, string | undefined>;
  undone_by: number | null;
}

export interface PriceChangeItemTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  run_id: number;
  product_id: number;
  old_retail_price: number;
  new_retail_price: number;
  old_wholesale_price: number;
  new_wholesale_price: number;
  has_active_offer: boolean;
  has_customer_price: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface PartnerContactTable {
  id: Generated<number>;
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  partner_type: string;
  partner_id: number;
  name: string;
  phone: ColumnType<string, string | undefined, string | undefined>;
  email: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface PartnerAddressTable {
  id: Generated<number>;
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  partner_type: string;
  partner_id: number;
  label: string;
  city: ColumnType<string, string | undefined, string | undefined>;
  address_line: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface CostCenterTable {
  id: Generated<number>;
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  code: ColumnType<string, string | undefined, string | undefined>;
  name: string;
  is_active: ColumnType<boolean, boolean | undefined, boolean | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface ProjectTable {
  id: Generated<number>;
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  code: ColumnType<string, string | undefined, string | undefined>;
  name: string;
  is_active: ColumnType<boolean, boolean | undefined, boolean | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface ManufacturingBomTable {
  id: Generated<number>;
  product_id: number;
  quantity: number;
  overhead_cost: number;
  expected_cost: number;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
}

export interface ManufacturingBomLineTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  bom_id: number;
  component_product_id: number;
  quantity: number;
  unit_name: string;
  unit_multiplier: number;
  waste_percentage: number;
  expected_cost: number;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface ManufacturingWorkOrderTable {
  id: Generated<number>;
  doc_no: string | null;
  bom_id: number;
  status: 'draft' | 'in_progress' | 'done' | 'cancelled';
  quantity_to_produce: number;
  produced_quantity: number;
  source_location_id: number | null;
  destination_location_id: number | null;
  start_date: ColumnType<Date | null, string | null | undefined, string | null | undefined>;
  end_date: ColumnType<Date | null, string | null | undefined, string | null | undefined>;
  total_cost: number;
  note: string;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
}

export interface ManufacturingWoConsumptionTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  work_order_id: number;
  component_product_id: number;
  quantity_consumed: number;
  unit_cost: number;
  line_total: number;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface PurchaseAttachmentTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  purchase_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
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
  cancel_reason: ColumnType<string, string | undefined, string | undefined>;
  required_date: Date | null;
  currency: ColumnType<string, string | undefined, string | undefined>;
  company_name: ColumnType<string, string | undefined, string | undefined>;
  contact_id: number | null;
  shipping_address_id: number | null;
  cost_center_id: number | null;
  project_id: number | null;
  terms_template: ColumnType<string, string | undefined, string | undefined>;
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface PurchaseItemTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  purchase_id: number;
  product_id: number | null;
  product_name: string;
  qty: number;
  unit_cost: number;
  line_total: number;
  unit_name: string;
  unit_multiplier: number;
  category_id: number | null;
  location_id: number | null;
}

export interface SupplierPaymentTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
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

export interface SupplierPaymentScheduleTable {
  id: Generated<number>;
  purchase_id: number | null;
  supplier_id: number;
  installment_no: number;
  due_date: ColumnType<string, string | undefined, string | undefined>;
  amount: number;
  paid_amount: number;
  status: string;
  note: string;
  paid_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
  tenant_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  account_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface SupplierPaymentScheduleLogTable {
  id: Generated<number>;
  schedule_id: number;
  supplier_id: number;
  amount: number;
  note: string;
  created_by: number | null;
  created_by_name: string;
  tenant_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  account_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface SupplierLedgerTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  supplier_id: number;
  entry_type: string;
  amount: number;
  balance_after: number;
  note: string;
  reference_type: string | null;
  reference_id: number | null;
  return_document_id: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface HrDepartmentTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  name: string;
  code: ColumnType<string, string | undefined, string | undefined>;
  description: string;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrJobTitleTable extends HrDepartmentTable {}

export interface HrPositionTable extends HrDepartmentTable {
  department_id: number | null;
  job_title_id: number | null;
  branch_id: number | null;
  location_id: number | null;
}

export interface HrEmployeeTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_no: string;
  national_id: string | null;
  user_id: number | null;
  first_name: string;
  last_name: string;
  display_name: string;
  status: 'active' | 'inactive' | 'deactivated' | 'terminated';
  department_id: number | null;
  job_title_id: number | null;
  position_id: number | null;
  branch_id: number | null;
  location_id: number | null;
  hire_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  compensation_type: 'monthly' | 'hourly';
  hourly_rate: number | null;
  expected_daily_hours: number | null;
  scheduled_check_in_time: string | null;
  scheduled_check_out_time: string | null;
  grace_minutes: number;
  overtime_policy: 'review_only' | 'disabled' | 'auto_approved';
  notes: ColumnType<string, string | undefined, string | undefined>;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrEmployeeContactTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  contact_type: string;
  value: string;
  label: string;
  is_primary: boolean;
  notes: ColumnType<string, string | undefined, string | undefined>;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrEmployeeDocumentTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  title: string;
  document_type: string;
  file_url: string;
  expiry_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  notes: ColumnType<string, string | undefined, string | undefined>;
  uploaded_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrEmploymentContractTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  contract_no: string;
  contract_type: string;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  start_date: ColumnType<string, string | undefined, string | undefined>;
  end_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  base_salary: number;
  currency: string;
  notes: ColumnType<string, string | undefined, string | undefined>;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrCompensationPackageTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  contract_id: number | null;
  package_name: string;
  allowance_amount: number;
  deduction_amount: number;
  effective_from: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  effective_to: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  notes: ColumnType<string, string | undefined, string | undefined>;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrEmployeeLoanTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  loan_no: string;
  loan_type: 'advance' | 'loan';
  principal_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installment_count: number;
  installment_amount: number;
  repayment_mode: 'deduct_next_salary' | 'monthly_salary_installment' | 'manual_cash';
  monthly_installment_amount: number | null;
  salary_due_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  status: 'draft' | 'approved' | 'paid' | 'partially_repaid' | 'repaid' | 'cancelled';
  issue_date: ColumnType<string, string | undefined, string | undefined>;
  first_due_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  branch_id: number | null;
  location_id: number | null;
  notes: ColumnType<string, string | undefined, string | undefined>;
  approved_by: number | null;
  approved_at: Date | null;
  disbursed_by: number | null;
  disbursed_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrEmployeeLoanInstallmentTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  loan_id: number;
  installment_no: number;
  due_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  paid_at: Date | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrEmployeeLedgerTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  entry_type: string;
  amount: number;
  balance_after: number;
  note: string;
  repayment_method: string | null;
  reference_type: string | null;
  reference_id: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface HrAttendanceRecordTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  work_date: ColumnType<string, string | undefined, string | undefined>;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'excused' | 'early_leave';
  check_in_at: Date | null;
  check_out_at: Date | null;
  source: 'manual' | 'import';
  notes: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrAttendanceExceptionTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  attendance_record_id: number | null;
  work_date: ColumnType<string, string | undefined, string | undefined>;
  exception_type: 'early_check_in' | 'late_check_in' | 'early_check_out' | 'late_check_out' | 'missing_check_in' | 'missing_check_out';
  scheduled_time: string | null;
  actual_time: string | null;
  duration_minutes: number;
  status: 'pending' | 'approved' | 'skipped' | 'auto_calculated' | 'needs_review';
  approved_duration_minutes: number | null;
  note: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrLeaveTypeTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  name: string;
  code: string | null;
  description: string | null;
  is_paid: boolean;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrLeaveRequestTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  leave_type_id: number | null;
  leave_type: string | null;
  start_date: ColumnType<string, string | undefined, string | undefined>;
  end_date: ColumnType<string, string | undefined, string | undefined>;
  days_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string | null;
  notes: string | null;
  decision_notes: string | null;
  decided_by: number | null;
  decided_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrEmployeeAssetTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  asset_type: string;
  asset_name: string;
  asset_code: string | null;
  serial_no: string | null;
  assigned_at: ColumnType<string, string | undefined, string | undefined>;
  returned_at: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  status: 'assigned' | 'returned' | 'lost' | 'damaged' | 'cancelled';
  notes: string | null;
  return_notes: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrPayrollRunTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  period_month: string;
  status: 'draft' | 'reviewed' | 'approved' | 'paid' | 'cancelled';
  notes: ColumnType<string, string | undefined, string | undefined>;
  created_by: number | null;
  reviewed_by: number | null;
  approved_by: number | null;
  paid_by: number | null;
  payment_channel: string | null;
  payment_reference: string | null;
  payment_notes: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
  reviewed_at: Date | null;
  approved_at: Date | null;
  paid_at: Date | null;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrPayrollRunItemTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  run_id: number;
  employee_id: number;
  contract_id: number | null;
  base_salary: number;
  allowance_amount: number;
  deduction_amount: number;
  loan_deduction_amount: number;
  gross_pay: number;
  net_pay: number;
  status: 'draft' | 'reviewed' | 'approved' | 'excluded';
  notes: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrPayrollItemAdjustmentTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  payroll_item_id: number;
  adjustment_type: 'allowance' | 'deduction';
  label: string;
  amount: number;
  notes: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface HrSettingsTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  key: string;
  value: string;
  updated_by: number | null;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}


export interface SaasPlanTable {
  id: Generated<number>;
  code: string;
  name: string;
  price: number;
  currency: string;
  billing_period_months: number;
  max_users: number | null;
  max_branches: number | null;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface TenantSubscriptionTable {
  id: Generated<number>;
  tenant_id: string;
  plan_id: number;
  status: 'active' | 'past_due' | 'expired' | 'cancelled';
  starts_at: Date;
  ends_at: Date;
  grace_ends_at: Date | null;
  auto_renew: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface TenantSubscriptionPaymentTable {
  id: Generated<number>;
  tenant_id: string;
  subscription_id: number;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  paid_at: Date;
  notes: string | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface Database {
  saas_plans: SaasPlanTable;
  tenant_subscriptions: TenantSubscriptionTable;
  tenant_subscription_payments: TenantSubscriptionPaymentTable;
  _phase1_bootstrap: Phase1BootstrapTable;
  operation_executions: OperationExecutionTable;
  sessions: SessionTable;
  users: UserTable;
  tenants: TenantTable;
  trial_signups: TrialSignupTable;
  settings: SettingTable;
  accounting_accounts: AccountingAccountTable;
  journal_entries: JournalEntryTable;
  journal_entry_lines: JournalEntryLineTable;
  accounting_settings: AccountingSettingsTable;
  audit_logs: AuditLogTable;
  branches: BranchTable;
  stock_locations: StockLocationTable;
  user_branches: UserBranchTable;
  product_categories: ProductCategoryTable;
  suppliers: SupplierTable;
  customers: CustomerTable;
  products: ProductTable;
  product_units: ProductUnitTable;
  product_offers: ProductOfferTable;
  product_customer_prices: ProductCustomerPriceTable;
  product_pricing_profiles: ProductPricingProfileTable;
  pricing_rules: PricingRuleTable;
  product_location_stock: ProductLocationStockTable;
  stock_movements: StockMovementTable;
  stock_transfers: StockTransferTable;
  stock_transfer_items: StockTransferItemTable;
  stock_count_sessions: StockCountSessionTable;
  stock_count_items: StockCountItemTable;
  damaged_stock_records: DamagedStockRecordTable;
  sales: SalesTable;
  sale_items: SaleItemTable;
  sale_line_stock_allocations: SaleLineStockAllocationTable;
  sale_payments: SalePaymentTable;
  held_sales: HeldSaleTable;
  held_sale_items: HeldSaleItemTable;
  customer_payments: CustomerPaymentTable;
  customer_ledger: CustomerLedgerTable;
  expenses: ExpenseTable;
  return_documents: ReturnDocumentTable;
  return_items: ReturnItemTable;
  treasury_transactions: TreasuryTransactionTable;
  cashier_shifts: CashierShiftTable;
  purchases: PurchaseTable;
  purchase_items: PurchaseItemTable;
  supplier_payments: SupplierPaymentTable;
  supplier_payment_schedules: SupplierPaymentScheduleTable;
  supplier_payment_schedule_logs: SupplierPaymentScheduleLogTable;
  supplier_ledger: SupplierLedgerTable;
  services: ServicesTable;
  hr_departments: HrDepartmentTable;
  hr_job_titles: HrJobTitleTable;
  hr_positions: HrPositionTable;
  hr_employees: HrEmployeeTable;
  hr_employee_contacts: HrEmployeeContactTable;
  hr_employee_documents: HrEmployeeDocumentTable;
  hr_employment_contracts: HrEmploymentContractTable;
  hr_compensation_packages: HrCompensationPackageTable;
  hr_employee_loans: HrEmployeeLoanTable;
  hr_employee_loan_installments: HrEmployeeLoanInstallmentTable;
  hr_employee_ledger: HrEmployeeLedgerTable;
  hr_attendance_records: HrAttendanceRecordTable;
  hr_attendance_exceptions: HrAttendanceExceptionTable;
  hr_leave_types: HrLeaveTypeTable;
  hr_leave_requests: HrLeaveRequestTable;
  hr_employee_assets: HrEmployeeAssetTable;
  hr_payroll_runs: HrPayrollRunTable;
  hr_payroll_run_items: HrPayrollRunItemTable;
  hr_payroll_item_adjustments: HrPayrollItemAdjustmentTable;
  hr_hr_settings: HrSettingsTable;
  price_change_runs: PriceChangeRunTable;
    price_change_items: PriceChangeItemTable;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrAttendanceExceptionTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  attendance_record_id: number | null;
  work_date: ColumnType<string, string | undefined, string | undefined>;
  exception_type: 'early_check_in' | 'late_check_in' | 'early_check_out' | 'late_check_out' | 'missing_check_in' | 'missing_check_out';
  scheduled_time: string | null;
  actual_time: string | null;
  duration_minutes: number;
  status: 'pending' | 'approved' | 'skipped' | 'auto_calculated' | 'needs_review';
  approved_duration_minutes: number | null;
  note: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrLeaveTypeTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  name: string;
  code: string | null;
  description: string | null;
  is_paid: boolean;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrLeaveRequestTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  leave_type_id: number | null;
  leave_type: string | null;
  start_date: ColumnType<string, string | undefined, string | undefined>;
  end_date: ColumnType<string, string | undefined, string | undefined>;
  days_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string | null;
  notes: string | null;
  decision_notes: string | null;
  decided_by: number | null;
  decided_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrEmployeeAssetTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  employee_id: number;
  asset_type: string;
  asset_name: string;
  asset_code: string | null;
  serial_no: string | null;
  assigned_at: ColumnType<string, string | undefined, string | undefined>;
  returned_at: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  status: 'assigned' | 'returned' | 'lost' | 'damaged' | 'cancelled';
  notes: string | null;
  return_notes: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrPayrollRunTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  period_month: string;
  status: 'draft' | 'reviewed' | 'approved' | 'paid' | 'cancelled';
  notes: ColumnType<string, string | undefined, string | undefined>;
  created_by: number | null;
  reviewed_by: number | null;
  approved_by: number | null;
  paid_by: number | null;
  payment_channel: string | null;
  payment_reference: string | null;
  payment_notes: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
  reviewed_at: Date | null;
  approved_at: Date | null;
  paid_at: Date | null;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrPayrollRunItemTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  run_id: number;
  employee_id: number;
  contract_id: number | null;
  base_salary: number;
  allowance_amount: number;
  deduction_amount: number;
  loan_deduction_amount: number;
  gross_pay: number;
  net_pay: number;
  status: 'draft' | 'reviewed' | 'approved' | 'excluded';
  notes: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface HrPayrollItemAdjustmentTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  payroll_item_id: number;
  adjustment_type: 'allowance' | 'deduction';
  label: string;
  amount: number;
  notes: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface HrSettingsTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  key: string;
  value: string;
  updated_by: number | null;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface Database {
  _phase1_bootstrap: Phase1BootstrapTable;
  sessions: SessionTable;
  users: UserTable;
  tenants: TenantTable;
  trial_signups: TrialSignupTable;
  settings: SettingTable;
  accounting_accounts: AccountingAccountTable;
  journal_entries: JournalEntryTable;
  journal_entry_lines: JournalEntryLineTable;
  accounting_settings: AccountingSettingsTable;
  audit_logs: AuditLogTable;
  branches: BranchTable;
  stock_locations: StockLocationTable;
  user_branches: UserBranchTable;
  product_categories: ProductCategoryTable;
  suppliers: SupplierTable;
  customers: CustomerTable;
  products: ProductTable;
  product_units: ProductUnitTable;
  product_offers: ProductOfferTable;
  product_customer_prices: ProductCustomerPriceTable;
  product_pricing_profiles: ProductPricingProfileTable;
  pricing_rules: PricingRuleTable;
  product_location_stock: ProductLocationStockTable;
  stock_movements: StockMovementTable;
  stock_transfers: StockTransferTable;
  stock_transfer_items: StockTransferItemTable;
  stock_count_sessions: StockCountSessionTable;
  stock_count_items: StockCountItemTable;
  damaged_stock_records: DamagedStockRecordTable;
  sales: SalesTable;
  sale_items: SaleItemTable;
  sale_line_stock_allocations: SaleLineStockAllocationTable;
  sale_payments: SalePaymentTable;
  held_sales: HeldSaleTable;
  held_sale_items: HeldSaleItemTable;
  customer_payments: CustomerPaymentTable;
  customer_ledger: CustomerLedgerTable;
  expenses: ExpenseTable;
  return_documents: ReturnDocumentTable;
  return_items: ReturnItemTable;
  treasury_transactions: TreasuryTransactionTable;
  cashier_shifts: CashierShiftTable;
  purchases: PurchaseTable;
  purchase_items: PurchaseItemTable;
  supplier_payments: SupplierPaymentTable;
  supplier_payment_schedules: SupplierPaymentScheduleTable;
  supplier_payment_schedule_logs: SupplierPaymentScheduleLogTable;
  supplier_ledger: SupplierLedgerTable;
  services: ServicesTable;
  hr_departments: HrDepartmentTable;
  hr_job_titles: HrJobTitleTable;
  hr_positions: HrPositionTable;
  hr_employees: HrEmployeeTable;
  hr_employee_contacts: HrEmployeeContactTable;
  hr_employee_documents: HrEmployeeDocumentTable;
  hr_employment_contracts: HrEmploymentContractTable;
  hr_compensation_packages: HrCompensationPackageTable;
  hr_employee_loans: HrEmployeeLoanTable;
  hr_employee_loan_installments: HrEmployeeLoanInstallmentTable;
  hr_employee_ledger: HrEmployeeLedgerTable;
  hr_attendance_records: HrAttendanceRecordTable;
  hr_attendance_exceptions: HrAttendanceExceptionTable;
  hr_leave_types: HrLeaveTypeTable;
  hr_leave_requests: HrLeaveRequestTable;
  hr_employee_assets: HrEmployeeAssetTable;
  hr_payroll_runs: HrPayrollRunTable;
  hr_payroll_run_items: HrPayrollRunItemTable;
  hr_payroll_item_adjustments: HrPayrollItemAdjustmentTable;
  hr_hr_settings: HrSettingsTable;
  price_change_runs: PriceChangeRunTable;
  price_change_items: PriceChangeItemTable;
  partner_contacts: PartnerContactTable;
  partner_addresses: PartnerAddressTable;
  cost_centers: CostCenterTable;
  projects: ProjectTable;
  purchase_attachments: PurchaseAttachmentTable;
  manufacturing_boms: ManufacturingBomTable;
  manufacturing_bom_lines: ManufacturingBomLineTable;
  manufacturing_work_orders: ManufacturingWorkOrderTable;
  manufacturing_wo_consumptions: ManufacturingWoConsumptionTable;
  hr_employee_adjustments: HrEmployeeAdjustmentTable;
  offline_releases: OfflineReleaseTable;
  style_code_counters: StyleCodeCounterTable;
}
export interface HrEmployeeAdjustmentTable {
  id: Generated<number>;
  tenant_id: string;
  employee_id: number;
  adjustment_type: string;
  amount_type: string;
  amount: number;
  date: ColumnType<Date, string | undefined, string | undefined>;
  reason: string | null;
  status: string;
  applied_in_run_id: number | null;
  created_by: number;
  updated_by: number;
  created_at: ColumnType<Date, string | undefined, string | undefined>;
  updated_at: ColumnType<Date, string | Date | undefined, string | Date | undefined>;
}

export interface OfflineReleaseTable {
  tenant_id: ColumnType<string, string | undefined, string | undefined>;
  account_id: ColumnType<string, string | undefined, string | undefined>;
  id: Generated<number>;
  version: string;
  changelog: string;
  patch_url: string;
  is_active: boolean;
  promoted_by: string | null;
  promoted_at: ColumnType<Date, string | undefined, string | undefined> | null;
  created_at: ColumnType<Date, string | undefined, string | undefined>;
}
