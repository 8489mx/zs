# ARCH02 — AntiGravity validation handoff

Repository: `8489mx/zs`. Branch: `WORK` (uppercase). Start from its latest commit. Do not start ARCH03.

## Outcome so far

**ARCH02 is NOT fully accepted.** The owner authorized validation, then asked to delegate lengthy checks to AntiGravity to reduce time/token cost. Only the short checks below were completed.

- Node used: **22.23.3**, matching the repository's Node 22 requirement.
- `backend: npm run test:arch02`: **PASS**, exit 0. Repeated after the corrective changes with runtime transpilation only; full backend typechecking was separate.
- `backend: npm run typecheck`: **PASS**, exit 0, after correcting the issues listed below.
- `frontend: npm run typecheck`: **BLOCKED/FAILED**. The first attempt exhausted Node's default heap. Retrying with `NODE_OPTIONS=--max-old-space-size=6144` reached missing installed packages: `@capacitor/core`, `app`, `status-bar`, `splash-screen`, `network`, `haptics`, plus three consequent implicit-any errors in `src/shared/native/mobile-bridge.ts` (lines 50, 135, 140). These packages are declared in `frontend/package.json`; do not replace their types with fake declarations or change unrelated mobile code to hide missing dependencies. Restore dependencies from the lockfile, then rerun.
- `git diff --check`: **PASS**.
- Backend/frontend builds, full critical/infra suites, real-service accounting integration, concurrency, HTTP/Electron/LAN journeys and migration data reconciliation: **NOT completed**.

A disposable PostgreSQL 16 container was created and became ready. The migration runner could not connect from the execution sandbox (`connect EPERM 127.0.0.1:55432`), before any migration was executed. This is not evidence that migration SQL passed or failed. The test container was removed. No existing or production database was accessed.

## Corrective changes produced by the short checks

1. `AccountingPostingService.postDomainJournal` now accepts optional line branch/location dimensions at its domain boundary and explicitly normalizes them before the strictly typed central writer. Missing dimensions inherit the header; explicit `null` stays `null`.
2. Added the actual `contracting_retention_records` schema to `database.types.ts` instead of suppressing the IPC insert errors with `any`.
3. Sales cost refresh checks `Array.isArray(item.modifiers)` before reducing modifier costs, preserving valid modifier totals.

These corrections are included with this handoff. The earlier implementation register is `ARCH02_FIX_STATUS_2026-10-24.md`; its 37-row matrix identifies the production paths to validate. An engine test passing does not prove those callers feed it correct data.

## Instructions for AntiGravity

- Use Node 22 and the repository's required npm version. Install backend/frontend dependencies with the checked-in lockfiles in an isolated checkout.
- Keep `infoadmin` and its acceptance path unchanged. Preserve `zs` privileges, tenant isolation, immutable posted entries and reciprocal links for exact reversals.
- No production data, deploy, main merge, or automatic historical repair. Work on `WORK`; document failures and fixes. Do not claim approval merely from a successful compiler.
- Do not alter financial expectations to make tests pass. Execute real production services against a fresh disposable PostgreSQL database, with explicit local connection settings. Never let dotenv choose an existing database implicitly.

### Validation sequence

1. Rerun both Typechecks; build backend and the cloud, Electron frontend and portable frontend variants. Apply the normal architecture/performance checks relevant to changed paths.
2. Run `npm run test:arch02`, existing accounting/fiscal/return/landed-cost/WHT/FX tests and auth/tenant guards; then the full appropriate critical/infra suites. Treat old tests that duplicate accounting formulas as supplementary, not proof of service correctness.
3. Apply all production migrations to a fresh PostgreSQL database. Also test upgrading a database at migration 251 containing fixtures to migration 252. Snapshot financial row counts, amounts, relationships and unit costs per tenant before/after. Prove no historical values change and test the deliberate legacy-duplicate/base-currency failure and rollback protections.
4. Exercise complete business-to-ledger-to-report journeys, not only pure engines. Use actual production entry points and transactions. Include two tenants and branch/location dimensions.
5. Run simultaneous requests on separate PostgreSQL connections: same settlement/request key, same IPC, WHT extraction, PDC transitions, journal posting against month/year lock, and forced exceptions after domain writes. Verify exactly one durable event, consistent subledgers, and zero partial commits.
6. Exercise HTTP/login `zs` and ordinary tenants, SaaS and self-contained modes, LAN reconnect/retry, and Electron pending-payment persistence. Distinguish a frontend build from testing the actual Electron application.

### Minimum numerical service cases

- Stock: 10 units at 10 plus 10 units costing 200 gives WAC 15. Returning 2 units at original cost 10 into 8 units at 20 gives WAC 18, including split warehouse allocations. Selling 2 at WAC 18 posts COGS 36. Include multi-unit and modifier cost cases.
- Purchase return: current stock cost 15, supplier refund net 10: Dr AP 10 + Dr price variance 5 / Cr inventory 15, with actual allocated VAT separately.
- Manufacturing: materials 20 + overhead 3 + machine operations 5 = total 28. Dr produced inventory 28 / Cr material inventory 20 + Cr conversion costs 8. Validate by-products, correct before-receipt WAC and actual completion date.
- Courier: invoice 120, courier fee 20, cash handed over 100: Dr cash 100 + Dr courier expense 20 / Cr AR 120. Electronic field collection 100 debits bank, without adding representative cash custody.
- FX cheque: nominal USD 100, book rate 50 gives base 5,000; collection at rate 51 gives bank 5,100 and realized gain 100. Repeat deposit/bounce/restore cycles, including retained bank fees, terminal-action rejection, chosen action date and foreign-tenant partner/bank rejection.
- Marketplace: gross 1,000, fees 100, refunds 50, net bank 850. Same settlement key returns the original journal; changed financial payload is rejected. Closed periods roll back the entire settlement.
- Financing: principal 100, two monthly payments of 60, total interest 20. Initial credit is unearned income, then earned allocations 13.07 and 6.93 on the correct dates/branch; repeated accrual does not post twice.
- Reports: microsecond postings on December 31 are included; inactive P&L accounts close; closing/reopening do not inflate operating profit; historical aging ignores later receipts; non-cash transactions and PDC custody do not become cash flow; ambiguous flows remain visibly unclassified; manual reversal preserves its cash-flow category.

## Acceptance decision

Return a clear PASS / conditional acceptance / FAIL with command exit codes, numerical evidence, migration reconciliation results, environment coverage and remaining limitations. Keep partner-level FX control revaluation, foreign marketplace conversion and ambiguous legacy evidence visibly restricted until their documented prerequisites are met. Historical tenant data correction requires a separately reviewed/authorized adjustment plan even if fresh-data tests pass.
