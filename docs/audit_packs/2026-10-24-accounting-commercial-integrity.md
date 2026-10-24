# Accounting and commercial integrity review — 24 October 2026

Branch: `fix/accounting-core-commercial-integrity`

The system uses a tenant-specific chart and account mapping, perpetual inventory, double-entry journals, and posted originals plus mirrored reversal entries. Simple retail hides accounting screens but uses the same backend posting services as enterprise commerce. Cloud and offline architectural boundaries are unchanged.

## Confirmed defects and changes

| Finding | Effect before the fix | Corrected behavior |
| --- | --- | --- |
| Normal and field sale handlers swallowed posting failures | Stock, tenders and customer debt could commit without a journal, including when a period gate rejected posting | Posting errors propagate and roll back the business transaction; the recovery worker remains available for historical failures |
| Tax cutoff was selected but not enforced by posting | Tax accounts could change after the VAT cutoff | Inspect actual tenant account flags and VAT mappings inside the write transaction, including manual/draft/reversing entries |
| Operational locks used a source-name allowlist; some legacy writers bypassed monthly/operational checks | New modules, purchase returns, maritime or marketplace journals could bypass closure | One shared automated-posting period guard, with the existing validated fiscal-transition exception |
| General reverse endpoint allowed operational journals | GL could be offset while the invoice, stock and partner balance stayed active | Original manual journals only; operational reversal goes through the document's own lifecycle; the UI uses server eligibility |
| Purchase cancellation lacked reversal links; commercial mirrors omitted cost centers | Incomplete audit trail and incorrect cost-center balances | Lock/check the original, link both directions atomically and preserve all analytical dimensions |
| Deferred receipt used purchase-unit cost as base-unit WAC cost and included inclusive VAT | Cartons inflated inventory cost and recoverable VAT flowed into future COGS | Convert cost to base units and exclude recoverable VAT; value receipt movements and serials consistently |
| Negative/non-finite amounts and journal-line merging were incompletely guarded | Invalid lines could slip through normalization or analytical dimensions could merge | Reject invalid amounts; aggregate only the same cost center and journal side |
| Carrier dispute resolution committed in separate statements and allowed repeat credits | Partial posting, duplicate credits and wrong local value for foreign credit notes | Lock and validate resolution, post and update cost/hold atomically, cap cumulative credits and mirror the original booked rate/dimensions |

## Numerical evidence

The regression file imports the production posting, manual accounting, purchase receipt and maritime services and executes against PGlite PostgreSQL tables.

- Sale subtotal 100, discount 10, VAT 12.60: cash 102.60; revenue 100; discount 10; output VAT 12.60; cost/inventory 60.
- Inclusive credit sale 114 less 11.40: customer receivable 102.60, gross revenue 101.40, discount 11.40 and VAT 12.60.
- Purchase 205.20 inclusive of VAT after discount: inventory 180, input VAT 25.20 and supplier payable 205.20.
- Half sales return: cash refund 51.30, net return 45, VAT reversal 6.30 and cost reversal 30.
- Purchase return 102.60: inventory credit 90, VAT credit 12.60, supplier relief 80 and bank refund 22.60.
- Receipt: existing 12 units at 80 plus a 12-unit carton at 1368 inclusive of 14% VAT produces 24 units at WAC 90, receipt value 1200 and VAT 168. A tax-lock rejection restores stock, receipt quantity and supplier balance.
- Carrier invoice USD 100 booked at EGP 50/USD: USD 20 credit reverses EGP 1000 and reduces carrier cost from 5000 to 4000. Repeating resolution, over-crediting or posting in a locked period is rejected.
- Each persisted test journal balances exactly. Sale/purchase retries do not add another posting. Reversal tests assert both links and retained cost centers; tax tests cover custom mappings, tenant isolation and transaction rollback.

## Validation and limits

Passed validation:

- `npm --prefix backend run test:accounting-commercial` (also rerun with `TS_NODE_TRANSPILE_ONLY=true` after the final transaction-lock adjustment).
- Backend `tsc --noEmit`.
- Frontend `node --max-old-space-size=6144 node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` passed after restoring six missing Capacitor packages at the exact versions already pinned in the lockfile; no dependency declarations or lockfiles changed.
- Fifteen focused critical regression files: financial integrity, ledger hardening, foundation, accounting access, fiscal periods and close, purchase stock, sales-return cost, purchase-return traceability, purchase totals, three-way matching, payment allocation, bank-fee atomicity, van concurrency and performance hot paths.
- Logistics and sectoral guards (`phase8-logistics`, `phase9-sectoral`) passed. All seven purchase idempotency scenarios passed after correcting its stale read stub: it previously always returned an empty array from `execute()`, regardless of persisted reservations. Production idempotency logic was unchanged.
- Six infrastructure regression files covering sales, purchases, returns and partner/general-ledger report helpers.
- `import-postgres-integration.spec.ts`: all eleven PostgreSQL integration groups passed, including financial reporting, FX, landed cost, partial returns, idempotency and locked periods.
- Frontend `qa:contracts` and `qa:api` (58 aligned contracts), plus ESLint on both changed frontend files: zero errors; seven existing warnings about `any` and file length.
- `git diff --check`.

The focused regression files were run with `TS_NODE_TRANSPILE_ONLY=true`; backend source types were checked separately. These fixtures exercise real application methods and PostgreSQL semantics; they do not simulate production connection contention or execute every UI workflow.

No production database was changed and no historical ledger was rewritten. Historical unposted invoices, legacy carrier credits and inventory valuations need a tenant-data reconciliation before corrective journals. This review hardens shared accounting controls and the named commercial flows; it does not certify every sector's statutory tax treatment.

The separate `core-integrity-audit.spec.ts` suite could not complete: its hardcoded disposable PostgreSQL server at `127.0.0.1:5433` was unavailable (`ECONNREFUSED`). It is not counted among passed tests.
