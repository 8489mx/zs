# Z-Systems Universal Core ERP & Enterprise Foundation: Deep Architectural & Operational Audit Pack

> **Purpose:** Comprehensive, token-optimized domain blueprint for AI Architects (Claude 3.5 / 3.7 Sonnet / Claude Opus / Domain Experts) to conduct a rigorous operational gap analysis across the **entire core ERP foundation** (Multi-Warehouse Inventory, Supply Chain, Double-Entry Financial Ledger, POS/Omnichannel, HR & Payroll, Fixed Assets, Manufacturing/BOM, Maintenance & Repairs, and Multi-Branch Core Governance), strictly excluding the specialized vertical modules of Contracting (`01`) and Maritime Freight (`02`).

---

## 1. System Persona & Mission Brief

You are a **Principal Enterprise ERP Architect, Fellow Chartered Certified Accountant (FCCA / CPA), IFRS & Tax Compliance Systems Specialist, and Operations Director**.
Your mission is to conduct a ruthless architectural and operational gap analysis of the **Universal Core ERP Foundation** of **Z-Systems ERP**.

Your analysis must cover the foundational horizontal core upon which the enterprise operates:
1. **Supply Chain & Multi-Warehouse Inventory:** Landed cost capitalization, batch/expiry FEFO controls, stock reservation vs. allocation, and negative stock prevention.
2. **Double-Entry Financial Invariants:** Automatic journal entry generation, perpetual vs. periodic inventory accounting, COGS timing, foreign currency revaluation (IAS 21), and tamper-evident cryptographic audit logs.
3. **Point of Sale (POS) & Cash Control:** Blind shift closures, cash drawer variance control, float reconciliation, offline synchronization, and omnichannel inventory locks.
4. **Credit Risk & Working Capital:** Accounts Receivable (AR) aging, credit limits, 3-way matching for Accounts Payable (AP), and unallocated payment vouchers.
5. **Human Resources & Payroll (HR):** Automated payroll computation, loans/advances deduction, employee custody management, end-of-service indemnities, and WPS/SIF banking exports.
6. **Fixed Assets & Depreciation:** Asset capitalization, depreciation schedules (Straight-Line & Double Declining Balance), asset retirement, and automated monthly GL posting.
7. **Manufacturing & Light Assembly (MRP):** Bill of Materials (BOM), work orders, work center routing, machine hour absorption, and scrap accounting.
8. **Maintenance & Technical Services:** Service tickets, IMEI/serial tracking, spare parts consumption, and conversion to commercial invoices.
9. **Core Governance & Multi-Tenancy:** Granular RBAC, multi-branch data isolation, 16-preset industry modular switcher, and universal document numbering standards (`PREFIX-YYMMDD-XXXX`).

---

## 2. Core Database Schema & Entities

The core system operates on PostgreSQL via the following normalized tables:

1. `products`, `product_variants` & `product_units`:
   - `id`, `sku`, `barcode`, `name_ar`, `name_en`, `category_id`, `brand_id`, `base_unit` (e.g. piece), `purchase_unit`, `sale_unit`, `unit_conversion_factor` (e.g. 1 carton = 24 pieces), `cost_price` (weighted average), `selling_price`, `min_selling_price`, `reorder_level`, `track_inventory` (boolean), `has_batches` (boolean), `has_serials` (boolean), `tax_rate` (default 14% or 15%).
2. `inventory_transactions` & `stock_levels`:
   - Immutable perpetual inventory ledger.
   - `warehouse_id`, `product_id`, `variant_id`, `batch_number`, `expiry_date`, `serial_number`, `transaction_type` (`purchase_receipt`, `sale_delivery`, `transfer_out`, `transfer_in`, `stock_adjustment_in`, `stock_adjustment_out`, `production_consume`, `production_yield`), `quantity`, `unit_cost`, `total_cost`, `reference_type`, `reference_id`, `balance_after`.
