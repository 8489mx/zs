# Independent financial safeguards review — Import ERP (2026-10-21)

## Scope and provenance

Base: `feat/import-erp-unified-integration` at `84475752587f29092b42a5b7cd119bb53efdf064`.
Work branch: `fix/import-finance-final-safeguards-review`.
**Not merged, not deployed, not certified for production.**

## Implemented in this branch

- Approval requests for partner distributions must specify an exact partner, import project and approved positive amount. Approval consumption verifies those attributes and is atomic and single-use. Project closure now requires an approved and independently authorized token in the API and service; unscoped approvals are rejected.
- The operational accounting period lock covers partner distributions, freight-container refunds, broker advance / liquidation, container deposits and pre-order advances.
- Added migration `2040000000241_import_financial_source_documents_and_warehouse_receipts.ts` with immutable numeric source records for late expenses and partial container refunds, explicit idempotency keys and receipt warehouse column. No old financial data are rewritten.
- Each late landed-cost adjustment now has a durable numeric accounting source regardless of its COGS/inventory split. Replays of the same idempotency key do not modify cost a second time.
- Each partial container refund gets its own source document, GL journal and treasury cash movement. Cumulative deposits still use row locking; replays of the same request are handled without new cash/journals.
- Cashbook movements accompany the existing journal postings of original container security deposits, customs broker cash advances and pre-order customer advances, in the same DB transaction.
- Refuse clearing a broker advance beyond its original balance and refuse cancellation of a paid pre-order without a documented refund/liability release workflow.
- New import receipts must specify a real, tenant-compatible warehouse. The stock ledger, movement and lot record all use that warehouse. Stock posting disables automatic draining of pre-existing unassigned balance; unknown-location lots are never silently allocated to a named warehouse.
- Profit reporting and project closure are conservatively blocked from being marked verified if legacy lots have no verified location or shared product sales might be unattributed.

## Important review and verification gates

1. **Full backend and frontend builds, TypeScript typechecking and tests have NOT been independently run by ChatGPT.** The remote GitHub connector allows source editing and Commit/Push, but not a local checkout/test runtime. Reviewers MUST execute the commands on a clean local clone before even considering merge.
2. The `import-postgres-integration.spec.ts` and 30-step simulation use PGlite and manually assembled DDL for much of the legacy schema. Import migrations 233–241 are invoked within a synthetic fixture. This is **not a complete production migration replay**. Run a separate isolated PostgreSQL migration-from-zero and upgrade-from-copy validation, including number 241. Check for schema conflicts, FK behavior and numeric precision.
3. Explicit warehouse receipts are a behavior change: users must select `receiptLocationId` when marking a container Arrived. Existing NULL-location lots are **intentionally not auto-backfilled** and require physical location reconciliation supervised by operations/accounting.
4. Full sell/return/transfer/stock-count/write-off lot provenance is not yet independently verified across all production flows. The 30-step simulation still writes sales/returns manually before calling the lot helper; it does not prove genuine UI→service→GL→stock E2E.
5. The new cashbook records supplement journal postings. Before migration, reconcile historic broker and container deposit cashbook transactions independently; NEVER silently backfill or double-post actual funds. Verify dashboard treasury aggregation accepts new transaction types.
6. Paid preorder cancellation now fails closed. Design and test an explicit customer refund/credit-transfer lifecycle before allowing cancellation of paid reservations.
7. Project-specific profit attributable to shared SKU sales still depends on reliable physical-source allocations and company WAC reconciliation. Period profit is not the same as cash/distributable profit. Require accountant-led reconciliation and ledger/source trace before activating distributions for real funds.
8. Validate source-specific operational dates, closed periods, maker-checker payload immutability, tenant/branch access, multi-location transfers and concurrent retries.
9. Verify `stock_locations` API response includes `locationType` and `isActive`; import receipt screen must filter unsupported destination types. Test all tenants/accounts and legacy serialized settings.
10. Final deployment and merging into `main` require explicit user approval. No production DB modification or deployment is authorized by this branch.

## Commands for Antigravity reviewer

```bash
git fetch origin
git switch fix/import-finance-final-safeguards-review
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix frontend run typecheck
npm --prefix frontend run build
npm --prefix backend run test:import-safety
```

Run independent PostgreSQL migration tests in a disposable local or staging database, NOT production. Review the draft PR diff and report failures with reproductions and corrected commits. Do not merge or deploy.
