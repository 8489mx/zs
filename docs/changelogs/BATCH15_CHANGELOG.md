# Batch 15 Changelog

## Scope
- Extract treasury and audit payload shaping from `ReportsService` into a dedicated helper.
- Reduce service size and duplication in operational reporting paths.
- Preserve pagination/search behavior while improving maintainability.
- Fix treasury branch/location alias selection to avoid query/type mismatches.

## Added
- `backend/src/modules/reports/helpers/reports-ops.helper.ts`
- `backend/test/infra/reports-ops.helper.spec.ts`

## Updated
- `backend/src/modules/reports/reports.service.ts`
- `backend/scripts/check-architecture-guardrails.cjs`
- `backend/package.json`

## Outcome
- `ReportsService` reduced further in size.
- Treasury/audit payload shaping is now centralized and testable.
- Guardrails now enforce ops helper usage.
