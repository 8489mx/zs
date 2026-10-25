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