3. `purchase_orders`, `purchase_invoices` & `purchase_landed_costs`:
   - Procurement pipeline (`PO-YYMMDD-XXXX` / `PINV-YYMMDD-XXXX`).
   - `supplier_id`, `warehouse_id`, `currency`, `exchange_rate`, `subtotal`, `tax_total`, `discount_total`, `landed_cost_total`, `total_amount`, `paid_amount`, `payment_status` (`unpaid`, `partial`, `paid`), `status` (`draft`, `approved`, `received`, `cancelled`).
4. `sales_orders` & `sales`:
   - Sales pipeline (`SO-YYMMDD-XXXX` / `INV-YYMMDD-XXXX`).
   - `customer_id`, `warehouse_id`, `price_list_id`, `salesperson_id`, `delivery_status` (`pending`, `picked`, `delivered`), `payment_term` (`cash`, `credit`, `installments`), `subtotal`, `tax_total`, `discount_total`, `delivery_fee`, `total_amount`, `paid_amount`, `cost_of_goods_sold` (COGS), `payment_status`, `zatca_uuid`, `zatca_hash`, `zatca_status` (`cleared`, `reported`, `rejected`).
5. `cashier_sessions` & `cash_drawer_transactions`:
   - Point of Sale cash management.
   - `session_number`, `cashier_user_id`, `pos_terminal_id`, `opened_at`, `closed_at`, `opening_float`, `total_cash_sales`, `total_card_sales`, `total_cash_in`, `total_cash_out`, `expected_cash_drawer`, `counted_cash_drawer`, `variance_amount` (surplus / shortage), `status` (`open`, `closed_balanced`, `closed_with_variance`).
6. `chart_of_accounts`, `journal_entries` & `journal_entry_lines`:
   - Double-Entry General Ledger.
   - Accounts hierarchy (Assets, Liabilities, Equity, Revenue, Expenses).
   - `journal_entries`: `entry_no` (`JRN-YYMMDD-XXXX`), `entry_date`, `source_type` (`sales_invoice`, `purchase_invoice`, `pos_shift`, `payment_voucher`, `depreciation`, `payroll`), `source_id`, `status` (`draft`, `posted`, `cancelled`), `reversed_by_entry_id`, `reversal_of_entry_id`.
   - `journal_entry_lines`: `journal_entry_id`, `account_id`, `cost_center_id`, `debit`, `credit`, `partner_type`, `partner_id`, `description`.
7. `fixed_assets` & `asset_depreciation_logs`:
   - `code`, `name`, `asset_category`, `purchase_date`, `purchase_cost`, `salvage_value`, `useful_life_months`, `depreciation_method` (`straight_line`, `double_declining`), `accumulated_depreciation`, `book_value`, `asset_account_id`, `depreciation_account_id`, `expense_account_id`, `status` (`active`, `fully_depreciated`, `disposed`).
8. `employees`, `attendance`, `payroll_runs` & `hr_employee_assets`:
   - `employee_code`, `full_name`, `basic_salary`, `housing_allowance`, `transport_allowance`, `other_allowances`, `bank_account_iban`, `bank_swift`, `hire_date`, `department_id`, `status`.
   - `payroll_runs`: `period_month`, `period_year`, `total_gross`, `total_deductions`, `total_net`, `status` (`draft`, `approved`, `paid`, `posted_to_gl`).
   - `hr_employee_assets`: Custody tracking (`laptop`, `car`, `phone`, `cash_float`) with return condition and salary deduction linkage.
9. `manufacturing_boms`, `manufacturing_work_orders` & `manufacturing_work_centers`:
   - `bom_number`, `finished_product_id`, `yield_quantity`, `raw_materials_cost`, `overhead_cost`, `total_standard_cost`.
   - `work_orders`: `wo_number`, `bom_id`, `planned_quantity`, `produced_quantity`, `status` (`draft`, `in_progress`, `completed`, `cancelled`), `actual_start`, `actual_end`.
   - `work_centers`: `code`, `name`, `hourly_cost_rate`, `capacity_hours_per_day`.
