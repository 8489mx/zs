# ARCH02 — implementation closure and outstanding validation

Date: 2026-10-24. Repository: `8489mx/zs`.
Implementation branch: `fix/arch02-accounting-engine`. Publication target authorized by the owner: `WORK` (case-sensitive), with no merge into `main`.
Base HEAD: `4515b5e36f7a05b1ab9b975473f72dba28318da7` (ARCH01 fixes).

The local changes cover the 37 tracked ARCH02 findings. This closes implementation of the listed corrections and protective guards; it does **not** certify runtime correctness, migration readiness, historical balances, or production readiness. At implementation review, no test, build, typecheck, migration, commit, push, deployment, or production data repair had been executed. The owner subsequently authorized committing and publishing the fixes to `WORK`; this authorization does not approve running checks, migrations or deployment. The publication commit uses `[skip ci]` to retain that restriction. The fixed `infoadmin` password and its acceptance path are unchanged. ARCH03 has not started.

## Finding-to-change register

Paths below are relative to `backend/src/modules/` unless otherwise noted. Status for every row is **implemented locally; execution validation pending**. A protective rejection is identified explicitly rather than being represented as support for an unavailable accounting operation.

| Finding | Correction | Main implementation |
|---|---|---|
| P1-01 | Exclusive next-day UTC bounds include the entire closing/report date, including database microseconds. | `accounting/engines/accounting-date.engine.ts`; `accounting.service.ts`; fiscal-year, forex, cash-flow, aging, VAT and WHT services |
| P1-02 | Closing includes inactive historical P&L accounts; fiscal closing/reopening can offset those accounts without making them operationally active. | `accounting/services/fiscal-year.service.ts`; `accounting-posting.service.ts::insertPostedJournal` |
| P1-03 | Close/lock sign-off is blocked by unresolved posting failures, missing active sales journals and due unposted financing accruals. Sale entry checks the period before its domain changes. | `accounting/accounting-close-readiness.ts`; fiscal-year, accounting, sales-write and van-sales services |
| P1-04 | Aggregate opening journal records cash/bank only. Operational customer, supplier and inventory balances are no longer copied into a second opening journal. | `accounting/accounting.service.ts`; opening-balances UI |
| P1-05 | Partner creation, opening subledger, balance and journal commit or roll back together. | `partners/partners.service.ts::createCustomer/createSupplier` |
| P1-06 | Generic reversal accepts manual entries only. Domain journals require their domain cancellation path. Original and reversal remain posted with reciprocal links; cheque links are assigned only to financially exact opposites. | `accounting/accounting.service.ts::reverseJournalEntry`; posting service; `engines/journal-reversal.engine.ts`; journal UI |
| P1-07 | Manual journals cannot bypass AR/AP/inventory subledgers. Aggregate FX revaluation of control accounts is rejected until partner currency positions are available. Configured control IDs and legacy flags/codes are checked. | `accounting/accounting.service.ts`; `services/forex-revaluation.service.ts`; manual-journal UI |
| P1-08 | Selected newly integrated domain journals synchronize the shared partner balance/ledger in the same transaction. Shipping-line and subcontractor identities use explicit supplier links. Subcontractor cash/bank payments now post a journal and treasury movement atomically. | `accounting/partner-subledger.ts`; posting, landed-costs, import, maritime and contracting services |
| P1-09 | Supplier foreign-transfer ledger movement uses the same negative debt-reduction sign as the supplier balance. | `import-sales/import-sales.service.ts::recordForeignTransfer` |
| P1-10 | Cheque type/status/action matrix blocks repeated terminal actions and invalid transitions. Repeatable deposit/bounce cycles have sequence-based event keys, without falsely reversing bank fees to free an index. | `accounting/engines/pdc-transition.engine.ts`; PDC and posting services; migration 252 |
| P1-11 | Cheques persist base amount/currency and the rounded book FX rate. Collection/clearance uses the settlement rate and posts realized FX separately. Old foreign cheques without a proven base value are blocked. | `accounting/pdc-currency.ts`; PDC and posting services |
| P1-12 | Customer/supplier and settlement bank references are tenant-validated. Name-only cheque/endorsement input must uniquely resolve to an existing owned partner. | PDC service; central journal reference validation |
| P1-13 | Cost-centre parent joins are tenant-qualified. Parent creation/update rejects foreign parents and cycles, with a tenant FK for new writes. | `accounting/accounting-boundaries.ts`; accounting service; migration 252 |
| P1-14 | Tax-affecting central/manual postings and manual reversals enforce tax locks, including known legacy tax codes. | Posting and accounting services; `accounting-boundaries.ts` |
| P1-15 | Operational lock enforcement applies centrally to domain sources rather than an incomplete source-name allowlist. | `accounting/accounting-boundaries.ts`; posting service |
| P1-16 | Sales returns update WAC once per physical receipt, including split warehouse allocations. Purchase returns remove current WAC and recognize price variance separately. Receipt valuation uses reconciled `globalAfter - receiptQty`. Unit-cost columns retain six decimal places. | Returns service; `accounting/inventory-valuation.ts`; posting service; migration 252 |
| P1-17 | Manufacturing WAC uses stock before receipt rather than counting the finished receipt twice. Automatic production quantities remain base units; refreshed sold-unit costs preserve modifier costs. By-product valuation is deducted from finished-product value. | Manufacturing and sales-write services; inventory valuation helper |
| P1-18 | Actual locked product costs and stored consumption totals replace expected BOM prices as accounting evidence. Monetary consumption totals are rounded consistently with stored document amounts. | Manufacturing, sales-write and posting services |
| P1-19 | Conversion costs include BOM overhead and actual work-centre operations. Credit materials only for actual material consumption; credit conversion cost separately. | Manufacturing service; `postManufacturingWorkOrder` |
| P1-20 | Courier settlement clears the full sale receivable, recording net cash and the courier fee separately. Individual, batch and pending summaries use the sale/default fee mode. | Delivery-reps service; `postDeliveryRepSettlement` |
| P1-21 | Electronic field collections debit the bank rather than the representative's pooled cash custody. Cash collections retain custody until trip settlement. | Van-sales service; `postVanFieldCollection` |
| P1-22 | Carrier dispute resolution locks the dispute, invoice and job in one transaction. Terminal replays are idempotent; cumulative credits are bounded. Credit is translated using the original invoice's base expense and passes central period/subledger checks. | Maritime service::`resolveCarrierDispute`; posting service |
| P1-23 | Marketplace settlement has a durable tenant/platform/settlement key and an atomic central journal. Legacy reconciled keys cannot be silently reposted. Central posting enforces period locks. | Marketplace-sync service; migration 252 |
| P1-24 | Settlement validates `gross = net + fees + refunds + other` and records gross sales, refunds and each fee component explicitly. | Marketplace-sync service::`reconcileSettlement` |
| P1-25 | Marketplace fallback accounts require the correct type, active/manual status and genuine cash/bank flag for cash. Dedicated new system codes reject incompatible account types. | Marketplace account resolver; central system-account resolver |
| P1-26 | IPC journal check, row lock, journal creation, retention record and source link share a transaction/period lock. Stable event keys prevent duplicate financial events. | Contracting service::`postInvoiceJournalEntry`; posting service; migration 252 |
| P1-27 | Operating financial summaries exclude closing/reopening journals. | `accounting/accounting.service.ts::getFinancialSummary` |
| P1-28 | Initial financing credit is unearned income. Effective-interest schedule releases earned income on due dates, retaining the plan branch. A scheduled and closing accrual path shares the same locked/idempotent posting implementation. | Installment service; posting service; interest engine/scheduler; migration 252 |
| P1-29 | VAT return adjustments use persisted line tax allocations. Ambiguous legacy returns are rejected instead of being assigned a national default rate. | VAT declaration service::`returnTaxTotals` |
| P1-30 | Sales VAT bases include the recorded service charge with the existing inclusive/exclusive tax treatment. | VAT declaration service |
| P2-31 | Cheque journal and partner-ledger dates use the validated action date; chronology cannot move backward. | PDC and posting services |
| P2-32 | Aging reconstructs signed historical partner movements through the selected day; later payments/current balances are not consulted. FIFO allocates credits to historical charges, with UTC calendar aging. | `accounting/services/aged-debts.service.ts` |
| P2-33 | Direct cash-flow calculation excludes non-cash journals and cheque custody. Ambiguous mixed entries are shown as unclassified, included in cash reconciliation, and warned about. Manual entry classification is retained by its reversal. | Cash-flow service/engine; manual-journal DTO/service/UI; cash-flow UI |
| P2-34 | Chart parent creation/update rejects tenant violations, self-parenting and ancestor cycles under a common lock. Listing detects legacy cycles. | Accounting service; hierarchy helper; migration 252 |
| P2-35 | Rates must be finite/positive; base rate is one and the tenant has at most one explicit base. Settings currency and rates must agree. No fabricated example FX rates are seeded. Base changes after rate/book initialization are rejected. | `accounting/accounting-currency.ts`; accounting/settings/PDC/marketplace/forex services; migration 252 |
| P2-36 | WHT extraction serializes its check/insert, scopes supplier joins, selects posted purchases, and persists a unique extraction key. | WHT service; migration 252 |
| P2-37 | Manufacturing journals use the actual completion timestamp. A legacy done order without a proven completion date cannot be guessed/reposted. | Manufacturing, sales-write and posting services; migration 252 |

