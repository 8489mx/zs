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


## Coverage continuation — 2026-10-25 (code review only; not release acceptance)

**Reviewed retail branch HEAD before this addendum:** `8cdef15e6e03e067937ea5408ceb7710be0f0b9f`. Base `main` was inspected; concurrent security branch remains isolated. The initial table's `12` fixes refer ONLY to the original reviewed checkpoint. The follow-up produced additional code patches and written regressions; do not interpret the total number of commits as the number of independent defects.

### New confirmed source-code faults addressed after the original 12

| Axis | Additional defect / outcome | Exact principal code paths | Verification |
| --- | --- | --- | --- |
| A/F | Barcode printing could use unsaved scanned/generated content, an unrelated unit, or an incomplete paginated set of model variants; now uses saved barcodes and full active model sibling lookup, with fail-closed errors | `ProductBarcodeDialog.tsx`, `product-barcode-print.helpers.ts` | New spec written; no print hardware test |
| A/F | Matrix showed only first SKU for duplicate color/size, hiding inventory; now shows aggregate and warns about duplicates, no stock merge | `ProductsMatrixView.tsx`, `products-matrix.helpers.ts` | New spec written |
| A/F | Potential conditional hook order in barcode dialog corrected | `ProductBarcodeDialog.tsx` | Static review only |
| B/E | Instant exchange's serial validator could throw outside the UI catch and allow duplicate/foreign serials into request preparation; now validates and reports before booking | `PosInstantExchangeDialog.tsx`, `pos-exchange-serial-validation.ts` | New spec written |
| C/E | Drawer review listed **gross sale return** as cash outflow even for mixed/card/store-credit refunds. It now lists only treasury cash refund legs actually linked to the shift | `cash-drawer.service.ts`, `cash-drawer.helper.ts` | Backend regression authored |
| D | An empty location snapshot could expand a warehouse count to the entire company's catalog; unavailable data previously defaulted to empty. Now location-specific and fail-closed | `InventoryComposerCards.tsx`, `InventoryWorkspace.tsx`, `count-location-scoping.ts` | New spec written |
| D | Manual stock count used company-total expected quantity instead of selected warehouse, now queries same location snapshot | `useInventoryWorkspaceController.ts` | Unit examples authored |
| D/A | Counting a shared clothing model code selected arbitrary first size; scanner now uses distinct persisted SKU/unit barcodes | `count-barcode-identity.ts`, `InventoryComposerCards.tsx` | New spec written |
| D/A | Unit barcode counter ignored carton multiplier; scanned counts now convert to base quantity, rejecting same-code units with contradictory multipliers | `count-barcode-identity.ts` | New spec written |
| E/F | Previous return quantities were computed from a **filtered/paginated** register and merged repeated product lines. New tenant-scoped invoice history uses original sale/purchase line IDs and blocks unlinked historical rows | `returns.service.ts`, `return-invoice-quantities.helper.ts`, `ReturnsWorkspace.tsx` | Backend and UI specs written |
| E/F | A lost return response could prompt a second refund under a NEW idempotency key; preserve a frozen request/key in mounted UI, query operation status and disallow resetting unresolved attempts | `ReturnsWorkspace.tsx`, `return-submission-recovery.ts` | New spec written; reload still needs recovery drill |
| E/F | Purchase returns reset to sale mode after success/reset; selected mode now follows route | `returns-workspace.helpers.ts` | New spec written |
| E/F | Saved selected return quantity could exceed newly refreshed historical balance; pre-commit UI validation now blocks confirmation, backend still locks/checks | `return-remaining-quantity.ts`, `ReturnsCreateModal.tsx` | New spec written |
| F | Largest-stock-location column relied on database row order; now sorted by actual quantity | `reports-inventory.helper.ts` | Existing regression extended |
| F | Inventory report hid site totals greater than company stock and did not show unassigned remainder alongside assigned sites; shows reconciliation warning and unresolved stock | `reports-inventory.helper.ts`, `InventoryReportSection.tsx` | Existing regression extended |

All rows above describe **code changed**, not verified operation. Count as **15 additional defect themes** (original 12 + 15 documented themes = **27 cumulative documented themes**); note that themes group multiple related source changes, and this is not an exhaustive system defect count. Distinct concurrent changes (POS offline catalog and backend quantity aggregation hardening) were also observed, but are **not** counted as independently reviewed closure here.

### Revised A–F status and remaining source scope

| Axis | Updated evidence coverage | Still unverified / incomplete |
| --- | --- | --- |
| **A — PARTIAL** | Fashion editor/safety, sizes/colors, label dialog, matrix and full model print lookup, barcode collisions | Bulk import/export and unit conversion end-to-end; large inventory/branch matrices; promotions/cost/valuation across variants; actual barcode printers |
| **B — PARTIAL** | POS checkout and offline sync paths previously traced; exchange serial preflight and recent offline catalog code changes identified | All tax/discount combinations, returns with partial tender, ECR/Fawry/Geidea, offline crash/restart reconciliation, device performance |
| **C — PARTIAL** | Shift opening and close/read code previously inspected; itemized sale cash returns corrected | Blind close supervisor approval end-to-end, cash/supplier settlement journals, multi-shift cancellation and financial reconciliation fixtures |
| **D — PARTIAL** | GRN explicit warehouse safety, selected warehouse count scope, barcode scan quantities and expected-location balances; count posting service reviewed | Physical recount/posting/rollback and serial traceability, transfers with in-transit shortage/cancel, combined reservations/COGS across sites, stock report matching real DB |
| **E — PARTIAL** | Sale/purchase return transaction entrypoints, full invoice historical quantity read, frozen keyed retry and UI preflight, exchange serial validation | Card processor reversal settlement, accounting journal parity across mixed tenders, partial legacy returns reconciliation, idempotency after page/browser restart, full crash concurrency |
| **F — PARTIAL** | POS exchange, apparel editor and barcode dialog, report matrix, cash review and return modal quality fixes | Exhaustive RTL and screen-size accessibility, modal focus/keyboard, 14-inch and kiosk operation, printer/Electron devices and high SKU load profiling |

### Integration and verification gates

- **No tests, typecheck, build, guard suite, manual POS scenario or deploy executed.** Unit and backend tests listed in the domain docs are **written only**. No row above is a runtime sign-off.
- Review status JSON intentionally unchanged: the evidence policy requires executed verification evidence before promotion.
- The concurrent `fix/platform-core-security-audit-20261025` branch owns `backend/src/modules/reports/reports.service.ts`, `backend/src/modules/sales/services/price-lists.service.ts`, central accounting, auth and migration work. No core-pricing or ledger workaround was added here; post-merge financial fixtures and SQL tenant/branch isolation checks are mandatory. Do not merge either branch blindly.
- Code review cannot certify bank/card refunds, ECR terminal reversals, receipt printers, physical warehouse differences or fiscal compliance. These remain explicit release blockers.

**Current conclusion:** incomplete A–F audit, all axes **PARTIAL**, release **BLOCKED** pending remaining code traces, authored-test execution, accounting fixtures and device UAT. No merge to `main`; no deploy.
