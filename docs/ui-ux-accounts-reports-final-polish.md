# Accounts + Reports Final Polish

## What changed

### Accounts
- Split the large workspace into smaller UI modules:
  - `AccountsOverviewPanel`
  - `AccountsPartyCard`
  - `AccountsLedgerCard`
- Moved ledger export/copy/print helpers into:
  - `src/features/accounts/lib/ledger-actions.ts`
- Kept the same user flows while reducing component density and improving readability.

### Reports
- Extracted report date/range and formatting helpers into:
  - `src/features/reports/lib/reports-format.ts`
- Split the top-level workspace into smaller UI pieces:
  - `ReportsGuidanceStrip`
  - `ReportsRangeCard`
  - `ReportsQuickOverviewCard`
- Split section rendering into dedicated files:
  - `OverviewReportSection`
  - `SalesReportSection`
  - `PurchasesReportSection`
  - `InventoryReportSection`
  - `BalancesReportSection`
  - `TreasuryReportSection`
- Added a shared reports section props/types file:
  - `reports-section.types.ts`

## Outcome
- Accounts is easier to maintain and extend.
- Reports is no longer bottlenecked by one oversized section file.
- UI reading flow is clearer, especially in range control, quick overview, and section-level rendering.

## Validation
- `frontend build` ✅
- `frontend qa:features` ✅
- `frontend qa:composition` ✅
- `npm test` ✅
