# ZS ERP — Retail POS & Clothing Audit | 2026-10-25

**Branch:** `fix/retail-clothing-complete-audit-20261025`  
**Base `main` at branch creation:** `3b7e4619c4e66817c79036f70c2fde7f2795206f`  
**Last source-code commit before this report:** `396b957fed0dd95d7b2193b22672f20b89f3937d`  
**Decision: مراجعة غير مكتملة — NOT release-ready.**

## Scope, safety and workflow

This is an **evidence and coverage report**, not a release sign-off. Source code was fetched through the GitHub connector and fixes were committed directly to the isolated branch. Tests, Build, Typecheck, Guards, migrations and manual runtime scenarios were **not run**, as requested. `main` was not modified and no production deploy was performed. The security audit concurrently operates on `fix/platform-core-security-audit-20261025`; its core-auth, finance, reports, shared pricing, migrations, backup and transfer files were not edited here.

The initial comparison showed the security branch 18 commits ahead of `main`; a later comparison showed 28 commits ahead. The two branches had **no directly overlapping changed files** as of that comparison, but pricing, accounting, auth and report behavior still require **post-integration functional revalidation**.

## Confirmed issues patched in code, not runtime-verified

| Severity | Issue identified in source | Patch and protection |
|---|---|---|
| P0 | Saving a fashion group sent stale stock for **unchanged rows**, which could undo a later POS sale | UI now omits untouched `stock`; explicit changes carry `expectedStock`; locked transaction validates snapshot and rejects stale updates |
| P0 | A 409/422 in atomic POS exchange could discard idempotency key despite a pending/committed attempt | Preserve original key and payload; consult operation status; reject closing an unresolved exchange dialog |
| P1 | Merge/zero of removed clothing variant could operate on **reserved or unreconciled** balances | Reject reserved/mismatched stock and require reconciliation |
| P1 | Merging variants with different inventory costs could change valuation without a journal | Block mismatched-cost consolidation |
| P1 | Opening-stock journal for newly added fashion sizes could reference an unresolved location | Post using `resolvedWarehouseId` rather than absent input value |
| P1 | Fashion and archive stock mutations could bypass inventory permission | Require `canAdjustInventory` and preflight before opening-account provisioning |
| P1 | Fashion stock mutation initially used `assertLocationScope` default read permission | Require write scope for stock-changing saves and for actual locations of removed variants |
| P1 | Stock consolidation could target a new, unsaved variant and silently skip transfer | Require a persisted destination, align selection in UI and API |
| P1 | Explicitly invalid goods-receipt warehouse could silently fall back to another location | Reject `GRN_LOCATION_NOT_FOUND`, keep fallback only when location was omitted |
| P2 | Ordinary product edit with no new warehouse could clear default location | Retain existing `default_location_id` |
| P2 | Non-fashion rows accepted at fashion-group endpoint before later validation | Explicitly enforce `itemKind='fashion'` |
| P2 | UI announced successful consolidation before the server had posted it | Label as prepared/pending Save, not complete |

**Counts for this specific confirmed-and-patched list:** P0=2, P1=7, P2=3 (total 12). Not a claim that all code issues across retail have been found. All 12 have code patches, **0 have completed runtime validation**.

## Coverage checklist — A–F

Status meanings: **PARTIAL** = named source paths and callsites inspected, but not all screens/business paths, data shapes, concurrency cases and reporting were traced. **NOT COMPLETED** = important requested workflows still not covered. No A–F family is marked complete.

### A. Clothing & Fashion — PARTIAL

**Inspected / modified:**
- `frontend/src/features/products/components/workspace-sections/FashionGroupEditorCard.tsx`: model edit matrix, color/size generation, barcode/SKU handling, row removal, zero/merge UI, stock-adjustment refresh, pricing.
- `frontend/src/features/products/components/workspace-sections/FashionGroupEditorCard.helpers.ts`: draft mapping, pricing baseline, duplicate checks, stock payload.
- `frontend/src/features/products/components/FashionVariantsBuilder.tsx` and `frontend/src/features/products/lib/fashion-variants.utils.ts`: introductory path/utility inspection.
- `backend/src/modules/catalog/services/catalog-product.service.ts`: group save, product create/update, archive, barcode/SKU checks, opening inventory; `backend/src/modules/catalog/dto/upsert-product.dto.ts`; `backend/src/modules/catalog/catalog.controller.ts`.
- `backend/src/modules/inventory/services/inventory-scope.service.ts`: actual read vs write location access.

**Still missing detailed verification:** bulk CSV imports/exports, barcode/label printing and hardware, all cross-branch variant balances, comprehensive stock counts/reservations, line-price/promotions matrix and thousands-of-SKU performance, all clothing sales/profit reporting combinations.

### B. Retail POS — PARTIAL

**Inspected:** `frontend/src/features/pos/api/pos.api.ts`, `frontend/src/features/pos/hooks/usePosSaleMutation.ts`, `frontend/src/features/pos/hooks/usePosOfflineSync.ts`, `frontend/src/features/pos/lib/pos-offline-sync.ts`, `frontend/src/features/pos/lib/pos-checkout-integrity.ts`, `frontend/src/features/pos/components/pos-workspace/PosCheckoutDialog.tsx`, `backend/src/modules/sales/sales.controller.ts`, `backend/src/modules/sales/services/sales-write.service.ts`, `backend/src/modules/sales/engines/sale-tender.engine.ts`.