10. `maintenance_orders` & `maintenance_items`:
    - `ticket_number`, `customer_id`, `device_brand`, `device_model`, `serial_or_imei`, `reported_defect`, `spare_parts_cost`, `labor_fee`, `total_cost`, `status` (`received`, `in_inspection`, `in_repair`, `ready`, `delivered`).
11. `tenants`, `branches`, `roles`, `user_permissions` & `settings`:
    - Multi-tenant boundary (`tenant_id`), multi-branch segregation (`branch_id`), 16 industry preset selector, and granular RBAC permissions.

---

## 3. End-to-End Operational Lifecycle (17 Comprehensive Steps)

Here is the complete horizontal operational lifecycle of the core ERP platform:

### Step 1: Master Product & Multi-UOM Definition
- **Current Flow:** Product catalog definition with base unit (e.g. Piece), packaging units (Box of 12, Carton of 144) with dynamic conversion multipliers. Flags whether the product requires Batch Number tracking, Expiry Date tracking, or Unique Serial Numbers.
- **Inputs:** SKU, barcode, unit conversion table, cost price, price tiers.
- **Outputs:** Verified product master record.
- **Audit Probes for Claude:**
  - If a product is sold in cartons but stocked in pieces, how does the system handle split-carton remnants and barcode scans at POS?
  - What valuation method is safest for trading ERPs (Perpetual Moving Average Cost vs. FIFO vs. Standard Cost) under high inflation?

### Step 2: Procurement Pipeline: Purchase Order (PO) to Vendor
- **Current Flow:** User generates Purchase Order (`PO-YYMMDD-XXXX`) to supplier. Records agreed unit cost, currency (USD/EUR/EGP/SAR), expected delivery date, and payment terms. Does NOT affect inventory or financial balances until goods arrive.
- **Inputs:** Reorder level triggers, purchase requisition, supplier price list.
- **Outputs:** Approved Purchase Order document.
- **Audit Probes for Claude:**
  - What approval matrix (based on PO total value or budget limits) should be mandatory before a PO can be officially dispatched to a vendor?

### Step 3: Goods Receipt Note (GRN) & Warehouse Intake
- **Current Flow:** Goods arrive at the warehouse. Warehouse keeper inspects shipments and creates GRN / Purchase Intake. Records received quantities, batch numbers, and expiry dates. Automatically updates stock on hand (`inventory_transactions`).
- **Inputs:** Vendor delivery note, physical inspection, physical count.
- **Outputs:** GRN receipt, increased inventory levels, Batch/Serial tracking registry.
- **Audit Probes for Claude:**
  - What happens if the vendor delivers a quantity higher or lower than the PO (Under-delivery / Over-delivery tolerance %)?
  - How should defective or damaged goods rejected at the receiving bay (Quarantine / Return to Vendor) be isolated without polluting salable stock?

### Step 4: Landed Cost Allocation (Capitalization of Freight, Customs & Clearance)
- **Current Flow:** User records freight shipping bills, customs duties, port handling, and inland transport associated with an imported purchase. System distributes these additional costs across the received items (by Value, by Weight, or by Quantity) to compute the TRUE landed cost per unit.
- **Inputs:** Supplier bill + third-party service bills (freight forwarder, customs broker, port terminal).
- **Outputs:** Capitalized inventory cost, adjusted Moving Average Cost (MAC).
- **Audit Probes for Claude:**
  - If customs duties or clearance bills arrive 30 days AFTER some of the items have already been sold, how should the retroactive landed cost variance be posted (COGS adjustment vs. current inventory)?

### Step 5: Multi-Warehouse Transfers & Transit Logistics
- **Current Flow:** Moving stock between branches or central warehouse to retail stores. Generates Transfer Order. System uses a 2-step transfer:
  - Step 1: Dispatch from Source Warehouse (Stock moves to "In-Transit Warehouse").
  - Step 2: Confirmation & Receiving at Destination Warehouse (Stock moves from "In-Transit" to Salable Stock).
- **Inputs:** Transfer request, source warehouse, destination warehouse.
- **Outputs:** Transfer manifest, in-transit tracking, destination receipt.
- **Audit Probes for Claude:**
  - What happens if 100 units were dispatched from central warehouse, but only 98 units arrive at the retail branch (Transit Loss / Shrinkage)? Who absorbs the variance?

