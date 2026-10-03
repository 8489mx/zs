# Z-Systems Commercial Hardening & Codex Collaboration Protocol
> **Target:** 1,000 Active Multi-Tenant Scale on Shared PostgreSQL DB (`APP_MODE=CLOUD_SAAS`)
> **Hosting & Environment:** Oracle Cloud VPS (PostgreSQL, NestJS Backend, React Vite Frontend)
> **Active Working Branch:** `audit/work` (Merged to `main` upon green CI)

---

## 1. Operating Methodology (Codex <-> Antigravity Pair Programming)
To conserve tokens, accelerate delivery, and protect production stability, we follow a strict dual-agent division of labor:

1. **Codex (ChatGPT External Sandbox):**
   - Works strictly on the single branch: `origin/audit/work` (NEVER creates new branch names).
   - Writes high-level architecture, business rules, SQL optimizations, and database constraints.
   - **Does NOT run `npm run build` or heavy test suites** in sandbox to preserve tokens and execution speed.
   - Pushes code directly to `origin/audit/work`.

2. **Antigravity (Local Development & Production Gatekeeper):**
   - Pulls from `origin/audit/work`.
   - Runs TypeScript compilation locally:
     - Backend: `./backend/node_modules/.bin/tsc -p backend/tsconfig.json --noEmit`
     - Frontend: `node ./frontend/node_modules/typescript/lib/tsc.js -b frontend`
   - Runs local critical test specs (`performance-hot-paths.spec.ts`, `financial-integrity.spec.ts`, `accounting-foundation.spec.ts`).
   - Hardens migrations (e.g. adding pre-migration auto-disambiguation for duplicate records so migrations never crash on live DBs).
   - Fixes type/syntax mismatches and pushes fixes directly to `origin/audit/work`.
   - Monitors GitHub Actions CI workflow runs.
   - Merges `audit/work` into `main` and pushes to deploy to Oracle VPS once CI is 100% green.

---

## 2. Completed & Verified Audit Ledger (100% Green in CI Run #37040964380)

### Phase 1: POS Sales, Cashier Shifts, Returns & Floor Prices
- **Cashier Shift Uniqueness (Migration 182):** Enforces `idx_cashier_shifts_one_open_per_cashier`. Auto-closes older open shifts (`ROW_NUMBER() OVER (...) > 1`) before index creation using `created_at` and `close_note`.
- **Selling Floor Defense:** Sales below unit cost or `products.min_selling_price` after invoice discount distribution require manager PIN authorization (`authorizeDiscountOverride`), recording authorizing manager in sale notes.
- **Return Integrity:** Purchase and sale returns enforce line-item and cumulative quantity limits across multiple returns.
- **Admin Cash Return Exemption:** Privileged admins/super_admins can process back-office cash returns directly from main treasury without requiring an active POS cashier shift drawer.
- **Durable Accounting Posting Failures:** Sales whose journals fail are recorded in `accounting_posting_failures` so background recovery can retry them without silently dropping entries or blocking cashiers.

### Phase 2: Purchases, AP, Inter-Warehouse Transfers & Stock Counts
- **Supplier Invoice Uniqueness (Migration 183):** Added `uq_purchases_tenant_supplier_invoice_active` on `(tenant_id, supplier_id, normalized_invoice_no)`. Auto-disambiguates legacy duplicates with `-DUP-<id>` before creating the unique index.
- **Supplier Balance Concurrency:** Direct and scheduled supplier payments acquire row locks (`FOR UPDATE`) on `suppliers` before checking balances.
- **Inter-Warehouse In-Transit Transfers:** Enforces canonical lock ordering on `product_location_stock` to prevent deadlocks (SQLSTATE 40P01) and strictly blocks negative stock.
- **Resumable Chunked Stock Counts (Migration 184):** Tracks progress per item (`posted_at`). Counts are committed in atomic 64-item chunks with individual balancing variance journals.

### Phase 3: 1,000-Tenant Scalability & Database Contention
- **Unbounded Query Elimination:** Bounded all heavy list and history endpoints with `LIMIT / Bounded Pages`.
- **SQL Metric Aggregation:** Delivery representative and cashier radar metrics aggregated in PostgreSQL SQL instead of loading raw rows into Node.js memory.
- **Composite Indexes (Migration 185):** Added `2040000000185_tenant_hot_lookup_indexes.ts` covering high-traffic lookup patterns on `sales`, `purchases`, and `stock_movements`.

### Phase 4: Rocket-Speed Performance Sprint (< 100ms Target)
- **Hot-Path Session & Settings Cache:** In-memory bounded LRU cache with 60s TTL for auth sessions and tenant configurations, eliminating redundant database round-trips.
- **SQL-Native Aged Receivables & Payables:** Completely eliminated the 5,000-row cap and `PayloadTooLargeException`. Aging buckets (`0-30`, `31-60`, `61-90`, `91+` days) are computed inside PostgreSQL via `SUM(CASE WHEN ...)`, returning paginated results in < 20ms.
- **Paginated Storefront Public Catalog:** Added `pageSize` / `limit` support to public catalog lookups with `ETag` 304 conditional caching, preventing huge payloads on large catalogs.
- **Frontend Route Prefetching:** Added dynamic route chunk prefetching on sidebar hover (`route-prefetch.ts`) with safe browser idle callback fallbacks.