**Inspected behaviors:** keyed sale submission and recovery, offline queue durability and status reconciling, request/transaction and stock locks, split tender validation, checkout modal handling after terminal approval.

**Not completed:** all price-list/offers/discounts/taxes/e-receipts/reprints/refunds, cloud-vs-Electron operational sync, hardware terminal ECR reconciliation, power loss and database crash drills. Security branch edits `backend/src/modules/sales/services/price-lists.service.ts`; it is explicitly outside this branch's edit ownership.

### C. Cashier Shifts / Cash Drawer — PARTIAL

**Inspected:** `backend/src/modules/cash-drawer/cash-drawer.service.ts` opening (cashier/branch lock), drawer transaction recording, expected cash, closing with row lock, blind close review entrypoints. No change applied.

**Not completed:** all shift settlement journals, multi-branch shift reports, duplicate cash-event replay, supervisor approvals and blind close UX and device testing.

### D. Purchases & Inventory — PARTIAL

**Inspected / modified:** `backend/src/modules/purchases/services/goods-receipt.service.ts` supplier/location validation, draft receipt and postGRN inventory and moving-average costing; `backend/src/modules/purchases/dto/goods-receipt.dto.ts`; `frontend/src/features/purchases/api/goods-receipts.api.ts`. Also inspected `backend/src/modules/purchases/services/purchases-write.service.ts`, `backend/src/modules/inventory/services/inventory-transfer.service.ts` (send/receive/transit loss), `backend/src/modules/inventory/services/inventory-count.service.ts` listing, and `backend/src/modules/inventory/inventory.controller.ts`. Fixed only commerce-owned explicit GRN warehouse selection.

**Not completed:** thorough purchase returns/receipts, transfer cancellation and full counts/variance, branch-level per-variant cost and COGS validation, reservation and simultaneous transactions across all paths.

### E. Returns / Exchanges — PARTIAL

**Inspected / modified:** `backend/src/modules/returns/returns.service.ts` sale returns, original-sale locks, partial quantity checks, payment-method allocations, inventory receipt by originating allocation, supplier purchase return settlement; `backend/src/modules/returns/returns.controller.ts`, `backend/src/modules/returns/dto/create-return.dto.ts`; `frontend/src/features/returns/components/ReturnsCreateModal.tsx` (partial); `frontend/src/features/pos/components/pos-workspace/PosInstantExchangeDialog.tsx` (repaired idempotency recovery).

**Not completed:** complete payment refund lifecycle, physical bank/card reversal, exchange value/tax roundings across scenarios, returns UX and all accounting postings end-to-end.

### F. Screens & UX — PARTIAL

**Inspected/modified:** clothing size/color editor and instant POS exchange, checkout modal and returns create modal segments. Fixed premature stock-merge success and risky exchange closing.

**Not completed:** systematic usability/accessibility review for all POS, clothing and commerce screens; small POS displays, Arabic RTL, low-spec Electron, virtualized search at full catalog scale.

## Accounting and security integration

Traced selected calls from clothing opening balances, sales, GRN posting, sale/purchase returns and transfer shortfall to `AccountingPostingService`; inspected selected source transactions/tenant checks. **Did not independently validate the central accounting ledger, account numbers, reconciliations or the reports against database fixtures.** The concurrent security branch modifies accounting and reports, so cross-branch regressions must be checked after integration. No confirmed cross-core defect has been promoted as closed or patched by this branch.

## Regression tests added — WRITTEN ONLY, NOT EXECUTED

- `backend/test/critical/fashion-stock-safety.spec.ts`: reserved/mismatched stock, cost mismatch, stock snapshot freshness, location access policy.
- `frontend/src/features/products/components/workspace-sections/FashionGroupEditorCard.helpers.spec.ts`: omit untouched stock, preserve expected balance, persisted consolidation target.
- `frontend/src/features/pos/components/pos-workspace/pos-exchange-recovery.spec.ts`: processing/committed/recovery status and idempotency key retention.
- `backend/test/critical/grn-explicit-location.spec.ts`: invalid explicit warehouse vs omitted-location fallback.

No test results exist for this work. No build/typecheck/guard/migration runs were performed.

## Remaining blockers and next verification

1. Complete full trace of every A–F operation, including SKU/variant reporting, all price paths, POS shift settling and all merchandise returns, with file-by-file checklist.
2. Add end-to-end transaction/accounting fixtures for sales, purchase receipts, returns, exchanges, stock adjustment, transfers and full/partial failed payment recovery.
3. Run tests, build, typecheck and security checks **only when user lifts the current no-execution rule**, then investigate any failures.
4. Integrate the parallel security/accounting/report changes without overwriting them, rerun affected regressions, inspect Electron offline recovery and external terminal behavior in a safe test environment.
5. Do not advertise the module as ready for sale until these blockers are cleared.

**Conclusion:** **مراجعة غير مكتملة**, notwithstanding the five pushed source fix commits and no observed overlapping changed files with concurrent security work.