## Remaining release and data work

These are outstanding requirements, not checks that have passed:

1. Run approved typechecks, builds and regression/integration tests on an isolated database. The new production-engine regression file is `backend/test/critical/arch02-accounting-engines.spec.ts`, registered as `test:arch02` and in `test:critical`; neither command was run. The existing logistics harness constructor was updated for real central posting; its fixtures and assertions still need execution review.
2. Review/apply migration `2040000000252_arch02_accounting_foundation.ts` on an isolated copy first. Widened unit-cost columns and new indexes can take table locks; plan deployment accordingly. Stop old accounting writers while installing the migration and new code. Do not mix old cheque writers with sequence-based writers.
3. Preflight duplicate base-currency rows and inconsistent currency settings. The unique base index deliberately fails rather than choosing a currency for old books. New tenant FKs/checks are `NOT VALID`; validate them only after reviewed legacy reconciliation. No existing monetary balance is automatically repaired.
4. Validate SaaS, Electron and LAN business journeys, repeated requests, concurrent payment/close operations and forced rollback. No authentication/password implementation changed, but login, `zs` access and environment behavior were not exercised.

Historical review must reconcile, per tenant, duplicate opening journals; failed/missing source postings; auto-journal reversals that previously diverged from domain state; customer/supplier GL versus subledgers; shipping-line/subcontractor supplier identities; foreign-payment ledger signs; repeated/invalid cheque events and missing original FX values; returned/manufactured stock costs, COGS and former unit-cost rounding; courier/field collection balances; carrier credits; duplicate or net-only marketplace entries; duplicate IPC/WHT events; upfront financing revenue; VAT returns/service charges; and closed years missing last-day/inactive-account movements. Produce separately authorized adjustment/reversal documents, retaining original audit evidence. Do not rewrite or delete posted financial history.

