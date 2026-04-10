# Batch 13 Changelog

## Scope
Refactor partner ledger and balances shaping out of `ReportsService` into a dedicated helper.

## Added
- `backend/src/modules/reports/helpers/reports-ledger.helper.ts`
- `backend/test/infra/reports-ledger.helper.spec.ts`

## Updated
- `backend/src/modules/reports/reports.service.ts`
- `backend/scripts/check-architecture-guardrails.cjs`
- `backend/package.json`

## Impact
- Reduces repeated customer/supplier balance and ledger payload shaping inside `ReportsService`.
- Adds dedicated guardrails for the new ledger helper.
- Extends `test:infra` coverage with a direct helper spec.
