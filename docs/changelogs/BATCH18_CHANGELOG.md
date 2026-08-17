# Batch 18 Changelog

## Focus
- Continue reducing `ReportsService` complexity by extracting repeated query-search/filter wiring.
- Lock inventory reporting to the real `stock_locations` table to avoid join regressions.

## Added
- `backend/src/modules/reports/helpers/reports-query-pipeline.helper.ts`
- `backend/test/infra/reports-query-pipeline.helper.spec.ts`

## Updated
- `backend/src/modules/reports/reports.service.ts`
- `backend/scripts/check-architecture-guardrails.cjs`
- `backend/package.json`

## Outcome
- `ReportsService` now delegates repeated partner-ledger / treasury / audit search+amount-filter logic to a shared helper.
- Inventory reporting joins `stock_locations` explicitly instead of the invalid `locations` table alias.