### Step 6: Physical Inventory Cycle Counting & Stock Discrepancies
- **Current Flow:** Warehouse conducts physical cycle counts. System allows Blind Counting (counters do not see expected system stock). Records actual counted quantities. Computes variances (Surplus or Shortage). Upon manager approval, generates stock adjustment vouchers.
- **Inputs:** Physical counts, barcode scanner uploads.
- **Outputs:** Inventory Variance Report, approved Stock Adjustment, Auto-Journal Entry to Inventory Shrinkage Expense / Inventory Surplus Income.
- **Audit Probes for Claude:**
  - How can cycle counting be conducted during active business hours without locking down the entire warehouse (Dynamic snapshot vs. location freeze)?

### Step 7: Sales Order (SO) & Stock Reservation Engine
- **Current Flow:** Sales rep enters customer Sales Order (`SO-YYMMDD-XXXX`). System performs stock reservation:
  - Total Physical Stock = 100.
  - Reserved Stock = 30 (tied to unfulfilled Sales Orders).
  - Available to Promise (ATP) / Salable = 70.
  - Prevents double-selling the same physical inventory to two different customers.
- **Inputs:** Customer order, delivery address, agreed payment terms.
- **Outputs:** Confirmed Sales Order, Soft/Hard reserved stock ledger.
- **Audit Probes for Claude:**
  - What automatic expiry policy should release reserved stock if a customer fails to pay or confirm delivery within a specified hold time (e.g. 48 hours)?

### Step 8: Warehouse Fulfillment: Pick, Pack & Delivery Note
- **Current Flow:** Warehouse generates Picking List. Items collected from bins/pallets. Packed into parcels. System generates Delivery Note (Goods Issue). Deducts reserved stock and physical stock. Records driver/courier details.
- **Inputs:** Approved Sales Order.
- **Outputs:** Pick list, packing slip, Delivery Note / Waybill.
- **Audit Probes for Claude:**
  - For perishable goods or pharmaceuticals, does the picking engine strictly enforce FEFO (First-Expired, First-Out) or FIFO (First-In, First-Out)?

### Step 9: Sales Invoicing, Tax Engine & E-Invoicing (ZATCA / ETA)
- **Current Flow:** Sales Invoice generated (`INV-YYMMDD-XXXX`). Calculates item subtotals, line discounts, VAT tax. Generates cryptographic QR code, UUID, and invoice hash. Ready for ZATCA Phase 2 (KSA) integration or ETA e-Invoicing (Egypt).
- **Inputs:** Delivered items, customer tax ID, price list.
- **Outputs:** Official Tax Invoice, e-Invoice XML payload, signed QR code.
- **Audit Probes for Claude:**
  - What are the strict immutability invariants: Can an e-invoice EVER be edited or deleted once stamped? (Must only be modified via formal Debit Note or Credit Note).
  - In B2B vs. B2C (Simplified) invoices, what different validation rules apply?

### Step 10: POS Cashier Sessions, Cash Drops & Blind Close
- **Current Flow:** Cashier opens POS shift with opening float (e.g. 500 EGP/SAR). System tracks all cash, credit card, and digital wallet sales. Supports Cash Drops (transferring excess cash to central safe during shift). At shift end, cashier performs a "Blind Close" (enters counted cash without seeing system total). System calculates variance (Surplus / Shortage) and prints Z-Report.
- **Inputs:** Opening cash, sales receipts, cash payouts, end-of-shift cash count.
- **Outputs:** Shift Z-Report, Cash Variance Voucher, Cashier Settlement Journal.
- **Audit Probes for Claude:**
  - What happens if a cashier session has a cash shortage of $50? Should it be automatically posted to a "Cashier Deduction / Receivable" account or an "Operational Loss" expense?

