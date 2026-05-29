import { ColumnType, Generated } from 'kysely';

export interface Phase1BootstrapTable {
  id: Generated<number>;
  created_at: ColumnType<Date, string | undefined, never>;
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
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
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
  key: string;
  value: string;
}

export interface AccountingAccountTable {
  id: Generated<number>;
  code: string;
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
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface JournalEntryTable {
  id: Generated<number>;
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
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface JournalEntryLineTable {
  id: Generated<number>;
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
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
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

export interface UserBranchTable {
  id: Generated<number>;
  user_id: number;
  branch_id: number;
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
  item_kind: ColumnType<'standard' | 'fashion', 'standard' | 'fashion' | undefined, 'standard' | 'fashion' | undefined>;
  style_code: string | null;
  color: string | null;
  size: string | null;
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
  offer_type: 'percent' | 'fixed' | 'price';
  value: number;
  min_qty: ColumnType<number, number | undefined, number>;
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



export interface ProductPricingProfileTable {
  id: Generated<number>;
  product_id: number;
  pricing_group_key: string | null;
  pricing_mode: 'standard' | 'inherit' | 'manual';
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface PricingRuleTable {
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
  notes: string;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface ProductLocationStockTable {
  id: Generated<number>;
  product_id: number;
  branch_id: number | null;
  location_id: number | null;
  qty: number;
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
  payment_channel: 'cash' | 'card' | 'wallet' | 'instapay' | 'mixed' | 'credit';
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
  payment_channel: 'cash' | 'card' | 'wallet' | 'instapay';
  amount: number;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface HeldSaleTable {
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


export interface ExpenseTable {
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
  id: Generated<number>;
  return_document_id: number;
  product_id: number | null;
  product_name: string;
  qty: number;
  unit_total: number;
  line_total: number;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface TreasuryTransactionTable {
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
  return_document_id: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}


export interface PriceChangeRunTable {
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
  return_document_id: number | null;
  branch_id: number | null;
  location_id: number | null;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface HrDepartmentTable {
  id: Generated<number>;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrJobTitleTable extends HrDepartmentTable {}

export interface HrPositionTable extends HrDepartmentTable {
  department_id: number | null;
  job_title_id: number | null;
  branch_id: number | null;
  location_id: number | null;
}

export interface HrEmployeeTable {
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
  notes: string;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrEmployeeContactTable {
  id: Generated<number>;
  employee_id: number;
  contact_type: string;
  value: string;
  label: string;
  is_primary: boolean;
  notes: string;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrEmployeeDocumentTable {
  id: Generated<number>;
  employee_id: number;
  title: string;
  document_type: string;
  file_url: string;
  expiry_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  notes: string;
  uploaded_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrEmploymentContractTable {
  id: Generated<number>;
  employee_id: number;
  contract_no: string;
  contract_type: string;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  start_date: ColumnType<string, string | undefined, string | undefined>;
  end_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  base_salary: number;
  currency: string;
  notes: string;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrCompensationPackageTable {
  id: Generated<number>;
  employee_id: number;
  contract_id: number | null;
  package_name: string;
  allowance_amount: number;
  deduction_amount: number;
  effective_from: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  effective_to: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  notes: string;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrEmployeeLoanTable {
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
  notes: string;
  approved_by: number | null;
  approved_at: Date | null;
  disbursed_by: number | null;
  disbursed_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrEmployeeLoanInstallmentTable {
  id: Generated<number>;
  loan_id: number;
  installment_no: number;
  due_date: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  paid_at: Date | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrEmployeeLedgerTable {
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
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrAttendanceExceptionTable {
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
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrLeaveTypeTable {
  id: Generated<number>;
  name: string;
  code: string | null;
  description: string | null;
  is_paid: boolean;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrLeaveRequestTable {
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
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrEmployeeAssetTable {
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
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrPayrollRunTable {
  id: Generated<number>;
  period_month: string;
  status: 'draft' | 'reviewed' | 'approved' | 'cancelled';
  notes: string;
  created_by: number | null;
  reviewed_by: number | null;
  approved_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  reviewed_at: Date | null;
  approved_at: Date | null;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrPayrollRunItemTable {
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
  notes: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export interface HrPayrollItemAdjustmentTable {
  id: Generated<number>;
  payroll_item_id: number;
  adjustment_type: 'allowance' | 'deduction';
  label: string;
  amount: number;
  notes: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface HrSettingsTable {
  key: string;
  value: string;
  updated_by: number | null;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
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
  supplier_ledger: SupplierLedgerTable;
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
}
