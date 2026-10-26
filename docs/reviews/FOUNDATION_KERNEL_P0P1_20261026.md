# Foundation Kernel — P0/P1 isolation checkpoint (26 October 2026)

**Repository:** `8489mx/zs`; **branch:** `fix/foundation-kernel-p0p1`. Source forked from integration `0975ecaad5f71c8fd064f90ebb9bc5c3fb503e7c`. Neither production nor `main` was changed.

## Confirmed P1 financial root causes

1. **Inventory variance/book precision:** Inventory adjustments, physical stock count and damaged stock used `toFixed(2)` for movement total cost regardless of KWD/OMR minor-unit scale, while the linked central journal also rounded some amounts to cents. These affected physical-to-GL matching and could erase 0.001 book values. Fix: currency scale is derived from the tenant in each existing transaction; immutable source costs and central accounting `addLine` now use that scale. Food waste shared journal uses the same scale.
2. **Journal aggregation erases one-fil debit/credit:** `AccountingPostingService.addLine` defaulted to two digits even after the source used a three-digit amount; explicit `moneyDigits` arguments now reach all modified inventory-based entry paths. No change to the global two-digit default.
3. **Sale edits and purchase/sale reversals:** Drafts used two-decimal normalization, potentially erasing small KWD/OMR source journal lines. Fix: normalize in authenticated tenant's book precision; pass `bookDigits` through edited-sale `addLine`. Reversal entries still go through the original central immutable journal writer and period locks.

## Real executable evidence

- `backend/test/acceptance/core-accounting.postgres.spec.ts` runs actual source/service writes on disposable PostgreSQL and checks the exact one-fil movement and GL for an adjustment, damage and count; rejects and rolls back a source under a locked accounting period; count retry must not duplicate posting.
- The same suite rehearses KWD one-fil sale edit and sale/purchase journal reversals inside **rollback-only** PostgreSQL transactions, checking both one-fil sides and equality of debit and credit while leaving the original sale/purchase usable by their standard return journeys.
- Existing Core & Accounting acceptance contains purchases, credit sales, sales/purchase returns, treasury payments, PDC, fiscal close and retry/concurrency checks. Those are scoped cases, not exhaustive API/tenant proof.
- Workflow sources: `.github/workflows/ci.yml` (backend/frontend build, typecheck and extended E2E), `.github/workflows/accounting-acceptance.yml` (full fresh migrations, 256 history upgrade in both directions, accounting and priority sectors). GitHub final evidence is required; having tests in the tree alone is not a PASS.

## Explicit release blockers / unknowns

- No rehearsal on a disposable restored representative existing customer database (fresh PostgreSQL and two staged migration histories do **not** prove that).
- P0-A's incomplete deep tenant/permission/SQL tracing across the full controller inventory, and historical backup/restore concurrency and FK validation, remain separate from this targeted kernel check.
- A full shared-kernel authorization-to-GL trace for every payroll/withdrawal, multi-currency conversion, reservation, WAC and sector consumption path is not established. These are **unverified scopes**, not proven new P0/P1 defects. Do not claim all 37 modules are globally certified.
- No production data edits, migrations, deploy, `main` merge or force push.

**Release policy:** `Verified` only for cases actually proven by a green current-SHA PostgreSQL/CI run; broader Core, Accounting and Inventory release sign-off requires the named missing high-risk evidence.

## Follow-up checkpoint — treasury source currency integrity and concurrent transfers (26 October)

**Confirmed P1 root:** A KWD/OMR cash-to-bank transfer silently rounded the requested amount to two decimals while its source column `treasury_transfers.amount` was numeric(...,2). The balance check also allowed an overdraft up to 0.001 due to a fixed float tolerance. Identical requests racing before the first commit could both miss the initial idempotency lookup and the second could hit a database uniqueness violation rather than reuse the posted receipt. Cash expenses had the same two-digit source storage and `postExpense` line-rounding problem.

**Fix committed:** `TreasuryService` uses integer tenant minor units, exact insufficient-funds checks, account-locked recheck of `request_key`, consistent expense/treasury/GL recording and currency-aware expense report; shared `postExpense` preserves money digits; numeric source widening migration **260** retains existing decimals and has a deliberate no-op down. Invalid fractional EGP cents/third-of-fil values are rejected, not silently rounded.

**Regression authored:** Disposable PostgreSQL fixture seeds exact KWD cash GL, persists 0.001 transfer and expense and verifies operational treasury source and accounting accounts; races two 0.004 transfers against 0.005 available balance (one must fail), races two identical keys (one GL source), asserts zero cash after expense, rejects overdraw and out-of-currency precision. Run via the existing mandatory PostgreSQL acceptance workflow.

**Pending evidence:** final SHA Full CI, Typecheck, Build, fresh migrations and dual-history upgrade run results. This checkpoint does not close historic-customer snapshot migration, all employee payroll cycles or full tenant/authorization tracing.


## Follow-up PostgreSQL reservation kernel proof (26 October)

Regression added to `core-accounting.postgres.spec.ts` for real concurrent `reserveLocationStock` requests on one three-unit product: simultaneous two-unit reservations must yield exactly one success, leaving global/location reservation at two. An ordinary sale may consume only unreserved stock; a failed oversale cannot move stock, cash or GL. Incremental release and a second sale preserve global/location quantity and WAC inventory-to-GL reconciliation. This is actual PostgreSQL row-lock and atomicity evidence, **not** an exhaustive reservation test for every online/offline sector and location-transfer path. Green final-SHA acceptance still required.