### Step 11: Accounts Receivable (AR), Accounts Payable (AP) & Credit Control
- **Current Flow:**
  - AR: Tracks customer balances, credit limits, payment terms (e.g. Net 30), and aging reports (0-30, 31-60, 61-90, 90+ days). Hard-blocks new sales orders if customer exceeds credit limit or has overdue invoices.
  - AP: 3-Way Matching: Verifies Purchase Order vs. Goods Receipt Note (GRN) vs. Supplier Tax Invoice before authorizing payment.
- **Inputs:** Customer payments, supplier payment vouchers, bank reconciliation statements.
- **Outputs:** AR/AP Aging Reports, Payment Receipts, Supplier Remittance Advice.
- **Audit Probes for Claude:**
  - When a customer pays a lump sum (e.g. $10,000 for 5 invoices), how should the system allocate payment (FIFO by oldest invoice vs. specific invoice selection)?
  - How are Withholding Tax (خصم الأرباح التجارية والصناعية) deductions calculated and posted on supplier payments?

### Step 12: Automated Double-Entry General Ledger & Period Closing
- **Current Flow:**
  - Every operational document automatically posts balanced debits and credits:
    - Sales: Dr. Accounts Receivable / Cash, Cr. Sales Revenue, Cr. VAT Payable.
    - COGS: Dr. Cost of Goods Sold (COGS), Cr. Inventory Asset.
    - Purchases: Dr. Inventory Asset, Dr. VAT Input, Cr. Accounts Payable.
  - Trial Balance, Balance Sheet, and Income Statement generated in real-time.
  - Fiscal period closing locks previous months to prevent back-dated alterations.
- **Inputs:** Immutable posted journal entries, depreciation schedules.
- **Outputs:** Trial Balance, Income Statement (P&L), Balance Sheet, Retained Earnings rollover.
- **Audit Probes for Claude:**
  - Under IFRS 15 (Revenue from Contracts with Customers), when should revenue be recognized (Point of Delivery vs. Point of Invoicing)?
  - In foreign currency transactions, how should Unrealized vs. Realized Forex Gain/Loss be recognized at month-end closing?

### Step 13: Human Resources & Automated Payroll Runs (HR & WPS)
- **Current Flow:**
  - Employee Master: Salary components (Basic, Housing, Transport, Allowances).
  - Monthly Payroll Run: Aggregates attendance logs, unpaid leave deductions, overtime hours, active loan/advance deductions, and social insurance contributions.
  - Post-Approval: Generates balanced GL journal entry (Dr. Salaries Expense, Dr. Allowances, Cr. Loans Receivable, Cr. Social Insurance Liability, Cr. Accrued Payroll).
  - Generates WPS/SIF banking file for direct corporate salary disbursement.
- **Inputs:** Attendance logs, approved leave requests, loan repayment schedules.
- **Outputs:** Monthly Payslips, Approved Payroll Run, WPS Banking File, Accrued Payroll GL Entry.
- **Audit Probes for Claude:**
  - How should employee loan installment deductions be prioritized if an employee's net salary after unpaid absence is less than the scheduled monthly loan deduction?
  - What are the legal formulas for End-of-Service Indemnity (EOSB / مكافأة نهاية الخدمة) in Saudi Labor Law vs. Egyptian Labor Law?

### Step 14: Employee Custody, Company Assets & Clearance
- **Current Flow:**
  - Assignment of company-owned assets (laptops, vehicles, smartphones, credit cards, or operational cash floats) to employees.
  - Tracks serial number, asset value, condition upon issuance, and maintenance history.
  - Offboarding / Final Settlement: System checks employee asset custody ledger. If an asset is lost or damaged, cost is deducted from the final settlement voucher.
- **Inputs:** Asset custody request, handover inspection note.
- **Outputs:** Custody Handover Certificate, Clearance Clearance Checklist, Final Settlement Deduction.
- **Audit Probes for Claude:**
  - How should depreciation on employee-assigned equipment (e.g. sales rep laptop or delivery motorcycle) be accounted for when determining the replacement deduction upon loss?

