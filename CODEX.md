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

---

## 3. Git Status & Current State
- **Branch:** `audit/work`
- **Latest Commit:** `f5fe9f67` (`fix(frontend): safe requestIdleCallback and setTimeout types in route-prefetch`)
- **CI Status:** **100% Green Success** (GitHub Actions run `37040964380`: Frontend `Build & Type-check` + Backend `Guards & E2E`).

---

## 4. Pending / Next Steps for the Next Chat Session

### Immediate Action 1: Deploy to Production
Merge `audit/work` into `main` and push to trigger automated production deployment on Oracle Cloud VPS:
```bash
git checkout main
git pull origin main
git merge audit/work
git push origin main
```

### Next Hardening Scope (Sector 3 & Final Operational Hardening):
1. **Customer Credit Limits Concurrency Lock (`sales-write.service.ts` / `sales-finance.service.ts`):**
   - Ensure `customers` row is locked (`FOR UPDATE`) before checking `customer.credit_limit` and updating `balance`, preventing two concurrent cashiers from simultaneously exceeding credit limits.
2. **Inter-Treasury Cash Transfers (`treasury.service.ts`):**
   - Enforce canonical lock ordering (sorted by ID) when transferring cash between cashboxes/safes/banks to eliminate deadlock hazards.
   - Enforce non-negative treasury balance invariants.
3. **Customer Installments Schedule Reconciliation (`customer-installments.service.ts`):**
   - Ensure `SUM(installments.amount) === principal` with zero floating-point penny drift.
   - Anti-double-payment lock on installment payments.
4. **Live Transactional Concurrency Stress Spec (`multi-tenant-1000-scale.spec.ts`):**
   - Add unit/in-memory concurrency execution that tests concurrent POS sales and stock deductions across 10 simulated tenants.

*(Note: Heavy vertical modules like Contracting IPC and Maritime Freight were previously audited and have dedicated test suites in `backend/test/critical/contracting-*.spec.ts`).*
