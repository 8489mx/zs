# Backend Migration Phase 2 Schema Design (PostgreSQL + Kysely)

## Scope used for design
This schema is based on the **actual current backend** table behavior in:
- `src/db/schema/*.sql`
- `src/db/setup/schema.js` (runtime column evolution)
- transaction/accounting services that write/read sales, purchases, ledgers, payments, stock movement, and treasury flows.

No business module migration is included in this phase.

## Table strategy
The migration introduces a direct relational model compatible with current behavior:

1. **Identity + security core**
   - `users`, `sessions`, `settings`, `app_state`, `backup_snapshots`
2. **Branching and stock topology**
   - `branches`, `stock_locations`
3. **Catalog and counterparties**
   - `suppliers`, `customers`, `product_categories`, `products`, `product_units`, `product_offers`, `product_customer_prices`
4. **Inventory operations**
   - `stock_transfers`, `stock_transfer_items`, `stock_count_sessions`, `stock_count_items`, `damaged_stock_records`, `stock_movements`
5. **Sales / checkout / held drafts**
   - `sales`, `sale_items`, `sale_payments`, `held_sales`, `held_sale_items`
6. **Purchasing and returns**
   - `purchases`, `purchase_items`, `returns`
7. **Financial ledgers and cash**
   - `customer_payments`, `supplier_payments`, `customer_ledger`, `supplier_ledger`, `treasury_transactions`, `cashier_shifts`, `expenses`, `services`
8. **Auditability**
   - `audit_logs`

## Constraints and quality decisions
- Primary keys on all tables.
- Foreign keys for every existing relational dependency from current behavior.
- Uniqueness:
  - case-insensitive unique username (`UNIQUE (LOWER(username))`)
  - category name unique
  - product barcode unique (nullable)
  - customer-specific product price unique pair
  - branch/location name unique per branch
- Integrity checks kept where existing behavior already enforces strict values:
  - user role values
  - return type
  - offer type
  - app state singleton row (`id = 1`)
  - transfer from/to location difference
- Amount/quantity columns converted from SQLite `REAL` to PostgreSQL `NUMERIC`.
- Timestamps converted to `TIMESTAMPTZ` with `NOW()` defaults.

## Index strategy
Indexes are carried over from existing SQLite setup plus schema-consistent naming, including:
- session lookup/expiry
- user lock/default branch
- sales and purchases timelines/status/customer/supplier
- transfer, stock movement, stock count, damaged stock access paths
- payments and ledgers by entity/time
- treasury/cashier/audit/service chronology

## Transaction-critical tables and flows
1. **Sales posting/cancellation flow**
   - `sales`, `sale_items`, `sale_payments`, `stock_movements`, `customer_ledger`, `treasury_transactions`
2. **Purchasing flow**
   - `purchases`, `purchase_items`, `stock_movements`, `supplier_ledger`, `treasury_transactions`
3. **Credit settlement flow**
   - `customer_payments` + `customer_ledger`, `supplier_payments` + `supplier_ledger`
4. **Inventory control flow**
   - `stock_transfers` + items, `stock_count_sessions` + items, `damaged_stock_records`, `stock_movements`
5. **Cash control flow**
   - `cashier_shifts` + `treasury_transactions`

## Assumptions
- Existing runtime semantics around `status`, `entry_type`, `reference_type`, and `payment_type` remain text-based to avoid Phase 2 behavior changes.
- `branch_ids_json` and `permissions_json` remain JSONB arrays to preserve current behavior.
- Document numbers (`doc_no`) are **not globally forced unique** in this phase to avoid breaking legacy/import edge cases.

## Known risks
- Some legacy flows may allow historical null/optional references that are preserved; stricter constraints are deferred to later data-cleaning phases.
- Cross-table consistency rules (for example, balancing treasury vs ledgers) are still application-level invariants, not database triggers, in this phase.
- The migration creates a broad schema baseline; additional incremental migrations may be needed once production data profiling is completed.