### Step 15: Fixed Assets Lifecycle & Automated Depreciation Scheduler
- **Current Flow:**
  - Acquisition: Asset registered via purchase invoice or direct capitalization voucher.
  - Depreciation Engine: Supports Straight-Line and Double-Declining Balance methods with Salvage Value floor.
  - Monthly Scheduler: Automated cron job runs at month-end, computes monthly depreciation, and generates balanced GL entry:
    - Dr. Depreciation Expense (e.g. 6950)
    - Cr. Accumulated Depreciation (e.g. 1290)
  - Disposal / Retirement: Records asset sale or scrapping, writes off accumulated depreciation, and recognizes Gain/Loss on Asset Disposal.
- **Inputs:** Asset registry, useful life, salvage value, acquisition date.
- **Outputs:** Monthly Depreciation Logs, GL Journal Entries, Asset Net Book Value Schedule.
- **Audit Probes for Claude:**
  - Under IAS 16, what happens when an asset is revalued or its useful life is revised mid-lifecycle? How should the remaining depreciation schedule adjust?

### Step 16: Manufacturing, Light Assembly & Bill of Materials (BOM)
- **Current Flow:**
  - Bill of Materials: Defines component items and quantities required to produce 1 unit of finished good, plus expected scrap % and standard labor/machine hours.
  - Work Order (WO): Issued to production floor.
  - Material Requisition & Issue: Raw materials deducted from "Raw Materials Warehouse" and transferred to "WIP Inventory".
  - Production Completion: Finished goods received into "Finished Goods Warehouse". Actual machine/labor costs absorbed. WIP cleared to Finished Goods Asset.
- **Inputs:** Sales forecast, approved BOM, work center availability.
- **Outputs:** Work Order, Material Issue Note, Finished Goods Intake Note, Production Cost Variance Journal.
- **Audit Probes for Claude:**
  - If actual raw material consumption exceeds standard BOM quantities (Unfavorable Material Usage Variance), how should the variance be posted without distorting the finished good unit cost?

### Step 17: Maintenance & Technical Services Management
- **Current Flow:**
  - Service Ticket: Customer brings in device/equipment (e.g. smartphone, laptop, machinery). System records serial number or IMEI, condition, and reported defect.
  - Inspection & Quotation: Technician inspects, quotes repair labor + required spare parts.
  - Execution: Spare parts issued from inventory (deducted from warehouse). Labor hours logged.
  - Delivery & Billing: Device handed over to customer. Ticket converted into official sales invoice, warranty period recorded, payment collected.
- **Inputs:** Defective device, IMEI/serial, technician diagnostic.
- **Outputs:** Maintenance Ticket, Spare Parts Issue Note, Repair Tax Invoice, Warranty Certificate.
- **Audit Probes for Claude:**
  - How does the system handle warranty claims where spare parts are replaced at zero cost to the customer (Warranty Expense vs. Inventory Asset)?

---

## 4. Key Questions & Deliverables Expected from Claude

When you review this document, please structure your feedback into the following **5 comprehensive deliverables**:

1. **Universal Core ERP Gap Analysis:**
   - A comprehensive checklist of missing operational workflows, internal controls, or regulatory requirements across all 17 steps.
2. **Accounting, Valuation & Timing Traps:**
   - The exact accounting formulas and ledger posting patterns for:
     a) Retroactive landed costs on sold inventory.
     b) Blind POS shift cash variances (Shortage vs. Surplus).
     c) Manufacturing variances (BOM standard vs. actual).
     d) End-of-Service Indemnity (EOSB) accruals.
3. **Credit Risk & Working Capital Controls:**
   - Invariants for credit limit enforcement, 3-way matching rules for procurement, and unallocated customer payment handling.
4. **Supply Chain, POS & Omnichannel Synchronization:**
   - How to prevent race conditions and overselling when physical inventory is accessed concurrently by POS counters, warehouse sales orders, and eCommerce storefronts.
5. **Concrete Database Schema Recommendations:**
   - Specific normalized tables, status enums, foreign keys, or audit columns needed to elevate this horizontal core to Tier-1 ERP standards (SAP B1 / Odoo 17 / NetSuite level).