## Explicit functional restrictions

- Partner-level foreign currency positions are not reconstructed from aggregate GL balances. Control-account FX revaluation is protected by rejection until that capability/data is provided.
- Marketplace settlements accept base-currency amounts. Foreign settlement conversion requires an explicit conversion document/feature rather than treating nominal foreign amounts as base money.
- Legacy foreign cheques, unproven return tax/cost snapshots, negative-stock receipt valuation and legacy manufacturing completion dates require reconciliation; the implementation refuses to invent financial evidence.
- Mixed cash flows remain visibly unclassified without sufficient attribution. They must be classified/reviewed before approving the activity classifications; total cash still reconciles. Aging uses the stated FIFO policy, not a historical reconstruction of every invoice-specific allocation.
- Subcontractor cheques are recorded through the cheque portfolio, not immediate bank-out posting from the cash/bank payment modal. Cash/bank payment attempts persist their request key across renderer restarts.
- Old maritime credit offsets that no longer match the shared customer GL require reconciliation. The funded balance-settlement path does not debit the customer a second time after the invoice is already represented in the shared ledger.

## Review boundary

The changed accounting engine, reporting/period services, DTOs, migration/types, related financial callers in partners, returns, manufacturing, sales/installments, purchases/landed costs, imports, delivery/van collections, contracting, maritime, marketplace, settings and VAT were reviewed statically. Relevant manual journal, opening, cheque, cash-flow, journal reversal and subcontractor payment UI/API callers and Arabic/English translations were reviewed. New helpers and the regression file were read; `git diff --check` is a whitespace/conflict-marker check, not a compiler or behavioral test.

This work does not repeat ARCH01, approve all business modules, inspect live tenant data, validate database migration execution, test deployments/authentication, or begin the next audit package. Implementation closure must not be reported as full ARCH02 acceptance.

## Validation checkpoint — 2026-10-24

The owner subsequently authorized testing, then limited lengthy validation and requested an AntiGravity handoff. Backend production-engine regressions passed (exit 0), and the full backend Typecheck passed after three corrective changes: explicit domain journal dimension normalization, the retention-table type, and modifier-array narrowing. Frontend Typecheck remains blocked by missing installed Capacitor dependencies after increasing the Node heap. Builds, migration execution and comprehensive service/concurrency/environment tests are not approved as passed. A disposable PostgreSQL container was ready but sandbox TCP access failed before migrations; the container was removed. No production database was accessed.

