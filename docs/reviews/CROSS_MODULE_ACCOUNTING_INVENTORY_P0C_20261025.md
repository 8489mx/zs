# ZS ERP — P0-C cross-module accounting and inventory checkpoint (2026-10-25)

> **Not certified.** This is an evidence-based incremental checkpoint, NOT a claim that P0-C has passed. Do not merge or deploy on the strength of this review alone.

## Source / baseline

- New branch `fix/cross-module-accounting-inventory-20261025` started at main `7dd04db957873cea03d4b5e7fd2c0e81f3f99a4f`. No changes to main.
- Main already contains the P0-A security merge `38c7a27b50` and clothing/retail merge `dace46a641`. Preserve both.
- **Pre-existing failing CI** (before P0-C): main `ci` run [40197087207](https://github.com/8489mx/zs/actions/runs/40197087207) failed `backend/test/infra/settings-backup-safety.spec.ts` because settings-only actors now cannot perform any backup restore, including dry-run. The main frontend job passed.
- Main accounting PostgreSQL acceptance run [40196735417](https://github.com/8489mx/zs/actions/runs/40196735417) failed because the test assumed migration 253 could roll back on a fully migrated schema: migration 255 has an FK depending on `uq_core253_users_tenant_id` (Postgres dependency error `2BP01`). The DB guard was **correct** to refuse; never use `CASCADE`.
- A standalone branch CI and isolated disposable PostgreSQL accounting workflow have been enabled for review-branch pushes. Do not run these against customer or production data.

## Source changes made

1. `backend/src/modules/accounting/engines/sales-return-cost.engine.ts` now validates that a provided original sale-line ID actually refers to the returned product, **even when the return already stores an override cost**. Before this, a wrong/missing link with saved cost bypassed the provenance validation and could credit COGS for an unrelated sale line.
2. `backend/test/critical/sales-return-cost.spec.ts` adds wrong-product and missing-original-line regressions with stored costs, while preserving a valid persisted-cost case.
3. P0-A compatibility tests: grant `canManageBackups` in the backup-safety test cases intended to reach the cloud/desktop and dry-run paths; retain the settings-only forbidden case.
4. PostgreSQL migration acceptance: verify 253 up/up is idempotent and that down253 is **rejected** on a fully migrated database where 255 depends on its index; ensure the checks and MFA FK remain installed.

## Confirmed open financial risks — must be fixed before verification

| ID | Priority | Source evidence | Risk / required fix |
| --- | --- | --- | --- |
| P0C-01 | P0 | `accounting-posting.service.ts:toMoney` uses `toFixed(2)` for all tenants; `purchase-receipt-cost` and `landed-cost-allocation` use 2-digit assumptions | KWD/OMR 0.001 precision is lost. Requires **end-to-end tenant base-currency minor-unit precision** at validation, receipt allocation, posting, reports, and reversal, with exact 3-decimal PostgreSQL tests. Do not change one helper while the rest of the chain remains two-decimal. |
| P0C-02 | P0 | `maintenance.service.ts`: create/deliver directly insert `treasury_transactions`; parts directly insert `stock_movements`; no posting service dependency | Maintenance cash and consumed-stock activity is not demonstrably GL-backed. Implement an atomic source document/journal/stock contract (including advances as liabilities and reversals), not just an independent extra journal. |
| P0C-03 | P0 | `tradein.service.ts` directly inserts trade-in stock movements and treasury expense but has no `AccountingPostingService` injection | Used-goods intake/payout can be operationally booked without corresponding valuation and cash GL entries; needs atomic GL and costing contract, including cancellation. |
| P0C-04 | P0 | `pharmacy.service.ts:importDistributorInvoice` inserts batches line-by-line without a transaction, then inserts a treasury expense under `try/catch` that swallows failures; no central journal posting | Financial failure can leave batches saved and report success, with no verified AP/cash/stock GL. Redesign using an idempotent purchase/GRN flow, atomic batch and GL entries and non-swallowed failure handling. |

The code observations above identify definite missing integration points; **financial impact on existing tenant balances was NOT measured**. Do not assume every tenant is affected, or directly edit posted ledgers. Reconcile historical data on a copy first.

## Process coverage matrix

**Status legend:** *Existing PG tests* means a known test scenario is present and awaits / has an isolated CI run; it is not an end-to-end signoff. *Open* means the requested full API → service → transaction → DB → stock → journal → GL → report walk has not been completed.

| # | Flow | Evidence / remaining work | Closure |
| --- | --- | --- | --- |
| 1 | Purchase → receiving → inventory → AP → GL | Existing PostgreSQL acceptance covers receipt, WAC, AP, recovery and concurrent retry. Dedicated GRN and landed-cost variants remain. | Open |
| 2 | POS/sale → COGS → cash/tax/GL | Existing PostgreSQL acceptance covers sale, lost-response, oversell and GL; no exhaustive tax/channel/variant run. | Open |
| 3 | Sales return/refund → stock/COGS reversal | Existing PG journey and new cost-provenance guard. Refund-channel reversal matrix still needed. | Open |
| 4 | Purchase return → stock/AP/GL | Existing PG journey covers a purchase return; remaining multi-location/currency scenarios needed. | Open |
| 5 | Stock transfer → in transit → receipt/cancel | Previous inventory acceptance in repository; no P0-C cross-module valuation/reversal certification. | Open |
| 6 | Stock count/adjustments → variance journal | Existing accounting integrity and count code; no full P0-C physical-to-GL scenario. | Open |
| 7 | Treasury/banks/cheques → settle/reverse | Existing PostgreSQL acceptance tests PDC lifecycle, foreign currency, concurrent collection and cash-flow; maintenance and trade-in bypass unresolved. | Open |
| 8 | Discount/partial/deferred payments → subledgers | Existing acceptance covers credit sale, customer collection and supplier payment; full invoice allocation/currency breakdown remains. | Open |

## Sector integration matrix

| Module | Evidence and status |
| --- | --- |
| Retail/clothing | Main merge verified present; cross-module variant journal/stock matrix still open |
| Imports/landed costs | `import-sales.service.ts` uses `postDomainJournal` and movement rows; allocation and 3-digit base currency unfinished |
| Manufacturing | `manufacturing.service.ts` writes consumption/production movements; GL reconciliation requires full path trace |
| Pharmacy/batches | **P0C-04 open** |
| Maintenance/parts | **P0C-02 open** |
| Used goods/trade-in | **P0C-03 open** |
| Installments | Existing journal helper and critical finance tests, full scenario not certified |
| Contracting | `contracting.service.ts` uses `postDomainJournal` for IPC; retention and reversal scenarios not completed |
| Maritime freight | Production `postDomainJournal` and isolated PG foreign-currency carrier credit scenario; full job costing open |
| HR/payroll | HR finance posting exists in accounting service; country-specific payroll-to-GL not verified in P0-C |
| Storefront/marketplace | Existing PG tests cover concurrent marketplace settlement and one-connection transaction; other gateways/retries open |

## Evidence and release rule

- Baseline real-database acceptance suite has **17 named scenarios** in `backend/test/acceptance/core-accounting.postgres.spec.ts`, including purchasing, credit sales, both returns, concurrent sales, retry and reversal, tenant guard, PDC, marketplace, freight, fiscal close, and integrity detection. Presence alone is not a green run.
- Review-branch workflows: `.github/workflows/ci.yml` and `.github/workflows/accounting-acceptance.yml`.
- Required follow-ups: run and inspect new CI results, reconcile a disposable restored representative tenant with `check:accounting-integrity`, fix open P0C-01…04, run explicit 3-decimal and sector integration PostgreSQL tests and cross-module retry/failure tests; recheck new main head for conflicting changes.
- **Verdict: BLOCKED.** No complete 8-cycle and 11-sector closure, and no verified production or packaged Electron smoke test.

## 25 October follow-up — trade-in atomicity and CI de-duplication

- Trade-in creation now obtains a tenant+IMEI transaction advisory lock and rejects duplicate prior intake with `TRADEIN_DUPLICATE_SERIAL`; this prevents two cash/outflow documents when concurrent requests race or the successful response is lost. An independently isolated PostgreSQL concurrent regression was added to the acceptance suite.
- `deleteTransaction` now refuses deleting any economically significant trade-in (`TRADEIN_REVERSAL_REQUIRED`), even when there is a delete permission; source and cash movement must survive until a documented reversal is implemented. Zero-impact drafts remain deletable.
- **P0C-03 is still OPEN**: these controls address duplicate intake and destructive deletion; the existing trade-in intake/payout still lacks its required full GL/valuation posting contract.
- Review-branch workflows now cancel only superseded branch push runs using `concurrency` with `cancel-in-progress` and a non-main predicate. Main, required pull request checks, and Oracle deploy triggers stay unchanged.
- Previous isolated accounting PostgreSQL acceptance [40198134273](https://github.com/8489mx/zs/actions/runs/40198134273) passed on prior revision. This does **not** certify new trade-in changes until a new run confirms them.

## Cash used-goods acquisition posting checkpoint

- Cash trade-in now requires a tenant-owned physical stock receipt. The intake records an explicitly costed `tradein_in` movement and recomputes WAC through `valueStockReceipt`.
- `AccountingPostingService.postTradeInCashPurchase` posts debit `1140` Inventory and credit `1110` Cash in the **same transaction** as the stock receipt and treasury payout. It checks the exact one-to-one value/quantity/cash source before posting. `trade_in` source is now deduplicated.
- Pre-existing catalog links now also receive physical stock; generated product barcodes include the unique transaction ID.
- Disposable PostgreSQL acceptance now verifies a 37.25 cash payout, matching inventory and cash GL, one source-linked journal, physical WAC and concurrent duplicate prevention.
- **Not full sector certification:** trade-in exchanges, bank payments and purchases without classified physical stock still need their own accounting flows. Existing economic documents cannot be hard-deleted; an audited cancellation/reversal workflow is not yet implemented.


## Maintenance P0-C implementation checkpoint (code staged; PostgreSQL verification pending)

- `maintenance-accounting.ts` routes advances (Dr 1110 / Cr 2150), delivery (Dr 2150 and remaining 1110/1120 / Cr 4200), consumed spare parts (Dr 5100 / Cr 1140), and returned parts (reverse) through central `postDomainJournal`, within each stock/cash transaction.
- Issued spare-part cost derives from authoritative product WAC, not user-supplied unit cost; returns retain historical issue valuation and recompute WAC after stock receipt.
- Repeat delivery, non-matching settlement, direct advance edits, financial hard deletion and post-delivery removal are rejected, so they cannot silently mutate already-posted documents.
- Disposable PostgreSQL regression was added for full receipt, issue, repricing, return, delivery, retry, and journal/stock reconciliation. **Test result is pending at this checkpoint.**
- Remaining **P0C-02**: formal maintenance cancellation/refund, partial receivables/credit settlement, already-posted historical ticket reconciliation, extended payment rails and UI coverage; not certified. **P0C-01** KWD/OMR 3-decimal precision and **P0C-04** pharmacy distributor import remain open; trade-in exchange/bank/reversals also remain open. Do not merge/deploy.

## 25 October follow-up — maintenance protections and pharmacy transaction boundary

- Prevented destructive maintenance-ticket deletion when a cash receipt, any historical ticket-linked stock movement, delivered status, or recorded advance exists. Financially significant tickets must use a future audited reversal rather than hard-delete.
- Prevented rewriting maintenance financial fields after an advance, delivery, or issued part; prevented adding parts to delivered/cancelled tickets.
- Wrapped pharmacy distributor-invoice batch/drug creation and treasury write in one database transaction. The previous swallowed treasury exception no longer permits a successful partial batch import.
- **P0C-02 and P0C-04 remain OPEN:** maintenance still lacks atomic central GL postings, and distributor invoices still require a canonical purchase/AP/stock/GL pipeline with idempotency. These changes are safety constraints, not full financial certification.
- The new changes still require targeted tests and PostgreSQL acceptance plus full CI. No production or Electron verification is asserted here.

### Additional safety guard follow-up

- Maintenance delivered tickets cannot be reopened and charged again, and already delivered tickets reject retrospective changes to final cost or collected amount. New collected amounts and final costs reject negative/non-finite inputs.
- Pharmacy distributor invoices reject invalid product names, non-finite numbers, zero/negative purchased quantities and negative bonus quantity/prices before creating stock batches. These checks run within the same rollback boundary as batch and treasury inserts.
- These protections do not replace transactionally linked GL journal posting, audited reversals, purchase/AP matching, or real-database end-to-end signoff.

## 25 October — KWD/OMR precision implementation checkpoint

- Added shared currency minor-unit utilities, KWD/OMR and standard-cent tests, exact landed-cost allocation and stock/COGS splits, and base-currency-aware PDC snapshots.
- Purchase landed-cost journal source and supplier allocations now use tenant base-currency minor units, preserving thousandths without floating-point residuals. Landed unit WAC retains 6-decimal interim precision.
- Central journal insertion determines tenant book precision, instead of silently forcing every journal entry line to two decimals. Additive migration 256 widens a controlled set of numeric columns; rollback deliberately refuses to narrow the precision.
- PostgreSQL acceptance now contains a real KWD 0.001 posted-journal persistence scenario. CI evidence for this revision must be attached after execution.
- **P0C-01 remains OPEN for global release:** other posting paths still use 2-digit intermediate rounding, wider sales/purchase/report/payroll and FX flows need review, and tenant-level full-cycle three-decimal reconciliation has not been certified.

## 25 October — pharmacy distributor invoice canonical purchase integration

- Distributor invoice import now resolves one tenant-owned active supplier, a valid receiving warehouse, and catalog drugs linked to active stock products; it rejects missing/ambiguous mappings instead of inventing financial master data.
- Each line's batch number and expiry enter the existing `PurchasesService.createPurchase` path. Supplier invoice reference becomes an idempotent purchase key. Existing purchase transaction handles warehouse receipts, lot quantities, stock WAC, supplier balance and double-entry GL with cash/credit distinction. Free bonus units raise stock quantity without manufacturing extra supplier liability.
- Direct pharmacy batch creation/edits cannot adjust stock or cost outside purchase/GRN; deletion of drug master with batch history is rejected. The joined product listing now matches tenant_id on both sides.
- Added PostgreSQL acceptance to check 2 paid + 1 bonus units, one purchase/AP/GL receipt, retry without duplicate inventory, rejection of manual cash bypass, and rollback of expired-batch purchase.
- **Limits:** Linked stock product/supplier/location and invoice number are now mandatory. Three-decimal pharmacy purchases fail closed until the canonical purchases calculation path handles mill precision. Legacy unlinked batches/history need reconciliation on a disposable copy before deployment. No automatic cash outflow is fabricated for default credit invoices.

### Currency-dependent integration test coverage and fixture repair

- `backend/test/critical/accounting-commercial-posting.spec.ts`, `import-postgres-integration.spec.ts`, and `import-e2e-business-simulation.spec.ts` use isolated PGlite fixtures. They now create the `settings` / `currency_exchange_rates` metadata used by production tenant-base-currency validation instead of stubbing that guard.
- The prior full CI failed with missing schema `42P01` in these miniature fixture databases; this was not an observed production migration failure. The new full CI run must pass before concluding these fixtures are fixed.
- Disposable PostgreSQL acceptance has passed for KWD 0.001 and pharmacy importer source/stock/AP/GL on earlier revisions, but 8 commercial cycles and 11 sector pathways are not fully certified.

## Stock-count minor-unit follow-up

- Stock-count journal variance valuation now uses the tenant book's 2- or 3-digit minor-unit precision; avoids silently discarding 0.001 KWD / OMR variance before GL posting.
- Added critical regression scenarios for KWD, OMR, EGP and a 0.025 amount. This does not certify end-to-end cash, sales, purchase and reporting precision; P0C-01 remains open.

## 25 October — three-decimal maintenance and trade-in cross-module fixes

- Removed hard-coded 2-digit rounding for maintenance journals and spare-part COGS movements; delivery now compares exact integer tenant minor units and rejects overprecision instead of concealing a mill mismatch.
- Trade-in validates user acquisition amounts in tenant minor units before transactional stock/cash writes; the trade-in acquisition posting no longer truncates the last KWD/OMR fil.
- New disposable PostgreSQL checks cover KWD 0.001 advance + 0.002 settlement; KWD 0.001 trade-in physical stock, treasury and GL; and 0.0001 rejection. Results pending for the new SHA; no broad 8-cycle/11-sector certification or migration/deploy approval is claimed.

## 25 October — debt-aging KWD/OMR precision scope

- Reporting money helpers now accept explicit tenant minor units; `ReportsSummaryService.debtAgingReport` formats supplier/customer bucket balances and totals in the validated tenant's 2/3-digit currency and includes tiny positive open invoice balances previously filtered at 0.01.
- Focused `reports-summary.helper.spec.ts` assertions cover 0.001 and 0.003 KWD/OMR totals while preserving ordinary EGP-cent defaults.
- No blanket precision certification: other reporting methods, sales/purchase base columns and frontend currency formatting require further review; P0C-01 remains OPEN. CI for this patch set pending at staging time.

### CI follow-up — cent rounding compatibility

- Full backend CI exposed a regression in historical supplier-ledger half-cent rounding (-10.505 expected -10.51). The new optional-digit report utility now preserves legacy `Number.toFixed` rounding for existing two-decimal paths, and permits three-decimal KWD/OMR reporting where explicitly selected.
- Added cent-boundary and fil-preservation assertions. The revised commit still requires full CI; PostgreSQL acceptance succeeded on the previous report patch SHA.

## 25 October follow-up — purchase single-fil path

- Purchase normalized line and residual discount allocation now select minor units from tenant base currency. Vendor source subtotal and stock receipts no longer round a 0.001 KWD / OMR cost to 0.00.
- GL journal line combination in the `postPurchase` source path uses the same currency precision as the posted journal, instead of the previous hidden two-decimal `addLine` quantization.
- Migration 257 preserves vendor debt and source precision in `purchases`, `purchase_items`, `suppliers`, `supplier_ledger`, and `stock_movements.unit_cost` without destructive rollback.
- Real disposable PostgreSQL regression asserts one-fil purchase total, AP, supplier ledger, WAC, inventory movement, GL debit/credit and idempotent retry. New CI not yet verified when this note was committed; **P0-C is NOT closed**. GRN, cash and return matrix remains open.

## 25 October — KWD/OMR pharmacy bonus and purchasing reconciliation

- Removed the previously necessary unconditional three-decimal pharmacy distributor purchase block after the supplier purchase posting and numeric persistence work. Every distributor line now prechecks the minor-unit value produced by bonus dilution against its payable source amount before any stock/AP write.
- Real PostgreSQL acceptance now exercises KWD 0.002 supplier debt, one posted purchase journal, a 3-unit paid+bonus lot, approximate six-decimal WAC conservation, and idempotent retry.
- P0C-04 still requires cash settlement variations, historical lot reconciliation, errors across all stock locations, and a cross-module reversal audit. Full CI/new PG result pending at authoring time.

## 25 October — KWD/OMR sales and customer AR source checkpoint

- Added 2/3-digit currency parameters to POS line valuation, invoice discount/tax distribution and tender allocation, and preserved the same precision in `postSale` journal line aggregation and customer subledger running balances.
- Additive migration 258 widens monetary evidence for sales, sale items/payments, customer AR, and price fields while refusing rollback that could discard posted fils.
- New disposable PostgreSQL scenario checks a 0.001 KWD posted credit sale and proves the customer/source 0.001, inventory/COGS 0.001 and revenue 0.001 balance. **Results pending at commit time.** Does not certify returns, tax, mixed payments, discounts, FX, reports, 8 cycles or 11 sectors.

## 25 October — sale/vendor returns and refund allocation in minor units

- Return helpers, running partner balances, sales refund tender allocator and vendor payable/cash split no longer quantize KWD/OMR 0.001 to cents. Journal posting for both return source types now retains original currency precision.
- Return valuation stock-movement amounts follow the original WAC cost in tenant digits. Migration 259 widens return source document and item values without loss on rollback.
- Added pure `returns-write.helper` and `sales-return-cost` critical regressions plus disposable PostgreSQL 0.001 sale return and vendor return source→stock→partner balance→GL tests. Their final CI/PostgreSQL results must be checked before signoff. Multi-channel partial refunds, serial/lot reversals and full 8-cycle/11-sector verification are still OPEN.

## P0-C payment vouchers and credit/debit return rounding follow-up

- Customer/supplier payment voucher amount validation and vendor schedule available balance now respect the tenant's 2/3 minor-unit scales; payable/receivable GL payment journals retain thousandths.
- Real PostgreSQL acceptance includes 0.001 KWD customer and supplier payment settlement with source/GL/AP/AR reconciliation. A previous acceptance run exposed a test-only Kysely `QueryResult.length` type error in return assertions; corrected to `.rows.length`.
- This is not blanket treasury/FX/cheque/returns certification. The complete 8-cycle and 11-sector matrix is still open until each requested scenario has passing proof.
