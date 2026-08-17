# Batch 17 Changelog

## Scope
Refactor repeated report list parsing/state normalization out of `ReportsService` into a dedicated query helper.

## Added
- `backend/src/modules/reports/helpers/reports-query.helper.ts`
- `backend/test/infra/reports-query.helper.spec.ts`

## Updated
- `backend/src/modules/reports/reports.service.ts`
- `backend/scripts/check-architecture-guardrails.cjs`
- `backend/package.json`

## Outcome
- Centralized repeated parsing of range/search/filter/pagination state.
- Reduced `ReportsService` size and duplication across inventory, partner ledger, treasury, and audit flows.