**Final ARCH02 acceptance is still pending.** See [the reproducible AntiGravity handoff](ARCH02_ANTIGRAVITY_HANDOFF_2026-10-24.md) for evidence and the remaining acceptance matrix. Earlier “not run” statements describe the implementation checkpoint and are superseded only for the explicitly successful checks above.

## Changed-file inventory

- `ARCHITECTURE_INVARIANTS.md`
- `backend/package.json`
- `backend/src/database/database.types.ts`
- `backend/src/database/migrations/2040000000252_arch02_accounting_foundation.ts`
- `backend/src/modules/accounting/accounting-boundaries.ts`
- `backend/src/modules/accounting/accounting-close-readiness.ts`
- `backend/src/modules/accounting/accounting-currency.ts`
- `backend/src/modules/accounting/accounting-posting.service.ts`
- `backend/src/modules/accounting/accounting.module.ts`
- `backend/src/modules/accounting/accounting.service.ts`
- `backend/src/modules/accounting/dto/accounting.dto.ts`
- `backend/src/modules/accounting/engines/accounting-date.engine.ts`
- `backend/src/modules/accounting/engines/cash-flow-classification.engine.ts`
- `backend/src/modules/accounting/engines/installment-interest.engine.ts`
- `backend/src/modules/accounting/engines/inventory-valuation.engine.ts`
- `backend/src/modules/accounting/engines/journal-reversal.engine.ts`
- `backend/src/modules/accounting/engines/pdc-transition.engine.ts`
- `backend/src/modules/accounting/inventory-valuation.ts`
- `backend/src/modules/accounting/partner-subledger.ts`
- `backend/src/modules/accounting/pdc-currency.ts`
- `backend/src/modules/accounting/services/aged-debts.service.ts`
- `backend/src/modules/accounting/services/cash-flow.service.ts`
- `backend/src/modules/accounting/services/fiscal-year.service.ts`
- `backend/src/modules/accounting/services/forex-revaluation.service.ts`
- `backend/src/modules/accounting/services/installment-interest-scheduler.service.ts`
- `backend/src/modules/accounting/services/pdc-cheques.service.ts`
- `backend/src/modules/accounting/services/withholding-tax.service.ts`
- `backend/src/modules/contracting/contracting.service.ts`
- `backend/src/modules/contracting/dto/contracting.dto.ts`
- `backend/src/modules/delivery-reps/delivery-reps.service.ts`
- `backend/src/modules/delivery-reps/van-sales.service.ts`
- `backend/src/modules/import-sales/import-sales.service.ts`
- `backend/src/modules/manufacturing/services/manufacturing.service.ts`
- `backend/src/modules/maritime-freight/maritime-freight.module.ts`
- `backend/src/modules/maritime-freight/maritime-freight.service.ts`
- `backend/src/modules/partners/partners.service.ts`
- `backend/src/modules/purchases/services/purchase-landed-costs.service.ts`
- `backend/src/modules/returns/returns.service.ts`
- `backend/src/modules/sales/services/customer-installments.service.ts`
- `backend/src/modules/sales/services/sales-write.service.ts`
- `backend/src/modules/settings/settings.service.ts`
- `backend/src/modules/storefront/services/marketplace-sync.service.ts`
- `backend/src/modules/storefront/storefront.module.ts`
- `backend/src/modules/tax-integration/services/vat-declaration/vat-declaration.service.ts`
- `backend/test/chaos-logistics-adversarial-sabotage.ts`
- `backend/test/critical/arch02-accounting-engines.spec.ts`
- `frontend/src/features/accounting/api/accounting.api.ts`
- `frontend/src/features/accounting/components/ManualJournalEntryDialog.tsx`
- `frontend/src/features/accounting/components/PdcChequeActionModal.tsx`
- `frontend/src/features/accounting/components/PdcChequeCreateModal.tsx`
- `frontend/src/features/accounting/components/settings/AccountingOpeningBalancesSection.tsx`
- `frontend/src/features/accounting/pages/AccountingJournalEntriesPage.tsx`
- `frontend/src/features/accounting/pages/CashFlowStatementPage.tsx`
- `frontend/src/features/contracting/api/contracting.api.ts`
- `frontend/src/features/contracting/components/RecordSubcontractorPaymentModal.tsx`
- `frontend/src/lib/api/idempotent-subcontractor-payment.ts`
- `frontend/src/lib/ui-dictionary.json`
- `frontend/src/locales/ar.json`
- `frontend/src/locales/en.json`