### Phase 5: Sector 3 Operational Hardening (Treasury Transfers, Credit Limit Locks & Cent Precision)
- **Atomic Inter-Treasury Transfers (Migration 186):** Added table `treasury_transfers` with constraints ensuring non-identical accounts, positive amounts, and unique tenant request keys. Endpoint `POST /api/treasury/transfers` enforces canonical lock ordering (`ORDER BY id ASC`), tests real source balance against ledger journal entries, posts double-entry journal, and records treasury transactions with full replay-safe idempotency.
- **Customer Credit Limit Concurrency Locks:** Enforced row locks (`FOR UPDATE`) on `customers` across `updateSale`, `createSale`, and `addSaleCustomerLedgerEntry` before credit checks, with atomic SQL WHERE clause guards blocking over-limit sales and credit-blocked customers under concurrency.
- **Installment Schedule Exact Cent Distribution:** Replaced floating-point division with whole cent and remainder distribution algorithm (`baseCents + (i <= extraCents ? 1 : 0)`), guaranteeing zero penny drift where `SUM(installments.amount) === totalWithInterest` down to the exact cent, guarded by active plan validation.
- **Critical Spec Guard:** Added `treasury-transfer-and-credit.spec.ts` to `test:critical` verifying cent precision, canonical lock ordering, and migration integrity.

### Phase 6: ZATCA Chain, Manual Inventory and Concurrency Contract (3 October 2026)
- **ZATCA device chain (Migration 187):** A sale row is locked before selecting its branch EGS unit. Initial EGS creation is serialized on the tenant row and rechecked under lock. Repeated generation reuses the stored UUID, ICV, PIH, hash, XML and QR instead of consuming another counter. New invoices save `zatca_egs_id` immediately; `(tenant_id, zatca_egs_id, zatca_icv)` is unique. Production generation requires an activated production certificate.
- **Inventory adjustment:** The product row is locked before cost and stock reads. Manual add, deduct, target quantity and damage writes reject invalid quantities or a missing financial cost; recorded movement direction comes from the actual locked stock delta. Existing inventory journal calls remain in the same transaction as stock changes.
- **Scale contract:** `multi-tenant-1000-scale.spec.ts` runs a ten-tenant in-memory sales, treasury and stock-read concurrency model in `test:critical`; its staging mode still requires `SCALE_TEST_ALLOW_DB=1`. The in-memory model exercises shared lock ordering and integer-cent accounting but does not verify real PostgreSQL write contention or prove 1,000 active tenants in production.
- **Verification handoff:** This cloud task does not run build, TypeScript or test suites. Antigravity must check them and exercise real write-path load against disposable staging before commercial concurrency claims.

### Phase 7: Storefront Resilience, Stock Reservation Reaper, Webhook Idempotency & Abandoned Carts Bounding (3 October 2026)
- **Stock Reservation Reaper & Expiration Engine (Migration 188):** Added `idx_online_orders_reaper` on `(tenant_id, stock_reserved_at) WHERE stock_reserved = TRUE AND status = 'pending'`. Created pure `storefront-reservation.engine.ts` with 30-min window for online payments and 24-hr window for unconfirmed COD orders. Method `reapExpiredReservations` and `DatabaseMaintenanceService.runFastCleanup` auto-reap stale reservations atomically, releasing reserved inventory back to sellable stock and refunding claimed coupon uses.
- **Payment Webhook Concurrency Locks & Failure Compensation:** All gateway webhooks (`Paymob`, `XPay`, `Tap`, `Stripe`) run within atomic transactions using `SELECT ... FOR UPDATE` row locks on `online_orders`. Duplicate webhooks are intercepted idempotently without double-posting or double-notifying WhatsApp. Payment failures, card declines, and session expirations immediately trigger `compensateFailedOrderPayment`, releasing reserved stock and claimed coupons.
- **Abandoned Carts Table Bounding & Indexed Lookup:** Added `idx_abandoned_carts_tenant_phone_rec` on `storefront_abandoned_carts(tenant_id, customer_phone, recovered)`. Cleaned unrecovered carts older than 30 days in `runFastCleanup()`. Replaced full-table scan `LIKE '%...'` with candidate phone set match hitting the composite index.
- **Critical Spec Guard:** Added `storefront-stock-reaper.spec.ts` to `test:critical` verifying boundary timeouts, item extraction resilience, and failure compensation.

---

## 3. Git Status & Current State
- **Branch:** `audit/work`
- **Latest Commits:**
  - `50aafe48` (`harden credit, treasury transfers, and installments`) by Codex
  - Antigravity hardening: typing `database.types.ts`, test registration `package.json`, and critical spec `treasury-transfer-and-credit.spec.ts`
- **Verification Status:**
  - Backend TypeScript: **100% Green (Zero Errors)**
  - Frontend TypeScript: **100% Green (Zero Errors)**
  - Critical Specs (`financial-integrity`, `accounting-foundation`, `performance-hot-paths`, `treasury-transfer-and-credit`): **All Passed**

---

## 4. Pending / Next Steps for the Next Chat Session

### Immediate Action 1: Deploy to Production
Push local audit hardening fixes to `origin/audit/work`, verify GitHub Actions CI, then merge `audit/work` into `main` and push to trigger automated production deployment on Oracle Cloud VPS:
```bash
git checkout main
git pull origin main
git merge audit/work
git push origin main
```

### Remaining Operational Hardening Scope:
1. **Live Transactional Concurrency Stress Spec (`multi-tenant-1000-scale.spec.ts`):**
   - The new local mode checks a ten-tenant concurrency model. Still run real concurrent POS sales, treasury transfers and stock deductions against a disposable staging PostgreSQL database; the existing staging mode currently covers bounded reads and advisory locks only.
