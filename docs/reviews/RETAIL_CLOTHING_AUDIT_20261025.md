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


---

# Continued code audit — 25 October 2026 (second session)

**Snapshot reviewed:** \`main\` \`3b7e4619\`; commerce branch \`8cdef15e\` (22 commits ahead of main); separate core-security audit branch 50 commits ahead of main in latest comparison. **No direct overlapping modified paths between the two fix branches in that comparison.** Continue refreshing HEAD because commits are pushed concurrently.

**State: CODE REMEDIATION PARTIAL — NOT CLOSED AND NOT READY FOR DEPLOYMENT.** This continuation used the prior report as its checklist and preserved its first 12 code-patched issues. From \`a73dcf96\` to \`8cdef15e\` there were **16 further commits: 15 named fix commits and one regression-test-only commit**, on the same branch. Cumulatively **20 code-fix commits, 1 prior report commit and 1 standalone test commit** at this snapshot. Those are *commit/batch* counts, not the number of independently verified issues. No test, build, typecheck or migration was run. There are no passing-test results for this work.

## Additional source-confirmed problems addressed

| Section | Risk found | Local fix / tests written |
|---|---|---|
| A/F | Print UI could print unpersisted scan/generated barcode, fall back to wrong unit barcode or print incomplete paginated clothing style variants | Persisted-barcode check, full model fetch and fail-closed, \`product-barcode-print.helpers.spec.ts\` |
| A/F | Matrix could conceal an existing duplicate color/size row; dialog violated React hook order on nullable product | Matrix retains/flags duplicate variants (\`products-matrix.helpers.spec.ts\`); \`ProductBarcodeDialog\` moves memo before nullable return |
| D/F | Warehouse-count empty-location response could fall back to *all company products*; manually selected product expected global rather than warehouse qty | Count scoped to actual location stock map, no fallback for missing snapshot, \`count-location-scoping.spec.ts\` |
| A/D/F | Barcode count chose first size sharing style code; could count packaging barcode as one base piece; conflicting barcodes on one SKU needed rejection | Unique exact product/unit barcode selection, size/model ambiguity guard, unit multiplier, tests \`count-barcode-identity.spec.ts\` |
| E/F | UI used paginated/filtered register to compute prior return quantities and mixed duplicate invoice lines | Full tenant-scoped invoice-specific line totals endpoint + legacy orphan block; backend \`return-invoice-quantities.spec.ts\`, frontend \`return-remaining-quantity.spec.ts\` |
| E/F | UI could submit refund again with a new idempotency key after lost server response; return form reset purchase mode to sale | Immutable per-attempt key/payload, operation status recovery; missing/changed original quantities also block resubmission; tests \`return-submission-recovery.spec.ts\` |
| B/E | Exchange serial errors could throw outside screen error handler, before any operation key | Caught preflight with serial count/identity validation, \`pos-exchange-serial-validation.spec.ts\` |
| C/E/F | Cash-drawer itemized movement showed gross refunds as cash even if actually paid by card/store-credit and/or from another shift | List uses only negative cash treasury legs linked to that specific shift/return; \`cash-drawer-cash-return.spec.ts\` |
| F | Report labelled first SQL row as 'largest warehouse'; site balances exceeding global stock were not flagged; unassigned stock needed explicit location treatment | Sorted warehouse quantities; reconciliation/excess warning and unassigned SKU stock display; \`reports-inventory.helper.spec.ts\` |
| B | Direct offline barcode lookup bypassed tenant preflight; unowned stale localStorage/IndexedDB rows could appear for another tenant | Tenant-tag check, reject unknown/unowned cache, \`pos-catalog-storage.spec.ts\` |
| B/F | POS query key lacked tenant, placeholder reused prior tenant results and in-memory product cache persisted over tenant switch | Include tenant in query key, placeholder only within same tenant, tenant-tag in-memory cache, deny old async response writes, \`usePosCatalog.tenant.spec.tsx\` |

**Additional source paths actually inspected:** \`frontend/src/features/products/components/ProductBarcodeDialog.tsx\`, \`ProductsMatrixView.tsx\`, \`product-barcode-print.helpers.ts\`; \`frontend/src/features/inventory/components/InventoryWorkspace.tsx\`, \`sections/InventoryComposerCards.tsx\`, \`hooks/useInventoryWorkspaceController.ts\`; \`backend/src/modules/inventory/services/inventory-count.service.ts\` (count create/recount/chunk post), \`inventory-transfer.service.ts\` (send/receive/shrinkage); \`frontend/src/features/pos/components/PosWorkspace.tsx\`, \`hooks/usePosCatalog.ts\`, \`lib/pos-catalog-storage.ts\`, \`lib/pos-workspace.helpers.ts\` (unique barcode resolution), \`lib/pos-product-lookup.ts\`, \`hooks/usePosOfflineSync.ts\`; \`backend/src/modules/returns/returns.service.ts\`, \`returns.controller.ts\`, \`engines/refund-tender.engine.ts\`; \`frontend/src/features/returns/components/ReturnsWorkspace.tsx\`, \`ReturnsCreateModal.tsx\`, \`ReturnsInvoiceItemsTable.tsx\`; \`backend/src/modules/cash-drawer/cash-drawer.service.ts\`, \`frontend/src/features/cash-drawer/components/CashDrawerReviewDialog.tsx\`; \`backend/src/modules/reports/helpers/reports-inventory.helper.ts\`, \`frontend/src/features/reports/api/reports.api.ts\`, \`components/sections/InventoryReportSection.tsx\`; and the documented catalog/GRN/retail flows from the first session. **Inspection of functions in these files must not be represented as exhaustive review of their entire module.**

## A–F coverage at the end of this source-only continuation

| Area | Status | What remains before marking complete |
|---|---|---|
| A. Clothing/fashion variants | **PARTIAL** | Every fashion import/export, multi-branch stock and returns, promotions/price overrides, label print hardware and large-catalog variant scenarios; full persistence and update lifecycle |
| B. POS/register | **PARTIAL** | Full sale/discount/tax/payment split/COD/terminal response path, reprint/cancel/hold, real offline crash-reload/replay, tenant switching on SaaS and Electron; cash/card settlement reconciliation |
| C. Cash drawer/shifts | **PARTIAL** | Full cashier/manager roles, blind close/review, concurrent closes and cash adjustments, mixed/card/wallet reconciliation, all accounting postings to close and variance ledgers |
| D. Purchases/inventory | **PARTIAL** | Full PO/GRN/bill and purchase return, multi-branch stock counts, re-count and post all chunks, reservations, serial/batch traces and transfer refunds/cancellation, zero/negative stock and per-location valuation |
| E. Returns/exchanges | **PARTIAL** | Full tax/discount proportional refunds, authorization and paid-tender reversals, bank/gateway refunds, partial multiple returns and Exchange atomicity with real DB concurrency; recovery across navigation/reloads |
| F. Reports/screens/UX | **PARTIAL** | Comprehensive sales/profit/shift/stock report reconciliation to ledger; physical scanner/label/receipt printing and ECR/PAX; Arabic RTL/accessibility, small screens, low-spec Electron and full-size catalog perf |

**No A–F area marked complete:** residual functional paths and runtime evidence remain. Work was performed without tests and builds at user's explicit instruction, so even modified paths are not operationally certified.

## Shared core/security ownership and integration risks (not patched here)

- Concurrent \`fix/platform-core-security-audit-20261025\` modifies auth/session guards, \`backend/src/modules/accounting/accounting.service.ts\`, \`backend/src/modules/reports/reports.service.ts\`, \`backend/src/modules/sales/services/price-lists.service.ts\`, DB migration 255, backup/tenant transfer and payment gateways. These are owned by the core audit and were **not edited** on commerce branch.
- Payment gateway approved charge **vs** POS invoice unknown response, remote card refund/settlement and accounting journal equivalence require a coordinated integration test with the common security/accounting/payment components; these cannot be closed by a POS UI-only workaround or asserted from code inspection.
- Ledger-driven valuation, financially sensitive stock counts, prior partially posted returns, and tenant-fence migration behavior need SQL fixture verification against the security branch once merged in a controlled integration environment. Do **not** merge either branch into \`main\` under this task without explicit approval.
- Electron IndexedDB and offline persistence retain real-device and tenant-switch risks until tested; static keys, cache checks and new unit tests do not prove end-to-end transaction safety.

## Verification gate and owner instructions

**Written but not executed:** the initial four regression files and the new source tests listed above. User explicitly prohibits test suites, Build, Typecheck and migrations during code repairs. Before retail/clothing commercial sign-off, separately run relevant backend/frontend tests, true Postgres transaction fixtures, SKU/branch reconciliation, Electron offline crash tests and terminal/printer workflows, then fix failures on this same isolated branch or an explicitly authorized integration branch. Do not claim 'P0 complete' or 'ready to sell' based only on these code changes.

**Conclusion:** Source-confirmed fixes were committed and pushed; the original whole-module A–F scope is **not fully reviewed** and remains blocked on substantive path coverage plus a later separately authorized verification phase.


### Follow-up E/F after coverage addendum — audit radar data scope
- The fraud/anomaly radar had been analyzing the filtered/paginated `rows` from the returns register rather than all sale returns. It now fetches complete sale return history on demand and blocks an empty/partial-risk display while unavailable; select-from-radar also works for a return outside the visible page. The new selection regression is authored only, unexecuted. **Axes E/F remain PARTIAL** because cross-cashier historical sales input, real Postgres fixtures and scale tests remain unverified. This is **one additional independent defect theme**, now 28 (12 original + 16 additional grouped themes) tracked for code changes, not runtime pass rate.


### Follow-up E/F — export register cashier-filter parity
- `ReturnsWorkspace` used to omit the selected cashier filter from Excel exports although the on-screen register and print respected it. Both use `buildReturnRegisterExportQuery` now, with an authored, unexecuted regression. This is one more distinct code-patched issue theme, bringing the running **documented grouped themes to 29 (12 initial + 17 subsequent)**. This does **not** mean 29 verified fixes or all A–F coverage is complete.


### Follow-up D — inventory transfer status lookup identifiers
- Static tracing from transfer creation and receipt/cancellation UI through `withIdempotency`, the Nest interceptor and `/api/operations` showed mismatched operation-type keys. Caller operation names now match interceptor route identities; authored tests are unexecuted. **D remains PARTIAL** pending durable keys and full transfer transaction drills. This raises grouped code-patched defect themes to **30** (12 original + 18 subsequent), not verified sign-offs.


### Follow-up D — transfer/count create response-loss protection
- A transfer was keyed afresh for each retry and stock-count creation was unkeyed; both now preserve the original key and request payload until resolution, with no localStorage persistence. This adds **two** separate code-patched themes, for **32 cumulative** (12 initial + 20 follow-up), with **no tests executed**. Bulk receipt/cancel and restart recovery remain open.


### Follow-up D — bulk transfer receive/cancel duplicate prevention
- Multi-document receipt/cancellation now pins an operation key and payload per document, retaining all keys until the entire batch succeeds; a partial failure cannot turn a previous successful item into a new mutation key. This is one more independently tracked source-code defect theme: **33 cumulative** (12 original + 21 subsequent). No tests executed. D remains PARTIAL.
