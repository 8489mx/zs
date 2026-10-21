# Independent import-finance integrity review — HANDOFF (2026-10-21)

**Source branch**: `feat/import-operations-integrity-audit` at `0ccf19bb405616f6ed44b3651602212865a37a53`

**Review branch**: `fix/import-financial-integrity-independent-audit`

**Deployment status**: NOT MERGED; NOT DEPLOYED. This patchset is not a 100%-complete or production-certified import ERP.

## Changes implemented

1. Restrict GL account resolution by tenant, account type and `is_cash_bank`/`is_inventory`/`is_payable` role flags. Remove "first active account of matching account_type" fallback; require genuine bank settings or a permitted bank code.
2. Enforce a nonempty 128-character-max idempotency key on foreign transfers. The supplier transfer UI generates a stable key for retry of the same form payload. The server's existing unique index remains the concurrency guard.
3. Include `import_late_expense` and `import_partner_capital` in accounting's operational period-lock guard.
4. Partner capital contributions and withdrawals now use signed treasury movements of type `partner_capital_deposit`/`partner_capital_withdrawal`, a tenant-scoped equity account `3100`, and the central accounting posting engine in the SAME transaction. Withdrawal locks the partner.
5. Supplier payment amount and shared supplier ledger amounts are base-currency EGP; original foreign units now go to nullable `supplier_payments.amount_foreign` (migration 236). The treasury transaction uses the selected GL bank account's tenant account scope, NOT its numeric GL key.
6. Flag import project quantity-capped gross profit as **provisional** (unverified source attribution). Until a real sale-item-to-shipment receipt lineage exists, cash profit payouts fail closed and project closure involving sales is blocked. The UI warns explicitly.
7. Guard partner deletion against ON DELETE CASCADE of capital history/project memberships; serialize global partner-percentage writes; prevent changes to project partner percentages after a paid Proforma or posted receipt. These controls are conservative pending effective-dated participation.
8. Realized FX gain/loss GL account resolution only happens if there is a nonzero variance.

## Existing implementation limitations — NOT fixed by this patchset

**P0 / accounting data lineage**
- No universal source/batch allocation from POS, wholesale sales, sales returns, stock transfers and write-offs to received import shipment lines. A quantity-cap estimate does not establish project-specific net profit or partner distributable earnings. Hence profit payouts remain disabled.
- Late shipment expense still estimates source-owned inventory from generic product-level `product_location_stock.qty`. This can misallocate costs across shipments; there is no dedicated unique, document-backed late-expense idempotency guarantee. DO NOT use it to financially true-up mixed or partially sold SKUs until provenance is implemented.
- A Proforma is not itself an accounting trade payable. Invoice recognition, multi-currency AP subledgers, prepayment classification and realized-FX historical book rates need an end-to-end ledger model. The move to base-currency EGP prevents foreign-unit mixing but does not solve the entire international purchasing lifecycle.

**P1 / accounting controls and historical data**
- Historical supplier-payment rows with NULL `amount_foreign` are NOT backfilled from ambiguous currencies; reconcile from bank statements/Proformas manually with an approved migration.
- Project partner fractions are not versioned by effective date; changes are frozen after execution begins rather than silently rewriting prior earnings.
- Existing partner deposit/withdrawal records have no retroactive GL journal created by this patch. Reconcile historic capital flows separately; do not generate unexplained adjusting entries.
- Command-center capital and foreign-debt metrics are not an authoritative multi-currency liquidity reconciliation.
- The frontend account selector assumes accounting API `flags.isCashBank`; verify actual response shape across all supported account configurations.

**Testing and validation**
- `backend/test/critical/import-postgres-integration.spec.ts` has added regression scenarios for account-role selection, mandatory transfer keys, period locks, base-currency supplier ledger, equity capital postings, historic partner deletion, and provisional profit payout safeguards.
- This fixture still manually assembles most DDL; it executes only migration 234/235/236. It is NOT equivalent to booting the entire production migration history.
- The current GitHub connection can read/write repository objects but does not expose a full local clone or test runtime for this private repository. **Tests/typechecking were not executed by the independent reviewer**; reviewers must run `npm --prefix backend run test:import-safety`, `tsc`/build, complete migration integration, and frontend checks on a private PostgreSQL test database.
- No CI run was visible at the last check. Do not treat the presence of tests as proof they passed.

## Review instructions for Antigravity

1. Diff this draft PR against the source feature branch, without merging.
2. Run full backend and frontend builds and actual PostgreSQL migration chain before making readiness claims.
3. Audit accounting postings, tenant and account scope (including the new capital equity journal) and verify treasury report compatibility with `partner_capital_*` transaction types.
4. Verify date locks, role-flag availability, cross-tenant access, concurrency/retry semantics, replay across browser reloads, and audit controls.
5. Perform historical supplier/AP/FX and capital reconciliation against a clone of anonymized production data.
6. Implement sale-to-import-source stock lineage and versioned partner ownership on a separate integration plan before enabling partner payouts.
7. Treat ANY failure as a blocker; never auto-merge, deploy or silently modify financial history.
